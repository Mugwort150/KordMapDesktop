'use client';

import { Map as MapIcon, ListFilter } from 'lucide-react';

interface TitleScreenProps {
  mapsData: Record<string, { map_url: string; cover_url?: string; map_name?: string }>;
  globalDocTypes: Record<string, any>;
  globalStats: { mapName: string, type: string }[];
  globalPendingStats: { mapName: string, id: string }[];
  titleFilters: string[];
  setTitleFilters: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedMap: (map: { id: string; displayName: string; url: string } | null) => void;
  editorPassword?: string;
  handleLogout: () => void;
  setIsLoginOpen: (open: boolean) => void;
}

export default function TitleScreen({
  mapsData, globalDocTypes, globalStats, globalPendingStats,
  titleFilters, setTitleFilters, setSelectedMap,
  editorPassword, handleLogout, setIsLoginOpen
}: TitleScreenProps) {
  
  let allTypesRaw: string[] = [];
  Object.values(globalDocTypes).forEach((mapObj: any) => {
    Object.values(mapObj).forEach((types: any) => allTypesRaw.push(...types));
  });
  
  const uniqueTypes = Array.from(new Set(allTypesRaw)).map(t => ({
    id: t.toLowerCase().replace(/\s+/g, '-'), 
    name: t
  }));

  return (
    <main className="flex h-[100dvh] w-full bg-[#121212] overflow-hidden text-white relative">
      <div className="w-80 bg-[#1a1a1a] border-r border-[#333] flex flex-col shadow-2xl z-10 shrink-0">
        <div className="p-8 border-b border-[#333] text-center">
          {/* 🚀 FIXED: Using MapIcon instead of Map to avoid JS class collision */}
          <MapIcon size={48} className="text-[#e68c3a] mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-widest uppercase text-white">Kord Map</h1>
          <p className="text-sm text-gray-500 mt-2">Select a location to begin</p>
        </div>
        <div className="p-5 flex-1 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ListFilter size={14} /> Required Documents
          </h3>
          <div className="space-y-1">
            {uniqueTypes.map(type => {
              const count = globalStats.filter(m => m.type === type.id).length;
              if (count === 0) return null; 
              const isActive = titleFilters.includes(type.id);
              return (
                <div 
                  key={type.id} 
                  onClick={() => setTitleFilters(prev => isActive ? prev.filter(f => f !== type.id) : [...prev, type.id])} 
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all duration-150 ${isActive ? 'bg-[#2a2a2a] border-r-2 border-[#e68c3a] opacity-100' : 'hover:bg-[#222] border-r-2 border-transparent opacity-60'}`}
                >
                  <div className="flex items-center gap-3">
                    <img src={`/icons/${type.id}.png`} className="w-6 h-6 object-contain filter drop-shadow-md" alt="icon" />
                    <span className={`text-sm font-medium ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>{type.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-[#333] text-gray-300' : 'bg-[#1a1a1a] text-gray-600'}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="p-5 border-t border-[#333] flex flex-col gap-2">
          {editorPassword ? (
            <button onClick={handleLogout} className="w-full bg-[#7a2c2c] text-white font-bold py-2 rounded text-xs hover:bg-[#8f3636] transition-colors">Editor Logout</button>
          ) : (
            <button onClick={() => setIsLoginOpen(true)} className="w-full text-center text-xs text-gray-500 hover:text-white transition-colors">Editor Login</button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative h-full overflow-y-auto bg-[#0a0a0a]">
        <div className="p-6 md:p-10 flex flex-col items-center min-h-full w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl w-full my-auto pt-10 pb-16">
            {Object.entries(mapsData).map(([id, data]) => {
              const mapStats = globalStats.filter(m => m.mapName === id);
              const pendingCount = globalPendingStats.filter(m => m.mapName === id).length;
              const mapTypeCounts = mapStats.reduce((acc, curr) => { acc[curr.type] = (acc[curr.type] || 0) + 1; return acc; }, {} as Record<string, number>);
              const hasRequiredFilters = titleFilters.length === 0 || titleFilters.every(f => mapTypeCounts[f] > 0);
              const displayName = data.map_name || id;

              return (
                <div key={id} className="flex flex-col items-center w-full">
                  <button 
                    onClick={() => setSelectedMap({ id, displayName, url: data.map_url })} 
                    className={`relative overflow-hidden group rounded-xl border-2 transition-all duration-500 flex flex-col items-center justify-center min-h-[250px] w-full ${hasRequiredFilters ? 'border-[#333] hover:border-[#e68c3a] hover:scale-105 shadow-2xl opacity-100' : 'border-[#222] opacity-30 grayscale scale-95 pointer-events-none'}`}
                  >
                    {data.cover_url ? <div className="absolute inset-0 bg-cover bg-center blur-[8px] group-hover:blur-[2px] transition-all duration-700 scale-110 group-hover:scale-100" style={{ backgroundImage: `url(${data.cover_url})` }} /> : <div className="absolute inset-0 bg-[#1a1a1a]" />}
                    <div className="absolute inset-0 bg-black/70 group-hover:bg-black/50 transition-all duration-500" />
                    
                    <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 w-full px-2 sm:px-4">
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-wider text-white group-hover:text-[#e68c3a] transition-colors drop-shadow-lg text-center w-full break-words leading-tight px-1">
                        {displayName}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold text-gray-300 bg-black/60 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-[#444] backdrop-blur-sm w-full max-w-[95%]">
                        {Object.entries(mapTypeCounts).length > 0 ? (
                          Object.entries(mapTypeCounts).map(([typeId, count], i, arr) => (
                            <span key={typeId} className="flex items-center gap-2 whitespace-nowrap my-1">
                              <img src={`/icons/${typeId}.png`} className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain filter drop-shadow-md" alt="icon" />
                              <span className="text-white text-base sm:text-lg md:text-xl">{count}</span>
                              {i < arr.length - 1 && <span className="mx-2 sm:mx-3 text-gray-600">|</span>}
                            </span>
                          ))
                        ) : <span className="text-gray-500 py-1">No markers placed</span>}
                      </div>
                    </div>
                  </button>
                  {editorPassword && pendingCount > 0 && <div className="mt-4 bg-blue-600/90 border border-blue-400 text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg animate-pulse">{pendingCount} Pending Approval{pendingCount > 1 ? 's' : ''}</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t border-[#222] text-xs text-gray-500 text-center flex flex-wrap gap-6 justify-center w-full max-w-4xl">
            <p>You can contribute to this project on <a href="https://github.com/KalleLeskinen/KordMap" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">GitHub</a></p>
            <p>Locations provided by users on VeryBadScav&apos;s <a href="https://discord.com/invite/AmuWBRMnVQ" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">Discord</a></p>
            <p>Maps by <a href="https://github.com/the-hideout/tarkov-dev-svg-maps" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">Shebuka</a></p>
            <p><a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">CC BY-NC-SA 4.0</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}