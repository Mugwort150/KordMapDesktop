'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import SettingsModal from '@/components/SettingsModal';
import { getMarkers, getPendingMarkers, approveMarker, deleteMarker } from '@/app/actions/markers';
import { Map } from 'lucide-react';

const MapWrapper = dynamic(() => import('@/components/MapWrapper'), { ssr: false });
const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

export type MapSettings = { zoomStep: number; hardwareAcceleration: boolean; iconScale: number; };
export type Floor = { id: string; name: string; };

export default function Home() {
  const [mapsData, setMapsData] = useState<Record<string, { map_url: string }>>({});
  const [selectedMap, setSelectedMap] = useState<{ name: string; url: string } | null>(null);

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editorPassword, setEditorPassword] = useState<string>('');
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
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

  useEffect(() => {
    fetch('/maps.json').then(r => r.json()).then(setMapsData).catch(e => console.error(e));
    const saved = localStorage.getItem('kordSettings');
    if (saved) setSettings(JSON.parse(saved));
    const savedAuth = sessionStorage.getItem('kordAuth');
    if (savedAuth) setEditorPassword(savedAuth);
  }, []);

  useEffect(() => {
    if (selectedMap) {
      // Memory Management: Clear cache when swapping maps to free browser RAM
      setMarkers([]);
      setPendingQueue([]);
      setFloors([]);
      setCurrentFloorId(null);
      setMarkerTypes({});
      setActiveFilters([]);

      const savedPending = JSON.parse(localStorage.getItem('kordPendingMarkers') || '[]');
      setLocalPendingIds(savedPending);

      getMarkers(selectedMap.name, savedPending).then((fetchedMarkers) => {
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
      
      fetch('/documents.json').then(r => r.json()).then(data => { 
        if (data[selectedMap.name]) {
          setMarkerTypes(data[selectedMap.name]);
          setActiveFilters(Object.values(data[selectedMap.name]).flat().map((t: any) => t.toLowerCase().replace(/\s+/g, '-')));
        }
      });
    }
  }, [selectedMap]);

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
    const res = await getPendingMarkers(editorPassword, selectedMap.name);
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

  const formatDate = (dateStr: string, showTime: boolean) => {
    const d = new Date(dateStr);
    return showTime ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : d.toLocaleDateString();
  };

  const changelog = [
    ...markers.filter(m => m.approved).map(m => ({ ...m, status: 'approved' })),
    ...(editorPassword ? pendingQueue.map(m => ({ ...m, status: m.originalId ? 'pending-edit' : 'pending-new' })) : [])
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!selectedMap) {
    return (
      <main className="flex h-screen w-full bg-[#121212] flex-col items-center justify-center text-white p-6">
        <div className="flex flex-col items-center mb-10">
          <Map size={48} className="text-[#e68c3a] mb-4" />
          <h1 className="text-4xl font-bold tracking-widest uppercase">Kord Map</h1>
          <p className="text-gray-500 mt-2">Select a location to begin</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
          {Object.entries(mapsData).map(([name, data]) => (
            <button key={name} onClick={() => setSelectedMap({ name, url: data.map_url })} className="bg-[#1a1a1a] border border-[#333] hover:border-[#e68c3a] p-8 rounded-lg shadow-2xl transition-all hover:scale-105 flex flex-col items-center justify-center gap-4 group">
              <h2 className="text-2xl font-bold uppercase tracking-wider group-hover:text-[#e68c3a] transition-colors">{name}</h2>
            </button>
          ))}
          {Object.keys(mapsData).length === 0 && <p className="text-gray-500 col-span-full text-center">Loading maps...</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen w-full bg-[#121212] overflow-hidden text-white">
      <Sidebar 
        mapName={selectedMap.name} onClearMap={() => setSelectedMap(null)}
        mode={mode} setMode={setMode} floors={floors} currentFloorId={currentFloorId} setCurrentFloorId={setCurrentFloorId}
        openSettings={() => setIsSettingsOpen(true)} openLogin={() => setIsLoginOpen(true)} 
        openApprovals={loadApprovals} openChangelog={() => setIsChangelogOpen(true)}
        onLogout={handleLogout} isLoggedIn={!!editorPassword}
        markerTypes={markerTypes} activeFilters={activeFilters} setActiveFilters={setActiveFilters}
      />
      <div className="flex-1 relative">
        <MapWrapper 
          mapName={selectedMap.name} mapUrl={selectedMap.url}
          mode={mode} settings={settings} currentFloorId={currentFloorId} setCurrentFloorId={setCurrentFloorId}
          onFloorsLoaded={handleFloorsLoaded} editorPassword={editorPassword}
          markers={markers} setMarkers={setMarkers} markerTypes={markerTypes} activeFilters={activeFilters}
          flyToMarker={flyToMarker} setFlyToMarker={setFlyToMarker} addLocalPendingId={addLocalPendingId}
        />
      </div>

      {isSettingsOpen && <SettingsModal mapName={selectedMap.name} settings={settings} saveSettings={saveSettings} close={() => setIsSettingsOpen(false)} editorPassword={editorPassword} />}

      {isLoginOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center">
          <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg w-80 shadow-2xl">
            <h2 className="font-bold mb-4">Editor Login</h2>
            <input 
              type="password" placeholder="Password..."
              className="w-full bg-[#2a2a2a] p-2 rounded border border-[#444] mb-4 outline-none focus:border-[#e68c3a]"
              onChange={(e) => setEditorPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { sessionStorage.setItem('kordAuth', editorPassword); setIsLoginOpen(false); }}}
            />
            <div className="flex gap-2">
              <button onClick={() => setIsLoginOpen(false)} className="flex-1 bg-[#333] p-2 rounded text-sm hover:bg-[#444]">Cancel</button>
              <button onClick={() => { sessionStorage.setItem('kordAuth', editorPassword); setIsLoginOpen(false); }} className="flex-1 bg-[#e68c3a] text-black font-bold p-2 rounded text-sm hover:bg-[#cf7d34]">Login</button>
            </div>
          </div>
        </div>
      )}

      {isChangelogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Changelog</h2>
              <button onClick={() => setIsChangelogOpen(false)} className="text-gray-400 hover:text-white">Close</button>
            </div>
            <div className="overflow-y-auto space-y-3 flex-1 pr-2">
              {changelog.map(m => (
                <div key={m.id} className="bg-[#2a2a2a] p-3 rounded flex justify-between items-center border border-[#333]">
                  <div className="flex items-center gap-3">
                    <img src={`/icons/${m.type}.png`} alt="icon" className="w-8 h-8 object-contain" />
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        {m.title}
                        {m.status !== 'approved' && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] text-white font-bold tracking-wider ${m.status === 'pending-edit' ? 'bg-blue-600' : 'bg-green-600'}`}>
                            {m.status === 'pending-edit' ? 'PENDING EDIT' : 'PENDING NEW'}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {m.type.replace(/-/g, ' ')} • {formatDate(m.createdAt, !!editorPassword)}
                        {m.submitter && ` • By ${m.submitter}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setCurrentFloorId(m.floorId); setFlyToMarker(m); setIsChangelogOpen(false); }} className="bg-[#444] hover:bg-[#555] px-3 py-1.5 rounded text-xs font-bold transition-colors">Show on Map</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isApprovalsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#333] p-6 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Approval Queue ({pendingQueue.length})</h2>
              <button onClick={() => setIsApprovalsOpen(false)} className="text-gray-400 hover:text-white">Close</button>
            </div>
            <div className="overflow-y-auto space-y-3 flex-1 pr-2">
              {pendingQueue.map(m => {
                const orig = m.originalId ? markers.find(x => x.id === m.originalId) : null;
                return (
                  <div key={m.id} className="bg-[#2a2a2a] p-3 rounded flex flex-col border border-[#333]">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        {m.imageUrl ? (
                          <img src={m.imageUrl} alt="thumb" loading="lazy" className="w-12 h-12 rounded object-cover border border-[#444] cursor-zoom-in hover:opacity-80" onClick={() => setEnlargedImage(m.imageUrl)} />
                        ) : <div className="w-12 h-12 rounded bg-[#1f1f1f] border border-[#444] flex items-center justify-center text-xs text-gray-600">No Img</div>}
                        <div>
                          <h3 className="font-bold text-[#e68c3a] uppercase text-xs flex items-center gap-2">
                            {m.type.replace(/-/g, ' ')}
                            <span className={`px-1.5 py-0.5 rounded text-[10px] text-white font-bold tracking-wider ${m.originalId ? 'bg-blue-600' : 'bg-green-600'}`}>{m.originalId ? 'EDIT' : 'NEW'}</span>
                          </h3>
                          <p className="font-bold text-sm text-white">{m.title}</p>
                          {m.submitter && <p className="text-xs text-gray-400">By: {m.submitter}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewMarker(m)} className="bg-[#444] hover:bg-[#555] px-3 py-1.5 rounded text-xs font-bold text-white transition-colors">Show on Map</button>
                        <button onClick={async () => {
                          await approveMarker(m.id, editorPassword);
                          setPendingQueue(q => q.filter(x => x.id !== m.id));
                          getMarkers(selectedMap.name).then(setMarkers); 
                        }} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs font-bold text-white transition-colors">Approve</button>
                        <button onClick={async () => {
                          await deleteMarker(m.id, editorPassword);
                          setPendingQueue(q => q.filter(x => x.id !== m.id));
                        }} className="bg-[#7a2c2c] hover:bg-[#8f3636] px-3 py-1.5 rounded text-xs font-bold text-white transition-colors">Reject</button>
                      </div>
                    </div>
                    {orig && (
                      <div className="mt-3 p-2 bg-[#1f1f1f] rounded border border-[#333] text-xs space-y-1">
                        <p className="text-gray-400 font-bold mb-1">Proposed Changes:</p>
                        {orig.title !== m.title && <p>Location: <span className="line-through text-gray-500">{orig.title}</span> <span className="text-green-400">➔ {m.title}</span></p>}
                        {orig.type !== m.type && <p>Type: <span className="line-through text-gray-500">{orig.type}</span> <span className="text-green-400">➔ {m.type}</span></p>}
                        {orig.description !== m.description && <p>Desc: <span className="line-through text-gray-500">{orig.description || 'None'}</span> <span className="text-green-400">➔ {m.description || 'None'}</span></p>}
                        {(orig.lat !== m.lat || orig.lng !== m.lng || orig.floorId !== m.floorId) && <p className="text-blue-400">Position changed</p>}
                        {orig.imageUrl !== m.imageUrl && <p className="text-blue-400">Image changed</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

      {enlargedImage && (
        <div className="fixed inset-0 z-[4000] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out backdrop-blur-sm" onClick={() => setEnlargedImage(null)}>
          <img src={enlargedImage} className="max-w-full max-h-full object-contain rounded shadow-2xl" alt="Enlarged Location" />
        </div>
      )}
    </main>
  );
}