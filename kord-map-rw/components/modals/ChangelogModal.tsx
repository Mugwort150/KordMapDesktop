'use client';

import { formatDate } from '@/lib/utils';

interface ChangelogModalProps {
  changelog: any[];
  setIsChangelogOpen: (val: boolean) => void;
  setCurrentFloorId: (id: string) => void;
  setFlyToMarker: (marker: any) => void;
  editorPassword?: string;
}

export default function ChangelogModal({ 
  changelog, setIsChangelogOpen, setCurrentFloorId, setFlyToMarker, editorPassword 
}: ChangelogModalProps) {
  return (
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
              <button 
                onClick={() => { setCurrentFloorId(m.floorId); setFlyToMarker(m); setIsChangelogOpen(false); }} 
                className="bg-[#444] hover:bg-[#555] px-3 py-1.5 rounded text-xs font-bold transition-colors"
              >
                Show on Map
              </button>
            </div>
          ))}
          {changelog.length === 0 && <p className="text-gray-500 text-sm italic">No records found.</p>}
        </div>
      </div>
    </div>
  );
}