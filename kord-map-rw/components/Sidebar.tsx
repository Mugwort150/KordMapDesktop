'use client';

import { useState, useEffect, useRef } from 'react';
import { Map, Eye, Edit3, Settings, Layers, ListFilter, History, ChevronDown, ChevronUp } from 'lucide-react';
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
  setHoveredFilter: (filter: string | null) => void;
  hoveredFilter: string | null; 
  markers: any[];               
}

export default function Sidebar({ 
  mapName, onClearMap, mode, setMode, floors, currentFloorId, setCurrentFloorId, 
  openSettings, openLogin, openApprovals, openChangelog, onLogout, isLoggedIn,
  markerTypes, activeFilters, setActiveFilters, setHoveredFilter, hoveredFilter, markers
}: SidebarProps) {

  const allTypes = Object.values(markerTypes).flat();

  // 🚀 RESPONSIVE & SCROLLING STATE
  const [isCompact, setIsCompact] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHoveredHeader, setIsHoveredHeader] = useState(false);
  
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      // Toggle compact mode if the browser window is short
      setIsCompact(window.innerHeight <= 850);
      
      // Measure if the map name is physically wider than its container
      if (textRef.current && containerRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };
    
    // Run on mount and window resize
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapName]);

  const toggleFilter = (typeId: string) => {
    if (activeFilters.includes(typeId)) {
      setActiveFilters(activeFilters.filter(t => t !== typeId));
    } else {
      setActiveFilters([...activeFilters, typeId]);
    }
  };

  return (
    <div id="kord-sidebar" className="w-72 bg-[#1a1a1a] border-r border-[#333] flex flex-col shadow-2xl z-[1000] relative">
      
      {/* 🚀 DYNAMIC HEADER: Wraps normally, but truncates & scrolls-on-hover in compact mode */}
      <div 
        className="p-5 [@media(max-height:850px)]:p-4 border-b border-[#333] flex flex-col [@media(max-height:850px)]:flex-row items-center justify-between gap-3 overflow-hidden"
        onMouseEnter={() => setIsHoveredHeader(true)}
        onMouseLeave={() => setIsHoveredHeader(false)}
      >
        <div 
          ref={containerRef} 
          className="w-full flex-1 overflow-hidden"
          style={{ 
            WebkitMaskImage: (isCompact && isOverflowing && isHoveredHeader) ? 'linear-gradient(to right, transparent 0px, black 16px, black calc(100% - 16px), transparent 100%)' : 'none',
            maskImage: (isCompact && isOverflowing && isHoveredHeader) ? 'linear-gradient(to right, transparent 0px, black 16px, black calc(100% - 16px), transparent 100%)' : 'none' 
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes marquee-continuous {
              0% { transform: translateX(0); }
              100% { transform: translateX(calc(-50% - 1rem)); } 
            }
            .animate-marquee-continuous {
              animation: marquee-continuous 6s linear infinite;
            }
          `}} />
          
          <h1 
            className={`text-2xl [@media(max-height:850px)]:text-xl [@media(max-height:700px)]:text-lg font-bold tracking-wider uppercase text-white mb-3 [@media(max-height:850px)]:mb-0 
              ${isCompact 
                  ? (isOverflowing && isHoveredHeader ? 'flex gap-8 animate-marquee-continuous text-left w-max min-w-full' : 'block truncate text-left w-full') 
                  : 'text-center w-full break-words'
              }`}
          >
            <span ref={textRef} className={isCompact && (!isOverflowing || !isHoveredHeader) ? "truncate block" : "whitespace-nowrap"}>
              {mapName}
            </span>
            {(isCompact && isOverflowing && isHoveredHeader) && <span className="whitespace-nowrap">{mapName}</span>}
          </h1>
        </div>

        <button 
          onClick={onClearMap} 
          className="w-full [@media(max-height:850px)]:w-auto flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] transition-colors py-2 px-3 rounded text-sm [@media(max-height:850px)]:text-xs text-gray-300 font-medium shrink-0"
        >
          <Map size={16} className="[@media(max-height:850px)]:w-3.5 [@media(max-height:850px)]:h-3.5" /> 
          <span className="[@media(max-height:850px)]:hidden">Change Map</span>
          <span className="hidden [@media(max-height:850px)]:inline">Change</span>
        </button>
      </div>

      <div className="p-5 [@media(max-height:850px)]:p-4 border-b border-[#333] shrink-0">
        <div className="flex bg-[#0f0f0f] rounded p-1">
          <button 
            onClick={() => setMode('view')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 [@media(max-height:700px)]:py-1.5 rounded text-sm transition-colors ${mode === 'view' ? 'bg-[#2a2a2a] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Eye size={16} className="[@media(max-height:700px)]:w-3.5 [@media(max-height:700px)]:h-3.5" /> View
          </button>
          <button 
            onClick={() => setMode('edit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 [@media(max-height:700px)]:py-1.5 rounded text-sm transition-colors ${mode === 'edit' ? 'bg-[#e68c3a] text-black font-bold shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Edit3 size={16} className="[@media(max-height:700px)]:w-3.5 [@media(max-height:700px)]:h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* 🚀 COLLAPSIBLE FILTERS: Acts as an accordion in compact mode */}
      <div className="p-4 [@media(max-height:850px)]:p-3 border-b border-[#333] shrink-0">
        <button 
          onClick={() => { if (isCompact) setIsFiltersExpanded(!isFiltersExpanded); }}
          className={`w-full text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex items-center justify-between gap-2 transition-colors ${
            isCompact ? 'cursor-pointer hover:text-gray-300' : 'cursor-default'
          } ${(!isCompact || isFiltersExpanded) ? 'mb-3 [@media(max-height:850px)]:mb-2' : 'mb-0'}`}
        >
          <span className="flex items-center gap-2"><ListFilter size={14} /> Filters</span>
          {isCompact && (
            isFiltersExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
          )}
        </button>
        
        <div className={`space-y-1 overflow-y-auto pr-1 transition-all duration-300 ease-in-out ${
          (!isCompact || isFiltersExpanded) 
            ? 'max-h-48 [@media(max-height:850px)]:max-h-32 [@media(max-height:700px)]:max-h-24 opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          {allTypes.map(type => {
            const typeId = type.toLowerCase().replace(/\s+/g, '-');
            const isActive = activeFilters.includes(typeId);
            const isHovered = hoveredFilter === typeId;
            const markerCount = markers.filter(m => m.type === typeId).length;

            return (
              <div 
                key={typeId} 
                id={`filter-${typeId}`}
                onMouseEnter={() => setHoveredFilter(typeId)}
                onMouseLeave={() => setHoveredFilter(null)}
                onClick={() => toggleFilter(typeId)}
                className={`flex items-center justify-between p-2 [@media(max-height:700px)]:p-1.5 rounded cursor-pointer transition-all duration-150 ${
                  isHovered ? 'bg-[#2a2a2a] border-r-2 border-red-500' : 'hover:bg-[#222] border-r-2 border-transparent'
                } ${isActive ? 'opacity-100' : 'opacity-60'}`}
              >
                <div className="flex items-center gap-3 [@media(max-height:700px)]:gap-2">
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    readOnly
                    className="w-4 h-4 [@media(max-height:700px)]:w-3.5 [@media(max-height:700px)]:h-3.5 rounded bg-[#1a1a1a] border-none focus:ring-0 accent-[#e68c3a] pointer-events-none" 
                  />
                  <img src={`/icons/${typeId}.png`} className="w-7 h-7 [@media(max-height:700px)]:w-5 [@media(max-height:700px)]:h-5 object-contain filter drop-shadow-md" alt="icon" />
                  <span className={`text-sm [@media(max-height:700px)]:text-xs font-medium ${isActive ? 'text-gray-200' : 'text-gray-500'}`}>
                    {type}
                  </span>
                </div>
                
                <span className={`text-[10px] [@media(max-height:700px)]:text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-[#333] text-gray-300' : 'bg-[#1a1a1a] text-gray-600'
                }`}>
                  {markerCount}
                </span>
              </div>
            )
          })}
          {allTypes.length === 0 && <p className="text-xs text-gray-600 px-1">Loading filters...</p>}
        </div>
      </div>

      <div className="p-5 [@media(max-height:850px)]:p-4 flex-1 overflow-y-auto min-h-[100px]">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 [@media(max-height:850px)]:mb-2 flex items-center gap-2">
          <Layers size={14} /> Floors
        </h3>
        <div className="flex flex-col-reverse gap-2 [@media(max-height:850px)]:gap-1.5">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setCurrentFloorId(floor.id)}
              className={`text-left px-4 py-3 [@media(max-height:850px)]:py-2 rounded text-sm transition-colors border ${
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

      <div className="p-4 [@media(max-height:850px)]:p-3 border-t border-[#333] flex flex-col gap-2 shrink-0">
        {isLoggedIn ? (
          <div className="flex flex-col gap-2 [@media(max-height:850px)]:grid [@media(max-height:850px)]:grid-cols-2 [@media(max-height:850px)]:gap-1.5">
            <div className="flex gap-2 [@media(max-height:850px)]:contents">
              <button onClick={openApprovals} className="flex-1 flex items-center justify-center gap-2 bg-[#e68c3a] text-black font-bold py-2 [@media(max-height:850px)]:py-1.5 rounded text-xs hover:bg-[#cf7d34] transition-colors">
                Approvals
              </button>
              <button onClick={onLogout} className="flex-1 flex items-center justify-center gap-2 bg-[#7a2c2c] text-white font-bold py-2 [@media(max-height:850px)]:py-1.5 rounded text-xs hover:bg-[#8f3636] transition-colors">
                Logout
              </button>
            </div>
            <div className="flex gap-2 [@media(max-height:850px)]:contents">
              <button onClick={openChangelog} className="flex-1 flex items-center justify-center gap-2 bg-transparent [@media(max-height:850px)]:bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333] py-2 [@media(max-height:850px)]:py-1.5 rounded text-sm [@media(max-height:850px)]:text-[10px] transition-colors font-medium">
                <History size={16} className="[@media(max-height:850px)]:w-3.5 [@media(max-height:850px)]:h-3.5" /> 
                <span className="hidden [@media(max-height:850px)]:inline">Logs</span>
                <span className="[@media(max-height:850px)]:hidden">Changelog</span>
              </button>
              <button onClick={openSettings} className="flex-1 flex items-center justify-center gap-2 bg-transparent [@media(max-height:850px)]:bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#333] py-2 [@media(max-height:850px)]:py-1.5 rounded text-sm [@media(max-height:850px)]:text-[10px] transition-colors font-medium">
                <Settings size={16} className="[@media(max-height:850px)]:w-3.5 [@media(max-height:850px)]:h-3.5" /> 
                <span>Settings</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col [@media(max-height:850px)]:flex-row gap-2 [@media(max-height:850px)]:gap-1.5">
            <button onClick={openLogin} className="w-full [@media(max-height:850px)]:flex-1 text-center flex items-center justify-center bg-transparent [@media(max-height:850px)]:bg-[#2a2a2a] py-2 [@media(max-height:850px)]:py-1.5 rounded text-xs [@media(max-height:850px)]:text-[10px] font-medium text-gray-500 hover:text-white transition-colors">
              <span className="hidden [@media(max-height:850px)]:inline">Login</span>
              <span className="[@media(max-height:850px)]:hidden">Editor Login</span>
            </button>
            <button onClick={openChangelog} className="w-full [@media(max-height:850px)]:flex-1 flex items-center justify-center gap-3 [@media(max-height:850px)]:gap-1.5 bg-transparent [@media(max-height:850px)]:bg-[#2a2a2a] py-2 [@media(max-height:850px)]:py-1.5 rounded text-sm [@media(max-height:850px)]:text-[10px] font-medium text-gray-400 hover:text-white hover:bg-[#333] transition-colors">
              <History size={16} className="[@media(max-height:850px)]:w-3.5 [@media(max-height:850px)]:h-3.5" /> 
              <span className="hidden [@media(max-height:850px)]:inline">Logs</span>
              <span className="[@media(max-height:850px)]:hidden">Changelog</span>
            </button>
            <button onClick={openSettings} className="w-full [@media(max-height:850px)]:flex-1 flex items-center justify-center gap-3 [@media(max-height:850px)]:gap-1.5 bg-transparent [@media(max-height:850px)]:bg-[#2a2a2a] py-2 [@media(max-height:850px)]:py-1.5 rounded text-sm [@media(max-height:850px)]:text-[10px] font-medium text-gray-400 hover:text-white hover:bg-[#333] transition-colors">
              <Settings size={16} className="[@media(max-height:850px)]:w-3.5 [@media(max-height:850px)]:h-3.5" /> 
              <span>Settings</span>
            </button>
          </div>
        )}

        {/* 🚀 FOOTER CREDITS WITH AUTO-VERSIONING */}
        <div className="mt-3 [@media(max-height:850px)]:mt-1.5 pt-4 [@media(max-height:850px)]:pt-2 border-t border-[#333] text-[10px] [@media(max-height:850px)]:text-[9px] [@media(max-height:700px)]:text-[8px] text-gray-400 text-center flex flex-col gap-2 [@media(max-height:850px)]:gap-1 [@media(max-height:700px)]:gap-0.5 [@media(max-height:700px)]:leading-tight">
          <p>You can contribute to this project on <a href="https://github.com/KalleLeskinen/KordMap" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">GitHub</a></p>
          <p>Locations provided by users on VeryBadScav&apos;s <a href="https://discord.com/invite/AmuWBRMnVQ" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">Discord</a></p>
          <p>Maps by <a href="https://github.com/the-hideout/tarkov-dev-svg-maps" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">Shebuka</a></p>
          <p><a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" className="text-[#e68c3a] hover:text-[#cf7d34] transition-colors font-semibold">CC BY-NC-SA 4.0</a></p>
          
          {/* 🚀 Auto-updating version tag (shows 'dev' locally) */}
          <p className="mt-1 text-[#666] font-mono">
            v{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev'}
          </p>
        </div>
      </div>
    </div>
  );
}