'use client';

import { useState, useEffect } from 'react';
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MAP_URL = "https://raw.githubusercontent.com/the-hideout/tarkov-dev-svg-maps/refs/heads/main/Customs.svg";

// Base dimensions used to scale the CRS.Simple coordinate grid
const NATIVE_SIZE = 8192;
const bounds: L.LatLngBoundsExpression = [[-NATIVE_SIZE, 0], [0, NATIVE_SIZE]];

// -------------------------------------------------------------------------
// OPTIMIZED SVG OVERLAY
// -------------------------------------------------------------------------
function OptimizedSvgOverlay({ url }: { url: string }) {
  const map = useMap();

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

        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svgElement.innerHTML = svgText;

        const innerSvg = svgElement.children[0];
        if (innerSvg && innerSvg.getAttribute("viewBox")) {
          svgElement.setAttribute("viewBox", innerSvg.getAttribute("viewBox")!);
        } else {
          svgElement.setAttribute("viewBox", `0 0 ${NATIVE_SIZE} ${NATIVE_SIZE}`);
        }

        svgElement.setAttribute("shape-rendering", "optimizeSpeed");

        svgElement.style.willChange = 'transform';
        
        svgElement.style.pointerEvents = 'none';

        svgLayer = L.svgOverlay(svgElement, bounds, {
          interactive: false,
        });

        svgLayer.addTo(map);
      })
      .catch((err) => console.error("Error loading SVG map:", err));

    return () => {
      isMounted = false;
      if (svgLayer) map.removeLayer(svgLayer);
    };
  }, [map, url]);

  return null;
}

// -------------------------------------------------------------------------
// MAIN MAP COMPONENT
// -------------------------------------------------------------------------
export default function KordMap() {
  const [markers, setMarkers] = useState<{ id: string; lat: number; lng: number }[]>([]);

  // Handles capturing coordinates when the user clicks the map
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        setMarkers((prev) => [
          ...prev, 
          { id: Date.now().toString(), lat: e.latlng.lat, lng: e.latlng.lng }
        ]);
      },
    });
    return null;
  };

  return (
    <div className="relative w-full h-screen bg-[#121212]">
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        maxZoom={3}
        minZoom={-5}
        style={{ height: '100%', width: '100%', backgroundColor: '#121212' }}
      >
        <OptimizedSvgOverlay url={MAP_URL} />
        
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
    </div>
  );
}