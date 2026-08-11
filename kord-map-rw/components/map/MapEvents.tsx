'use client';

import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

export function FlyToController({ flyToMarker, setFlyToMarker }: { flyToMarker: any, setFlyToMarker: any }) {
  const map = useMap();
  useEffect(() => {
    if (flyToMarker) {
      map.flyTo([flyToMarker.lat, flyToMarker.lng], 1, { duration: 0.5 });
      setFlyToMarker(null);
    }
  }, [flyToMarker, map, setFlyToMarker]);
  return null;
}

export function MapClickHandler({ mode, currentFloorId, setPendingMarker, setIsRelocating }: any) {
  useMapEvents({
    click: (e) => {
      if (mode !== 'edit' || !currentFloorId) return;
      setPendingMarker({ lat: e.latlng.lat, lng: e.latlng.lng });
      setIsRelocating(false);
    },
  });
  return null;
}