'use client';

import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MarkerPopup from './MarkerPopup';

const getCustomIcon = (typeId: string, isGhost: boolean, direction: 'up' | 'down' | null, iconScale: number) => {
  const scale = iconScale || 1;
  const size = 32 * scale;
  
  let ghostStyles = ''; 
  let arrowHtml = '';
  
  if (isGhost) {
    ghostStyles = `opacity: 0.6; filter: grayscale(0.5);`; 
    const arrowColor = direction === 'up' ? '#22c55e' : '#ef4444';
    const arrowChar = direction === 'up' ? '▲' : '▼';
    arrowHtml = `<div style="position: absolute; top: -${4 * scale}px; right: -${4 * scale}px; width: ${14 * scale}px; height: ${14 * scale}px; background: rgba(0,0,0,0.8); border-radius: 50%; border: 1px solid #444; color: ${arrowColor}; display: flex; align-items: center; justify-content: center; z-index: 10; font-size: ${9 * scale}px; font-weight: bold; line-height: 1;">${arrowChar}</div>`;
  }
  
  return L.divIcon({
    html: `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; ${ghostStyles}">
             <img src="/icons/${typeId}.png" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(1px 1px 0px white) drop-shadow(-1px 1px 0px white) drop-shadow(1px -1px 0px white) drop-shadow(-1px -1px 0px white) drop-shadow(0px 3px 6px rgba(0,0,0,0.6));" />
             ${arrowHtml}
           </div>`,
    className: `bg-transparent border-none marker-type-${typeId} ${isGhost ? 'is-ghost' : ''}`, 
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -(size / 2)],
  });
};

export default function MarkerList({ 
  markers, activeFilters, editingMarkerId, currentFloorId, allFloors, iconScale, 
  setCurrentFloorId, mode, editorPassword, setEnlargedImage, handleEditClick, handleDeleteClick 
}: any) {
  
  const pendingEdits = markers.filter((m: any) => !m.approved && m.originalId);
  const hiddenOriginalIds = new Set(pendingEdits.map((m: any) => m.originalId));
  const visibleMarkers = markers.filter((m: any) => !hiddenOriginalIds.has(m.id) && !m.isDeletion);

  return (
    <>
      {visibleMarkers
        .filter((marker: any) => activeFilters.includes(marker.type))
        .filter((marker: any) => marker.id !== editingMarkerId)
        .map((marker: any) => {
          const currentIndex = allFloors.findIndex((f: any) => f.id === currentFloorId);
          const markerIndex = allFloors.findIndex((f: any) => f.id === marker.floorId);
          const isGhost = currentIndex !== -1 && markerIndex !== -1 && currentIndex !== markerIndex;
          
          let direction: 'up' | 'down' | null = null;
          if (isGhost) direction = markerIndex > currentIndex ? 'up' : 'down';

          return (
            <Marker 
              key={`${marker.id}-scale-${iconScale}`} 
              position={[marker.lat, marker.lng]} 
              icon={getCustomIcon(marker.type, isGhost, direction, iconScale)}
              zIndexOffset={isGhost ? -1000 : 0}
              eventHandlers={isGhost ? { click: () => setCurrentFloorId(marker.floorId) } : undefined}
            >
              <Popup>
                <MarkerPopup 
                  marker={marker} isGhost={isGhost} mode={mode} editorPassword={editorPassword}
                  setEnlargedImage={setEnlargedImage} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick}
                />
              </Popup>
            </Marker>
          );
      })}
    </>
  );
}