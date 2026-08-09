'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';

const MapWrapper = dynamic(() => import('@/components/MapWrapper'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-[#121212] flex items-center justify-center text-white">Loading Kord Map...</div>,
});

export type MapSettings = {
  zoomStep: number;
  hardwareAcceleration: boolean;
};

export type Floor = {
  id: string;
  name: string;
};

export default function Home() {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [floors, setFloors] = useState<Floor[]>([]);
  const [currentFloorId, setCurrentFloorId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<MapSettings>({
    zoomStep: 1,
    hardwareAcceleration: true,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('kordSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: MapSettings) => {
    setSettings(newSettings);
    localStorage.setItem('kordSettings', JSON.stringify(newSettings));
  };

  const handleFloorsLoaded = useCallback((loadedFloors: Floor[]) => {
    setFloors(loadedFloors);
    setCurrentFloorId((prevId) => {
      if (loadedFloors.length > 0 && !prevId) {
        // 🚀 DEFAULT FLOOR FIX: Specifically look for the First Floor
        const firstFloor = loadedFloors.find(f => f.name.toLowerCase().includes('first floor'));
        return firstFloor ? firstFloor.id : loadedFloors[0].id;
      }
      return prevId;
    });
  }, []);

  return (
    <main className="flex h-screen w-full bg-[#121212] overflow-hidden text-white">
      <Sidebar 
        mode={mode} 
        setMode={setMode} 
        floors={floors}
        currentFloorId={currentFloorId}
        setCurrentFloorId={setCurrentFloorId}
        openSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 relative">
        <MapWrapper 
          mode={mode}
          settings={settings}
          currentFloorId={currentFloorId}
          onFloorsLoaded={handleFloorsLoaded}
        />
      </div>

      {isSettingsOpen && (
        <SettingsModal 
          settings={settings} 
          saveSettings={saveSettings} 
          close={() => setIsSettingsOpen(false)} 
        />
      )}
    </main>
  );
}