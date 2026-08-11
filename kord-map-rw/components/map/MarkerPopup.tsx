'use client';

import { useState } from 'react';

function PopupImage({ src, onClick }: { src: string; onClick: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <div className="relative w-full h-32 bg-[#0a0a0a] border border-[#333] rounded overflow-hidden mt-1 cursor-zoom-in group" onClick={onClick}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] animate-pulse">
          <svg className="w-6 h-6 text-gray-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      )}
      <img src={src} loading="lazy" alt="Location" onLoad={() => setIsLoaded(true)} className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`} />
    </div>
  );
}

export default function MarkerPopup({ marker, isGhost, mode, editorPassword, setEnlargedImage, handleEditClick, handleDeleteClick }: any) {
  if (isGhost) return null;

  return (
    <div className="flex flex-col w-full bg-[#161616] text-white select-none">
      <div className="px-4 py-3 border-b border-[#333] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src={`/icons/${marker.type}.png`} alt="icon" className="w-5 h-5 object-contain" />
          <h3 className="font-bold text-[13px] uppercase tracking-wider text-[#e68c3a] flex items-center gap-2">
            {marker.type.replace(/-/g, ' ')}
            {!marker.approved && <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-600 text-white font-bold tracking-wider">PENDING APPROVAL</span>}
          </h3>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm text-gray-200 leading-snug">
          {marker.title}
          {marker.description && <span className="block mt-1 text-gray-400">{marker.description}</span>}
        </p>
        <div className="flex flex-col gap-1 border-t border-[#333] pt-2 mt-1">
            {marker.submitter && <p className="text-[10px] text-gray-400 font-medium">By: {marker.submitter}</p>}
            <p className="text-[10px] text-gray-600 font-medium">{new Date(marker.createdAt).toLocaleDateString()}</p>
        </div>
        
        {marker.imageUrl && <PopupImage src={marker.imageUrl} onClick={() => setEnlargedImage(marker.imageUrl)} />}
        
        {mode === 'edit' && (
          <div className="flex gap-2 mt-2">
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleEditClick(marker); }} className="flex-1 bg-[#222] border border-[#333] hover:bg-[#333] py-2 rounded text-[11px] font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-colors">Edit</button>
            {editorPassword && (
              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteClick(marker.id); }} className="flex-1 bg-[#7a2c2c] hover:bg-[#8f3636] py-2 rounded text-[11px] font-bold uppercase tracking-wider text-white transition-colors">Delete</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}