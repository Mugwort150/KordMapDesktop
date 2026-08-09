'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapSettings, Floor } from '@/app/page';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MAP_URL = "https://raw.githubusercontent.com/the-hideout/tarkov-dev-svg-maps/refs/heads/main/Customs.svg";
const NATIVE_SIZE = 8192;
const bounds: L.LatLngBoundsExpression = [[-NATIVE_SIZE, 0], [0, NATIVE_SIZE]];

// -------------------------------------------------------------------------
// 🚀 DYNAMIC LAYERED SVG OVERLAY
// -------------------------------------------------------------------------
interface SvgOverlayProps {
  url: string;
  hardwareAcceleration: boolean;
  currentFloorId: string | null;
  onFloorsLoaded: (floors: Floor[]) => void;
}

function LayeredSvgOverlay({ url, hardwareAcceleration, currentFloorId, onFloorsLoaded }: SvgOverlayProps) {
  const map = useMap();
  const svgRef = useRef<SVGElement | null>(null);
  const floorsRef = useRef<Floor[]>([]);

  useEffect(() => {
    let isMounted = true;
    let svgLayer: L.SVGOverlay | null = null;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((svgText) => {
        if (!isMounted) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = doc.documentElement as unknown as SVGElement;

        if (!svgElement.getAttribute("viewBox")) {
          const w = svgElement.getAttribute("width") || "1000";
          const h = svgElement.getAttribute("height") || "1000";
          svgElement.setAttribute("viewBox", `0 0 ${parseInt(w)} ${parseInt(h)}`);
        }

        svgElement.setAttribute("shape-rendering", "optimizeSpeed");
        svgElement.style.pointerEvents = 'none';
        
        let groups = Array.from(svgElement.children).filter(el => el.tagName.toLowerCase() === 'g');
        
        if (groups.length === 1) {
          const innerGroups = Array.from(groups[0].children).filter(el => el.tagName.toLowerCase() === 'g');
          if (innerGroups.length > 0) {
            groups = innerGroups;
          }
        }

        const extractedFloors: Floor[] = groups.map((g, index) => {
          const rawId = g.getAttribute('id') || `Layer_${index}`;
          const name = rawId.replace(/_x20_/g, ' ').replace(/_/g, ' ');
          return { id: rawId, name };
        });

        floorsRef.current = extractedFloors;
        svgRef.current = svgElement;

        svgLayer = L.svgOverlay(svgElement, bounds, { interactive: false });
        svgLayer.addTo(map);

        const uiFloors = extractedFloors.filter(f => f.name.toLowerCase().trim() !== 'ground level');
        onFloorsLoaded(uiFloors);
      })
      .catch((err) => console.error("Error loading SVG map:", err));

    return () => {
      isMounted = false;
      if (svgLayer) map.removeLayer(svgLayer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, url]);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.willChange = hardwareAcceleration ? 'transform' : 'auto';
  }, [hardwareAcceleration]);

  // 🚀 FLOOR VISIBILITY ENGINE
  useEffect(() => {
    if (!svgRef.current || !currentFloorId || floorsRef.current.length === 0) return;

    const floors = floorsRef.current;
    
    const currentIndex = floors.findIndex(f => f.id === currentFloorId);
    if (currentIndex === -1) return;

    // Check if the First Floor is currently the active selected floor
    const isFirstFloorSelected = floors[currentIndex].name.toLowerCase().includes('first floor');

    floors.forEach((floor, index) => {
      const gNode = svgRef.current!.querySelector(`g[id="${CSS.escape(floor.id)}"]`) as SVGGElement;
      if (!gNode) return;

      // 🚀 CONDITIONAL EXCEPTION: 
      // The Ground Level is ONLY kept bright if the First Floor is active.
      // If any other floor is active, it gets darkened normally!
      if (floor.name.toLowerCase().trim() === 'ground level' && isFirstFloorSelected) {
        gNode.style.display = 'block';
        gNode.style.opacity = '1';
        gNode.style.filter = 'none';
        return; 
      }

      // Standard Layering Rules
      if (index > currentIndex) {
        gNode.style.display = 'none'; // Floors ABOVE: Hidden
      } else if (index === currentIndex) {
        gNode.style.display = 'block'; // Current Floor: Full Opacity
        gNode.style.opacity = '1';
        gNode.style.filter = 'none';
      } else if (index < currentIndex) {
        gNode.style.display = 'block'; // Floors BELOW: Darkened
        gNode.style.opacity = '0.35';
        gNode.style.filter = 'brightness(0.25) grayscale(0.6)';
      }
    });

  }, [currentFloorId]);

  return null;
}

// -------------------------------------------------------------------------
// MAP CONTROLLER & MAIN COMPONENT
// -------------------------------------------------------------------------
function MapSettingsController({ settings }: { settings: MapSettings }) {
  const map = useMap();
  useEffect(() => {
    map.options.zoomDelta = settings.zoomStep;
    map.options.zoomSnap = settings.zoomStep;
    map.options.wheelPxPerZoomLevel = 60 / settings.zoomStep;
  }, [map, settings.zoomStep]);
  return null;
}

interface MapProps {
  mode: 'view' | 'edit';
  settings: MapSettings;
  currentFloorId: string | null;
  onFloorsLoaded: (floors: Floor[]) => void;
}

export default function Map({ mode, settings, currentFloorId, onFloorsLoaded }: MapProps) {
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number }[]>([]);

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (mode !== 'edit') return;
        setMarkers((prev) => [
          ...prev, 
          { id: Date.now().toString(), lat: e.latlng.lat, lng: e.latlng.lng }
        ]);
      },
    });
    return null;
  };

  return (
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      maxZoom={3}
      minZoom={-5}
      zoomControl={false}
      style={{ height: '100%', width: '100%', backgroundColor: '#121212' }}
    >
      <MapSettingsController settings={settings} />
      
      <LayeredSvgOverlay 
        url={MAP_URL} 
        hardwareAcceleration={settings.hardwareAcceleration}
        currentFloorId={currentFloorId}
        onFloorsLoaded={onFloorsLoaded}
      />
      
      <MapClickHandler />

      {markers.map((marker) => (
        <Marker key={marker.id} position={[marker.lat, marker.lng]}>
          <Popup>
            <div className="text-black">
              <h3 className="font-bold text-lg mb-1">New Location</h3>
              <p className="text-sm">X: {Math.round(marker.lng)} | Y: {Math.round(marker.lat)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}