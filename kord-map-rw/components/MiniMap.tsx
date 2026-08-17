'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

function PreviewMapOverlay({ url }: { url: string }) {
  const map = useMap();
  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(text => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const el = doc.documentElement as unknown as SVGElement;
        if (!el.getAttribute("viewBox")) el.setAttribute("viewBox", `0 0 8192 8192`);
        el.style.pointerEvents = 'none';
        const layer = L.svgOverlay(el, [[-8192, 0], [0, 8192]], { interactive: false });
        layer.addTo(map);
      });
  }, [map, url]);
  return null;
}

interface MiniMapProps {
  marker: any;
  mapUrl: string;
  originalMarker?: any;
}

export default function MiniMap({ marker, mapUrl, originalMarker }: MiniMapProps) {
  // Center map exactly between original and new location to show the full trajectory
  const centerLat = originalMarker ? (marker.lat + originalMarker.lat) / 2 : marker.lat;
  const centerLng = originalMarker ? (marker.lng + originalMarker.lng) / 2 : marker.lng;

  return (
    <MapContainer 
      crs={L.CRS.Simple} 
      bounds={[[-8192, 0], [0, 8192]]} 
      center={[centerLat, centerLng]} 
      zoom={-3} // 🚀 Start slightly zoomed out
      minZoom={-6} // 🚀 Allow full zooming out
      zoomControl={true} // 🚀 Enable zoom controls
      style={{height: '100%', width: '100%', backgroundColor: '#121212'}}
    >
      <PreviewMapOverlay url={mapUrl} />
      
      {/* 🚀 Render Old Marker & Dashed Red Line */}
      {originalMarker && (
        <>
          <Marker position={[originalMarker.lat, originalMarker.lng]} opacity={0.4} />
          <Polyline 
            positions={[[originalMarker.lat, originalMarker.lng], [marker.lat, marker.lng]]} 
            color="#ef4444" 
            weight={3}
            dashArray="10, 10" 
          />
        </>
      )}

      <Marker position={[marker.lat, marker.lng]} />
    </MapContainer>
  );
}