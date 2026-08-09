'use client';

import { Map, Eye, Edit3, Settings, Layers, ListFilter, History } from 'lucide-react';
import { Floor } from '@/app/page';

interface SidebarProps {
  mapName: string;
  onClearMap: () => void;
  mode: 'view' | 'edit';
  setMode: (mode: 'view' | 'edit') => void;
  floors: Floor[];
  currentFloorId: string | null;
  setCurrentFloorId: (id: string) => void;
  openSettings: () => void;
  openLogin: () => void;
  openApprovals: () => void;
  openChangelog: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  markerTypes: Record<string, string[]>;
  activeFilters: string[];
  setActiveFilters: (filters: string[]) => void;
}

export default function Sidebar({ 
  mapName, onClearMap, mode, setMode, floors, currentFloorId, setCurrentFloorId, 
  openSettings, openLogin, openApprovals, openChangelog, onLogout, isLoggedIn,
  markerTypes, activeFilters, setActiveFilters
}: SidebarProps) {

  // Flatten documents.json into a single list of types
  const allTypes = Object.values(markerTypes).flat();

  const toggleFilter = (typeId: string) => {
    if (activeFilters.includes(typeId)) {
      setActiveFilters(activeFilters.filter(t => t !== typeId));
    } else {
      setActiveFilters([...activeFilters, typeId]);
    }
  };

  return (
    <div className="w-72 bg-[#1a1a1a] border-r border-[#333] flex flex-col shadow-2xl z-[1000]">
      
      {/* Centered Header */}
      <div className="p-5 border-b border-[#333] text-center">
        <h1 className="text-2xl font-bold tracking-wider uppercase text-white mb-3">{mapName}</h1>
        <button onClick={onClearMap} className="w-full flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] transition-colors py-2 rounded text-sm text-gray-300 font-medium">
          <Map size={16} /> Change Map
        </button>
      </div>

      <div className="p-5 border-b border-[#333]">
        <div className="flex bg-[#0f0f0f] rounded p-1">
          <button 
            onClick={() => setMode('view')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm transition-colors ${mode === 'view' ? 'bg-[#2a2a2a] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Eye size={16} /> View
          </button>
          <button 
            onClick={() => setMode('edit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm transition-colors ${mode === 'edit' ? 'bg-[#e68c3a] text-black font-bold shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Edit3 size={16} /> Edit
          </button>
        </div>
      </div>

      {/* Dynamic Filters with Icons */}
      <div className="p-5 border-b border-[#333]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <ListFilter size={14} /> Filters
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {allTypes.map(type => {
            const typeId = type.toLowerCase().replace(/\s+/g, '-');
            const isActive = activeFilters.includes(typeId);
            return (
              <label key={typeId} className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer hover:text-white">
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={() => toggleFilter(typeId)}
                  className="w-4 h-4 rounded bg-[#2a2a2a] border-none focus:ring-0 accent-[#e68c3a]" 
                />
                <img src={`/icons/${typeId}.png`} className="w-4 h-4 object-contain" alt="icon" />
                {type}
              </label>
            )
          })}
          {allTypes.length === 0 && <p className="text-xs text-gray-600">Loading filters...</p>}
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Layers size={14} /> Floors
        </h3>
        <div className="flex flex-col-reverse gap-2">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setCurrentFloorId(floor.id)}
              className={`text-left px-4 py-3 rounded text-sm transition-colors border ${
                currentFloorId === floor.id 
                  ? 'bg-[#e68c3a]/20 border-[#e68c3a] text-[#e68c3a] font-bold' 
                  : 'bg-[#2a2a2a] border-transparent text-gray-400 hover:bg-[#333] hover:text-white'
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-[#333] flex flex-col gap-2">
        {isLoggedIn ? (
          <div className="flex gap-2">
            <button onClick={openApprovals} className="flex-1 flex items-center justify-center gap-2 bg-[#e68c3a] text-black font-bold py-2 rounded text-xs hover:bg-[#cf7d34] transition-colors">
              Approvals
            </button>
            <button onClick={onLogout} className="flex-1 flex items-center justify-center gap-2 bg-[#7a2c2c] text-white font-bold py-2 rounded text-xs hover:bg-[#8f3636] transition-colors">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={openLogin} className="w-full text-center text-xs text-gray-500 hover:text-white mb-2">
            Editor Login
          </button>
        )}
        
        <button onClick={openChangelog} className="w-full flex items-center justify-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors">
          <History size={16} /> Changelog
        </button>
        <button onClick={openSettings} className="w-full flex items-center justify-center gap-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors">
          <Settings size={16} /> Settings
        </button>

        {/* 🚀 UPDATED FOOTER CREDITS */}
        <div className="mt-3 pt-4 border-t border-[#333] text-[10px] text-gray-400 text-center flex flex-col gap-2">
          <p>
            You can contribute to this project on <a href="https://github.com/KalleLeskinen/KordMap" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">GitHub</a>
          </p>
          <p>
            Locations provided by users on VeryBadScav&apos;s <a href="https://discord.com/invite/AmuWBRMnVQ" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">Discord</a>
          </p>
          <p>
            Maps by <a href="https://github.com/the-hideout/tarkov-dev-svg-maps" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">Shebuka</a>
          </p>
          <p>
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">CC BY-NC-SA 4.0</a>
          </p>
        </div>
      </div>
    </div>
  );
}