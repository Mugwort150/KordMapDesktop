'use client';

import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Minus, Sun } from 'lucide-react';
import { MapSettings } from '@/app/page';

export function MapSettingsController({ settings }: { settings: MapSettings }) {
  const map = useMap();
  useEffect(() => {
    map.options.zoomDelta = settings.zoomStep;
    map.options.zoomSnap = settings.zoomStep;
    map.options.wheelPxPerZoomLevel = 60 / settings.zoomStep;
  }, [map, settings.zoomStep]);
  return null;
}

export function MapCustomControls({ brightness, setBrightness }: { brightness: number, setBrightness: (v: number) => void }) {
  const map = useMap();
  const [isOpen, setIsOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current);
      L.DomEvent.disableScrollPropagation(controlRef.current);
    }
  }, []);

  const handleBrightnessClick = () => {
    if (isOpen) { setIsOpen(false); setBrightness(100); } 
    else { setIsOpen(true); setBrightness(50); }
  };

  return (
    <div ref={controlRef} className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <div className="flex flex-col bg-[#1a1a1a] rounded-lg border border-[#333] shadow-xl overflow-hidden">
        <button title="Zoom In" onClick={() => map.zoomIn()} className="p-2 hover:bg-[#333] text-white border-b border-[#333] transition-colors"><Plus size={18}/></button>
        <button title="Zoom Out" onClick={() => map.zoomOut()} className="p-2 hover:bg-[#333] text-white transition-colors"><Minus size={18}/></button>
      </div>
      
      <div className="relative flex flex-col bg-[#1a1a1a] rounded-lg border border-[#333] shadow-xl">
        <button title="Map Brightness" onClick={handleBrightnessClick} className={`p-2 transition-colors ${isOpen ? 'bg-[#333] text-[#e68c3a]' : 'hover:bg-[#333] text-white'}`}>
          <Sun size={18}/>
        </button>
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-[#1a1a1a] border border-[#333] rounded-lg p-3 shadow-xl flex flex-col items-center gap-4">
            <span className="text-xs text-gray-400 font-bold">{brightness}%</span>
            <div className="h-24 w-6 flex items-center justify-center">
              <input type="range" min="10" max="100" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-24 h-1 bg-[#444] rounded appearance-none outline-none accent-[#e68c3a] -rotate-90 origin-center cursor-pointer" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}