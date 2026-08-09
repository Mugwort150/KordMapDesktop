'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapSettings, Floor } from '@/app/page';
import { createMarker, updateMarker, deleteMarker, uploadImage } from '@/app/actions/markers';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const NATIVE_SIZE = 8192;
const bounds: L.LatLngBoundsExpression = [[-NATIVE_SIZE, 0], [0, NATIVE_SIZE]];

/**
 * Compresses and resizes an uploaded image to WebP format.
 * Returns a base64 string which is later uploaded to Vercel Blob.
 */
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        const MAX_WIDTH = width > height ? 1920 : 1080;
        const MAX_HEIGHT = width > height ? 1080 : 1920;
        
        if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
        if (height > MAX_HEIGHT) { width = Math.round((width * MAX_HEIGHT) / height); height = MAX_HEIGHT; }
        
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/webp', quality);
        while (dataUrl.length > 1000000 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/webp', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
  });
};

/**
 * Fetches, parses, and renders the raw SVG map.
 * Handles dynamic layer extraction and CSS-based floor transitions.
 */
function LayeredSvgOverlay({ url, hardwareAcceleration, currentFloorId, onFloorsLoaded, setAllFloors }: any) {
  const map = useMap();
  const svgRef = useRef<SVGElement | null>(null);
  const floorsRef = useRef<Floor[]>([]);

  useEffect(() => {
    let isMounted = true;
    let svgLayer: L.SVGOverlay | null = null;
    fetch(url).then((res) => res.text()).then((svgText) => {
        if (!isMounted) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = doc.documentElement as unknown as SVGElement;
        if (!svgElement.getAttribute("viewBox")) svgElement.setAttribute("viewBox", `0 0 8192 8192`);
        svgElement.setAttribute("shape-rendering", "optimizeSpeed");
        svgElement.style.pointerEvents = 'none';
        
        let groups = Array.from(svgElement.children).filter(el => el.tagName.toLowerCase() === 'g');
        if (groups.length === 1) {
          const innerGroups = Array.from(groups[0].children).filter(el => el.tagName.toLowerCase() === 'g');
          if (innerGroups.length > 0) groups = innerGroups;
        }

        const extractedFloors: Floor[] = groups.map((g, index) => {
          const rawId = g.getAttribute('id') || `Layer_${index}`;
          const name = rawId.replace(/_x20_/g, ' ').replace(/_/g, ' ');
          return { id: rawId, name };
        });

        floorsRef.current = extractedFloors;
        svgRef.current = svgElement;
        setAllFloors(extractedFloors); 

        svgLayer = L.svgOverlay(svgElement, bounds, { interactive: false });
        svgLayer.addTo(map);

        const uiFloors = extractedFloors.filter(f => f.name.toLowerCase().trim() !== 'ground level');
        onFloorsLoaded(uiFloors);
      });
    return () => { isMounted = false; if (svgLayer) map.removeLayer(svgLayer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, url]);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.willChange = hardwareAcceleration ? 'transform' : 'auto';
  }, [hardwareAcceleration]);

  useEffect(() => {
    if (!svgRef.current || !currentFloorId || floorsRef.current.length === 0) return;
    const floors = floorsRef.current;
    const currentIndex = floors.findIndex(f => f.id === currentFloorId);
    if (currentIndex === -1) return;

    const isFirstFloorSelected = floors[currentIndex].name.toLowerCase().includes('first floor');

    floors.forEach((floor, index) => {
      const gNode = svgRef.current!.querySelector(`g[id="${CSS.escape(floor.id)}"]`) as SVGGElement;
      if (!gNode) return;
      
      gNode.style.display = 'block'; 
      gNode.style.transition = 'opacity 0.4s ease-in-out, filter 0.4s ease-in-out, visibility 0.4s ease-in-out';

      if (floor.name.toLowerCase().trim() === 'ground level' && isFirstFloorSelected) {
        gNode.style.visibility = 'visible'; gNode.style.opacity = '1'; gNode.style.filter = 'none'; return; 
      }
      
      if (index > currentIndex) { 
        gNode.style.visibility = 'hidden'; gNode.style.opacity = '0'; gNode.style.filter = 'none';
      } else if (index === currentIndex) { 
        gNode.style.visibility = 'visible'; gNode.style.opacity = '1'; gNode.style.filter = 'none'; 
      } else if (index < currentIndex) { 
        gNode.style.visibility = 'visible'; gNode.style.opacity = '0.35'; gNode.style.filter = 'brightness(0.25) grayscale(0.6)'; 
      }
    });
  }, [currentFloorId]);
  return null;
}

/**
 * Applies user configuration settings directly to the Leaflet map instance.
 */
function MapSettingsController({ settings }: { settings: MapSettings }) {
  const map = useMap();
  useEffect(() => {
    map.options.zoomDelta = settings.zoomStep;
    map.options.zoomSnap = settings.zoomStep;
    map.options.wheelPxPerZoomLevel = 60 / settings.zoomStep;
  }, [map, settings.zoomStep]);
  return null;
}

/**
 * Smoothly pans and zooms the map to a specific coordinate.
 */
function FlyToController({ flyToMarker, setFlyToMarker }: any) {
  const map = useMap();
  useEffect(() => {
    if (flyToMarker) {
      map.flyTo([flyToMarker.lat, flyToMarker.lng], 1, { duration: 0.5 });
      setFlyToMarker(null);
    }
  }, [flyToMarker, map, setFlyToMarker]);
  return null;
}

interface MapProps { 
  mapName: string; mapUrl: string; mode: 'view' | 'edit'; settings: MapSettings; 
  currentFloorId: string | null; setCurrentFloorId: (id: string) => void; 
  onFloorsLoaded: (floors: Floor[]) => void; editorPassword?: string;
  markers: any[]; setMarkers: any; markerTypes: Record<string, string[]>; activeFilters: string[];
  flyToMarker: any; setFlyToMarker: any; addLocalPendingId: (id: string) => void;
}

export default function Map({ 
  mapName, mapUrl, mode, settings, currentFloorId, setCurrentFloorId, onFloorsLoaded, editorPassword,
  markers, setMarkers, markerTypes, activeFilters, flyToMarker, setFlyToMarker, addLocalPendingId
}: MapProps) {
  
  const [allFloors, setAllFloors] = useState<Floor[]>([]);
  const [pendingMarker, setPendingMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [isRelocating, setIsRelocating] = useState(false);
  
  const [formData, setFormData] = useState({ title: '', description: '', type: '', imageUrl: '', submitter: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  useEffect(() => { if (mode === 'view') handleCloseModal(); }, [mode]);

  const handleCloseModal = () => {
    setPendingMarker(null); setEditingMarkerId(null); setIsRelocating(false);
    setFormData({ title: '', description: '', type: '', imageUrl: '', submitter: '' });
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (mode !== 'edit' || !currentFloorId) return;
        setPendingMarker({ lat: e.latlng.lat, lng: e.latlng.lng });
        setIsRelocating(false);
      },
    });
    return null;
  };

  const handleEditClick = (marker: any) => {
    setEditingMarkerId(marker.id);
    setPendingMarker({ lat: marker.lat, lng: marker.lng });
    setFormData({ title: marker.title, description: marker.description || '', type: marker.type, imageUrl: marker.imageUrl || '', submitter: marker.submitter || '' });
  };

  const handleDeleteClick = async (id: string) => {
    if (!editorPassword) return alert("Only editors can delete markers.");
    if (!confirm("Are you sure you want to delete this marker?")) return;
    const res = await deleteMarker(id, editorPassword);
    if (res.success) setMarkers((prev: any[]) => prev.filter(m => m.id !== id));
  };

  const handleSaveMarker = async () => {
    if (!pendingMarker || !currentFloorId || !formData.title.trim() || !formData.type) return;
    setIsSubmitting(true);
    
    let finalImageUrl = formData.imageUrl;

    // Upload to Vercel Blob if the image is a local Base64 string
    if (finalImageUrl.startsWith('data:image')) {
      setIsProcessingImage(true);
      const uploadedUrl = await uploadImage(finalImageUrl);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        alert("Failed to upload image to Vercel Blob. Ensure Storage is configured.");
        setIsSubmitting(false);
        setIsProcessingImage(false);
        return;
      }
      setIsProcessingImage(false);
    }

    const payload = {
      title: formData.title, description: formData.description, type: formData.type, 
      imageUrl: finalImageUrl, submitter: formData.submitter,
      lat: pendingMarker.lat, lng: pendingMarker.lng, floorId: currentFloorId, mapName: mapName,
    };

    let result: any;
    if (editingMarkerId) {
      result = await updateMarker(editingMarkerId, payload, editorPassword);
      if (result.success && result.marker) {
        if (result.autoApproved) {
          setMarkers((prev: any[]) => prev.map(m => m.id === editingMarkerId ? result.marker : m));
        } else {
          addLocalPendingId(result.marker.id);
          setMarkers((prev: any[]) => [result.marker, ...prev]); 
        }
      }
    } else {
      result = await createMarker(payload, editorPassword);
      if (result.success && result.marker) {
        if (result.autoApproved) {
          setMarkers((prev: any[]) => [result.marker, ...prev]);
        } else {
          addLocalPendingId(result.marker.id);
          setMarkers((prev: any[]) => [result.marker, ...prev]);
        }
      }
    }
    
    setIsSubmitting(false);
    if (result?.success) {
      setSubmitSuccess(true);
      setTimeout(() => { setSubmitSuccess(false); handleCloseModal(); }, 1000);
    } else {
      alert("Error saving marker.");
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setIsProcessingImage(true);
      const compressedWebP = await compressImage(file);
      setFormData({ ...formData, imageUrl: compressedWebP });
      setIsProcessingImage(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsProcessingImage(true);
      const compressedWebP = await compressImage(file);
      setFormData({ ...formData, imageUrl: compressedWebP });
      setIsProcessingImage(false);
    }
  };

  /**
   * Generates a custom Leaflet divIcon.
   * If the marker belongs to a different floor, it applies a ghosting effect and directional arrow.
   */
  const getCustomIcon = (typeId: string, isGhost: boolean, direction: 'up' | 'down' | null) => {
    const scale = settings.iconScale || 1;
    const size = 32 * scale;
    let ghostStyles = ''; let arrowHtml = '';
    if (isGhost) {
      ghostStyles = `opacity: 0.3; filter: grayscale(0.5);`; 
      const arrowColor = direction === 'up' ? '#22c55e' : '#ef4444';
      const arrowChar = direction === 'up' ? '▲' : '▼';
      arrowHtml = `<div style="position: absolute; top: -${4 * scale}px; right: -${4 * scale}px; width: ${14 * scale}px; height: ${14 * scale}px; background: rgba(0,0,0,0.8); border-radius: 50%; border: 1px solid #444; color: ${arrowColor}; display: flex; align-items: center; justify-content: center; z-index: 10; font-size: ${9 * scale}px; font-weight: bold; line-height: 1;">${arrowChar}</div>`;
    }
    return L.divIcon({
      html: `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; ${ghostStyles}"><img src="/icons/${typeId}.png" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));" />${arrowHtml}</div>`,
      className: 'bg-transparent border-none', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -(size / 2)],
    });
  };

  const pendingEdits = markers.filter(m => !m.approved && m.originalId);
  const hiddenOriginalIds = new Set(pendingEdits.map(m => m.originalId));
  const visibleMarkers = markers.filter(m => !hiddenOriginalIds.has(m.id));

  return (
    <div className="relative w-full h-full">
      <MapContainer crs={L.CRS.Simple} bounds={bounds} maxZoom={3} minZoom={-5} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#121212' }}>
        <MapSettingsController settings={settings} />
        <FlyToController flyToMarker={flyToMarker} setFlyToMarker={setFlyToMarker} />
        <LayeredSvgOverlay url={mapUrl} hardwareAcceleration={settings.hardwareAcceleration} currentFloorId={currentFloorId} onFloorsLoaded={onFloorsLoaded} setAllFloors={setAllFloors} />
        <MapClickHandler />

        {visibleMarkers
          .filter((marker) => activeFilters.includes(marker.type))
          .filter((marker) => marker.id !== editingMarkerId)
          .map((marker) => {
            const currentIndex = allFloors.findIndex(f => f.id === currentFloorId);
            const markerIndex = allFloors.findIndex(f => f.id === marker.floorId);
            const isGhost = currentIndex !== -1 && markerIndex !== -1 && currentIndex !== markerIndex;
            let direction: 'up' | 'down' | null = null;
            if (isGhost) direction = markerIndex > currentIndex ? 'up' : 'down';

            return (
              <Marker 
                key={`${marker.id}-scale-${settings.iconScale}`} 
                position={[marker.lat, marker.lng]} 
                icon={getCustomIcon(marker.type, isGhost, direction)}
                zIndexOffset={isGhost ? -1000 : 0}
                eventHandlers={isGhost ? { click: () => setCurrentFloorId(marker.floorId) } : undefined}
              >
                {!isGhost && (
                  <Popup>
                    <div className="flex flex-col w-full bg-[#161616] text-white select-none">
                      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img src={`/icons/${marker.type}.png`} alt="icon" className="w-5 h-5 object-contain" />
                          <h3 className="font-bold text-[13px] uppercase tracking-wider text-[#e68c3a] flex items-center gap-2">
                            {marker.type.replace(/-/g, ' ')}
                            {!marker.approved && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-600 text-white font-bold tracking-wider">PENDING APPROVAL</span>
                            )}
                          </h3>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        <p className="text-sm text-gray-200 leading-snug">
                          {marker.title}
                          {marker.description && <span className="block mt-1 text-gray-400">{marker.description}</span>}
                        </p>
                        <div className="flex flex-col gap-1 border-t border-[#333] pt-2 mt-1">
                           {marker.submitter && <p className="text-[10px] text-gray-400 font-medium">By: {marker.submitter}</p>}
                           <p className="text-[10px] text-gray-600 font-medium">{new Date(marker.createdAt).toLocaleDateString()}</p>
                        </div>
                        {marker.imageUrl && (
                          <div className="w-full h-32 bg-[#0a0a0a] border border-[#333] rounded overflow-hidden flex items-center justify-center mt-1 cursor-zoom-in" onClick={() => setEnlargedImage(marker.imageUrl)}>
                            {/* Native lazy loading ensures images only consume bandwidth when the popup is opened */}
                            <img src={marker.imageUrl} loading="lazy" alt="Location" className="w-full h-full object-cover transition-transform hover:scale-105" />
                          </div>
                        )}
                        {mode === 'edit' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditClick(marker); }} className="flex-1 bg-[#222] border border-[#333] hover:bg-[#333] py-2 rounded text-[11px] font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors">Edit</button>
                            {editorPassword && (
                              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteClick(marker.id); }} className="flex-1 bg-[#7a2c2c] hover:bg-[#8f3636] py-2 rounded text-[11px] font-bold uppercase tracking-wider text-white transition-colors">Delete</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                )}
              </Marker>
            );
        })}
        {pendingMarker && <Marker position={[pendingMarker.lat, pendingMarker.lng]} zIndexOffset={2000} />}
      </MapContainer>

      {(pendingMarker && isRelocating) && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] bg-blue-600 px-6 py-3 rounded-full shadow-2xl text-white font-bold animate-pulse pointer-events-none">
          Click anywhere on the map to set new location
        </div>
      )}

      {(pendingMarker && !isRelocating) && (
        <div 
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-[#1a1a1a] p-5 rounded-lg border border-[#333] shadow-2xl w-80 text-white transition-all overflow-visible"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-50 pointer-events-none">
              <span className="font-bold text-blue-400 text-lg">Drop image to add</span>
            </div>
          )}

          {submitSuccess ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-green-400">Success!</h3>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{editingMarkerId ? 'Edit Marker' : 'Place New Marker'}</h3>
                {editingMarkerId && (
                  <button onClick={() => setIsRelocating(true)} className="text-xs bg-[#222] border border-[#444] hover:bg-[#333] px-2 py-1 rounded">Move Marker</button>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-xs text-gray-400 uppercase font-bold">Category / Type</label>
                  <div className="w-full bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm mt-1 cursor-pointer flex items-center gap-2" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                    {formData.type ? (
                      <>
                        <img src={`/icons/${formData.type}.png`} alt="icon" className="w-5 h-5 object-contain" />
                        <span className="capitalize">{formData.type.replace(/-/g, ' ')}</span>
                      </>
                    ) : <span className="text-gray-500">Select marker type...</span>}
                  </div>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-[#2a2a2a] border border-[#444] rounded shadow-xl max-h-48 overflow-y-auto z-[2010]">
                      {Object.entries(markerTypes).map(([category, types]) => (
                        <div key={category}>
                          <div className="px-2 py-1 text-xs font-bold text-gray-500 bg-[#222]">{category}</div>
                          {types.map(type => {
                            const typeId = type.toLowerCase().replace(/\s+/g, '-');
                            return (
                              <div key={typeId} className="flex items-center gap-2 p-2 hover:bg-[#333] cursor-pointer text-sm" onClick={() => { setFormData({...formData, type: typeId}); setIsDropdownOpen(false); }}>
                                <img src={`/icons/${typeId}.png`} alt={type} className="w-5 h-5 object-contain" />
                                <span>{type}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Location</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm mt-1 outline-none focus:border-[#e68c3a]" placeholder="e.g. Castle barracks" />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Submitter Name (Optional)</label>
                  <input type="text" value={formData.submitter} onChange={(e) => setFormData({...formData, submitter: e.target.value})} className="w-full bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm mt-1 outline-none focus:border-[#e68c3a]" placeholder="Your name..." />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold flex justify-between">
                    <span>Image</span>
                    <span className="text-gray-600 font-normal">URL, Drop, or Select</span>
                  </label>
                  <div className="flex gap-2 mt-1">
                    <input type="text" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} className="flex-1 bg-[#2a2a2a] border border-[#444] rounded p-2 text-sm outline-none focus:border-[#e68c3a]" placeholder="https://..." />
                    <input type="file" id="file-upload" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <label htmlFor="file-upload" className="bg-[#333] hover:bg-[#444] border border-[#444] px-3 rounded flex items-center justify-center cursor-pointer text-xs font-bold transition-colors">FILE</label>
                  </div>
                  {isProcessingImage ? (
                     <div className="mt-2 text-[10px] text-blue-400 font-bold text-right animate-pulse">Processing...</div>
                  ) : formData.imageUrl && formData.imageUrl.startsWith('data:image') ? (
                     <div className="mt-2 text-[10px] text-green-500 font-bold text-right">✓ Image Attached</div>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button onClick={handleCloseModal} className="flex-1 bg-[#333] hover:bg-[#444] py-2 rounded text-sm transition-colors">Cancel</button>
                <button 
                  onClick={handleSaveMarker} disabled={isSubmitting || isProcessingImage || !formData.title.trim() || !formData.type}
                  className="flex-1 bg-[#e68c3a] hover:bg-[#cf7d34] disabled:opacity-50 disabled:cursor-not-allowed py-2 rounded text-sm transition-colors font-medium shadow text-black"
                >
                  {isSubmitting ? 'Saving...' : (editorPassword ? 'Publish' : 'Submit')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {enlargedImage && (
        <div className="fixed inset-0 z-[4000] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out backdrop-blur-sm" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} className="max-w-full max-h-full object-contain rounded shadow-2xl" alt="Enlarged Location" />
        </div>
      )}
    </div>
  );
}