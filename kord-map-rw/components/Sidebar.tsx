'use client';

import { Map, Eye, Edit3, Settings, Layers, ListFilter } from 'lucide-react';
import { Floor } from '@/app/page';

interface SidebarProps {
  mode: 'view' | 'edit';
  setMode: (mode: 'view' | 'edit') => void;
  floors: Floor[];
  currentFloorId: string | null;
  setCurrentFloorId: (id: string) => void;
  openSettings: () => void;
}

export default function Sidebar({ mode, setMode, floors, currentFloorId, setCurrentFloorId, openSettings }: SidebarProps) {
  return (
    <div className="w-72 bg-[#1a1a1a] border-r border-[#333] flex flex-col shadow-2xl z-[1000]">
      
      <div className="p-5 border-b border-[#333]">
        <h1 className="text-2xl font-bold tracking-wider uppercase text-white mb-3">Customs</h1>
        <button className="w-full flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] transition-colors py-2 rounded text-sm text-gray-300 font-medium">
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm transition-colors ${mode === 'edit' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Edit3 size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="p-5 border-b border-[#333]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <ListFilter size={14} /> Filters
        </h3>
        <div className="space-y-2">
          {['Spawns', 'Extracts', 'Loot Containers', 'Quest Objectives'].map(filter => (
            <label key={filter} className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer hover:text-white">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-[#2a2a2a] border-none focus:ring-0" />
              {filter}
            </label>
          ))}
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
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold' 
                  : 'bg-[#2a2a2a] border-transparent text-gray-400 hover:bg-[#333] hover:text-white'
              }`}
            >
              {/* 🚀 Cleaned up name rendering */}
              {floor.name}
            </button>
          ))}
          {floors.length === 0 && <p className="text-xs text-gray-600">Loading layers...</p>}
        </div>
      </div>

      <div className="p-4 border-t border-[#333]">
        <button 
          onClick={openSettings}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
        >
          <Settings size={18} /> Settings
        </button>
      </div>
    </div>
  );
}