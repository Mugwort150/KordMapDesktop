'use client';

import { useState } from 'react';
import { MapContainer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapSettings, Floor } from '@/app/page';
import { deleteMarker, suggestDeleteMarker } from '@/app/actions/markers';

// Subcomponents
import SvgMapLayer from './map/SvgMapLayer';
import { MapSettingsController, MapCustomControls } from './map/MapControls';
import { FlyToController, MapClickHandler } from './map/MapEvents';
import MarkerList from './map/MarkerList';
import MarkerEditor from './modals/MarkerEditor';
import Lightbox from './modals/Lightbox';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const NATIVE_SIZE = 8192;
export const bounds: L.LatLngBoundsExpression = [[-NATIVE_SIZE, 0], [0, NATIVE_SIZE]];

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
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);

  const handleEditClick = (marker: any) => {
    setEditingMarkerId(marker.id);
    setPendingMarker({ lat: marker.lat, lng: marker.lng });
  };

  const handleDeleteClick = async (id: string) => {
    if (!editorPassword) {
      if (!confirm("Suggest removing this marker from the map?")) return;
      const res = await suggestDeleteMarker(id);
      if (res.success) alert("Deletion suggestion submitted for approval.");
      return;
    }
    if (!confirm("Are you sure you want to delete this marker?")) return;
    const res = await deleteMarker(id, editorPassword);
    if (res.success) setMarkers((prev: any[]) => prev.filter(m => m.id !== id));
  };

  return (
    <div className="relative w-full h-full">
      <MapContainer crs={L.CRS.Simple} bounds={bounds} maxZoom={3} minZoom={-5} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#121212' }}>
        
        <MapSettingsController settings={settings} />
        <FlyToController flyToMarker={flyToMarker} setFlyToMarker={setFlyToMarker} />
        <MapCustomControls brightness={brightness} setBrightness={setBrightness} />
        
        <SvgMapLayer url={mapUrl} hardwareAcceleration={settings.hardwareAcceleration} currentFloorId={currentFloorId} onFloorsLoaded={onFloorsLoaded} setAllFloors={setAllFloors} brightness={brightness} />
        <MapClickHandler mode={mode} currentFloorId={currentFloorId} setPendingMarker={setPendingMarker} setIsRelocating={setIsRelocating} />

        <MarkerList 
          markers={markers} activeFilters={activeFilters} editingMarkerId={editingMarkerId} currentFloorId={currentFloorId} allFloors={allFloors} iconScale={settings.iconScale} 
          setCurrentFloorId={setCurrentFloorId} mode={mode} editorPassword={editorPassword} setEnlargedImage={setEnlargedImage} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick} 
        />
        
        {pendingMarker && <Marker position={[pendingMarker.lat, pendingMarker.lng]} zIndexOffset={2000} />}
      </MapContainer>

      <MarkerEditor 
        mapName={mapName} currentFloorId={currentFloorId!} editorPassword={editorPassword} markerTypes={markerTypes} markers={markers} setMarkers={setMarkers} 
        pendingMarker={pendingMarker} setPendingMarker={setPendingMarker} editingMarkerId={editingMarkerId} setEditingMarkerId={setEditingMarkerId} 
        isRelocating={isRelocating} setIsRelocating={setIsRelocating} addLocalPendingId={addLocalPendingId}
      />

      {enlargedImage && <Lightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />}
    </div>
  );
}