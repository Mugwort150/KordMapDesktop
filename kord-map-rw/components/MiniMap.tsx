'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default marker icons in the preview map
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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

export default function MiniMap({ marker, mapUrl }: { marker: any, mapUrl: string }) {
  return (
    <MapContainer 
      crs={L.CRS.Simple} bounds={[[-8192, 0], [0, 8192]]} center={[marker.lat, marker.lng]} zoom={-2} zoomControl={false}
      style={{height: '100%', width: '100%', backgroundColor: '#121212'}}
    >
      <PreviewMapOverlay url={mapUrl} /> 
      <Marker position={[marker.lat, marker.lng]} />
    </MapContainer>
  );
}