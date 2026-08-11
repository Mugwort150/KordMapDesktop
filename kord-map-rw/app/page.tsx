'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import ConnectionLinesOverlay from '@/components/ConnectionLines';
import TitleScreen from '@/components/TitleScreen';
import LoginModal from '@/components/modals/LoginModal';
import ChangelogModal from '@/components/modals/ChangelogModal';
import ApprovalsModal from '@/components/modals/ApprovalsModal';
import Lightbox from '@/components/modals/Lightbox';

import { getMarkers, getPendingMarkers, getAllApprovedMarkerStats, getAllPendingMarkerStats, verifyEditorPassword } from '@/app/actions/markers';

const MapWrapper = dynamic(() => import('@/components/MapWrapper'), { ssr: false });
const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

export type MapSettings = { zoomStep: number; hardwareAcceleration: boolean; iconScale: number; };
export type Floor = { id: string; name: string; };

export default function Home() {
  const [mapsData, setMapsData] = useState<Record<string, { map_url: string; cover_url?: string; map_name?: string }>>({});
  const [globalDocTypes, setGlobalDocTypes] = useState<Record<string, any>>({});
  const [globalStats, setGlobalStats] = useState<{ mapName: string, type: string }[]>([]);
  const [globalPendingStats, setGlobalPendingStats] = useState<{ mapName: string, id: string }[]>([]);
  const [titleFilters, setTitleFilters] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<{ id: string; displayName: string; url: string } | null>(null);

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [editorPassword, setEditorPassword] = useState<string>('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  const [isApprovalsOpen, setIsApprovalsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [localPendingIds, setLocalPendingIds] = useState<string[]>([]);
  
  const [markerTypes, setMarkerTypes] = useState<Record<string, string[]>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [flyToMarker, setFlyToMarker] = useState<any | null>(null);
  const [previewMarker, setPreviewMarker] = useState<any | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [currentFloorId, setCurrentFloorId] = useState<string | null>(null);
  const [settings, setSettings] = useState<MapSettings>({ zoomStep: 1, hardwareAcceleration: true, iconScale: 1 });
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null); 

  useEffect(() => {
    fetch('/maps.json').then(r => r.json()).then(setMapsData).catch(e => console.error(e));
    fetch('/documents.json').then(r => r.json()).then(setGlobalDocTypes).catch(e => console.error(e));
    getAllApprovedMarkerStats().then(setGlobalStats).catch(e => console.error(e));

    const saved = localStorage.getItem('kordSettings');
    if (saved) setSettings(JSON.parse(saved));
    const savedAuth = sessionStorage.getItem('kordAuth');
    if (savedAuth) setEditorPassword(savedAuth);
    
    const savedLockout = localStorage.getItem('kordLoginLockout');
    if (savedLockout) {
      const end = parseInt(savedLockout, 10);
      if (Date.now() < end) setLockoutTime(end);
      else localStorage.removeItem('kordLoginLockout');
    }
  }, []);

  useEffect(() => {
    if (!lockoutTime) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutTime(null);
        setLoginAttempts(0);
        localStorage.removeItem('kordLoginLockout');
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  useEffect(() => {
    if (editorPassword) {
      getAllPendingMarkerStats(editorPassword).then(setGlobalPendingStats).catch(console.error);
    } else {
      setGlobalPendingStats([]);
    }
  }, [editorPassword]);

  useEffect(() => {
    if (selectedMap) {
      setMarkers([]); setPendingQueue([]); setFloors([]); setCurrentFloorId(null); setMarkerTypes({}); setActiveFilters([]);
      const savedPending = JSON.parse(localStorage.getItem('kordPendingMarkers') || '[]');
      setLocalPendingIds(savedPending);

      getMarkers(selectedMap.id, savedPending).then((fetchedMarkers) => {
        const stillPending = savedPending.filter((id: string) => {
          const m = fetchedMarkers.find((x: any) => x.id === id);
          return m && !m.approved;
        });
        if (stillPending.length !== savedPending.length) {
          localStorage.setItem('kordPendingMarkers', JSON.stringify(stillPending));
          setLocalPendingIds(stillPending);
        }
        setMarkers(fetchedMarkers);
      });
      
      if (globalDocTypes[selectedMap.id]) {
        setMarkerTypes(globalDocTypes[selectedMap.id]);
        setActiveFilters(Object.values(globalDocTypes[selectedMap.id]).flat().map((t: any) => t.toLowerCase().replace(/\s+/g, '-')));
      }
    } else {
      setTitleFilters([]);
    }
  }, [selectedMap, globalDocTypes]);

  const handleLoginSubmit = async () => {
    if (lockoutTime || isVerifying || !editorPassword) return;
    setIsVerifying(true);
    
    const isValid = await verifyEditorPassword(editorPassword);
    setIsVerifying(false);

    if (isValid) {
      sessionStorage.setItem('kordAuth', editorPassword);
      setLoginAttempts(0);
      setIsLoginOpen(false);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        const unlockTime = Date.now() + 60000;
        setLockoutTime(unlockTime);
        localStorage.setItem('kordLoginLockout', unlockTime.toString());
      } else {
        alert(`Incorrect password. ${5 - newAttempts} attempts remaining.`);
      }
      setEditorPassword('');
    }
  };

  const addLocalPendingId = (id: string) => {
    setLocalPendingIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('kordPendingMarkers', JSON.stringify(next));
      return next;
    });
  };

  const saveSettings = (s: MapSettings) => { setSettings(s); localStorage.setItem('kordSettings', JSON.stringify(s)); };
  const handleLogout = () => { sessionStorage.removeItem('kordAuth'); setEditorPassword(''); setIsApprovalsOpen(false); };

  const loadApprovals = async () => {
    if (!selectedMap) return;
    const res = await getPendingMarkers(editorPassword, selectedMap.id);
    if (res.markers) { setPendingQueue(res.markers); setIsApprovalsOpen(true); } 
    else { alert("Invalid Editor Password"); handleLogout(); }
  };

  const handleFloorsLoaded = useCallback((loadedFloors: Floor[]) => {
    setFloors(loadedFloors);
    setCurrentFloorId((prev) => {
      if (loadedFloors.length > 0 && !prev) {
        const first = loadedFloors.find(f => f.name.toLowerCase().includes('first floor'));
        return first ? first.id : loadedFloors[0].id;
      }
      return prev;
    });
  }, []);

  const changelog = [
    ...markers.filter(m => m.approved).map(m => ({ ...m, status: 'approved' })),
    ...(editorPassword ? pendingQueue.map(m => ({ ...m, status: m.isDeletion ? 'pending-delete' : m.originalId ? 'pending-edit' : 'pending-new' })) : [])
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!selectedMap) {
    return (
      <TitleScreen 
        mapsData={mapsData} globalDocTypes={globalDocTypes} globalStats={globalStats} globalPendingStats={globalPendingStats}
        titleFilters={titleFilters} setTitleFilters={setTitleFilters} setSelectedMap={setSelectedMap}
        editorPassword={editorPassword} handleLogout={handleLogout} setIsLoginOpen={setIsLoginOpen}
      />
    );
  }

  return (
    <main className="flex h-[100dvh] w-full bg-[#121212] overflow-hidden text-white relative">
      <ConnectionLinesOverlay hoveredFilter={hoveredFilter} />
      <Sidebar 
        mapName={selectedMap.displayName} onClearMap={() => setSelectedMap(null)}
        mode={mode} setMode={setMode} floors={floors} currentFloorId={currentFloorId} setCurrentFloorId={setCurrentFloorId}
        openSettings={() => setIsSettingsOpen(true)} openLogin={() => setIsLoginOpen(true)} 
        openApprovals={loadApprovals} openChangelog={() => setIsChangelogOpen(true)}
        onLogout={handleLogout} isLoggedIn={!!editorPassword}
        markerTypes={markerTypes} activeFilters={activeFilters} setActiveFilters={setActiveFilters}
        setHoveredFilter={setHoveredFilter} hoveredFilter={hoveredFilter} markers={markers}
      />
      <div className="flex-1 relative">
        <MapWrapper 
          mapName={selectedMap.id} mapUrl={selectedMap.url}
          mode={mode} settings={settings} currentFloorId={currentFloorId} setCurrentFloorId={setCurrentFloorId}
          onFloorsLoaded={handleFloorsLoaded} editorPassword={editorPassword}
          markers={markers} setMarkers={setMarkers} markerTypes={markerTypes} activeFilters={activeFilters}
          flyToMarker={flyToMarker} setFlyToMarker={setFlyToMarker} addLocalPendingId={addLocalPendingId}
        />
      </div>

      {isSettingsOpen && <SettingsModal mapName={selectedMap.id} settings={settings} saveSettings={saveSettings} close={() => setIsSettingsOpen(false)} editorPassword={editorPassword} />}
      
      {isLoginOpen && <LoginModal editorPassword={editorPassword} setEditorPassword={setEditorPassword} handleLoginSubmit={handleLoginSubmit} lockoutTime={lockoutTime} lockoutRemaining={lockoutRemaining} isVerifying={isVerifying} setIsLoginOpen={setIsLoginOpen} />}

      {isChangelogOpen && <ChangelogModal changelog={changelog} setIsChangelogOpen={setIsChangelogOpen} setCurrentFloorId={setCurrentFloorId} setFlyToMarker={setFlyToMarker} editorPassword={editorPassword} />}

      {isApprovalsOpen && <ApprovalsModal pendingQueue={pendingQueue} setPendingQueue={setPendingQueue} markers={markers} setMarkers={setMarkers} selectedMapName={selectedMap.id} editorPassword={editorPassword} setIsApprovalsOpen={setIsApprovalsOpen} setEnlargedImage={setEnlargedImage} setPreviewMarker={setPreviewMarker} />}

      {previewMarker && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg w-[600px] h-[500px] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <img src={`/icons/${previewMarker.type}.png`} className="w-5 h-5 object-contain" alt="icon" />
                Preview: {previewMarker.title}
              </h3>
              <button onClick={() => setPreviewMarker(null)} className="text-gray-400 hover:text-white">Close</button>
            </div>
            <div className="flex-1 bg-[#121212] rounded overflow-hidden relative border border-[#333]">
               <MiniMap marker={previewMarker} mapUrl={selectedMap.url} />
            </div>
          </div>
        </div>
      )}

      {enlargedImage && <Lightbox src={enlargedImage} onClose={() => setEnlargedImage(null)} />}
    </main>
  );
}