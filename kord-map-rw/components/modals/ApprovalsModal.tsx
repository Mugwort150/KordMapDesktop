'use client';

import { approveMarker, deleteMarker, getMarkers } from '@/app/actions/markers';

interface ApprovalsModalProps {
  pendingQueue: any[];
  setPendingQueue: React.Dispatch<React.SetStateAction<any[]>>;
  markers: any[];
  setMarkers: React.Dispatch<React.SetStateAction<any[]>>;
  selectedMapName: string;
  editorPassword: string;
  setIsApprovalsOpen: (val: boolean) => void;
  setEnlargedImage: (url: string) => void;
  setPreviewMarker: (marker: any) => void;
}

export default function ApprovalsModal({
  pendingQueue, setPendingQueue, markers, setMarkers, selectedMapName,
  editorPassword, setIsApprovalsOpen, setEnlargedImage, setPreviewMarker
}: ApprovalsModalProps) {
  
  return (
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
                      <img 
                        src={m.imageUrl} alt="thumb" loading="lazy" 
                        className="w-12 h-12 rounded object-cover border border-[#444] cursor-zoom-in hover:opacity-80" 
                        onClick={() => setEnlargedImage(m.imageUrl)} 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-[#1f1f1f] border border-[#444] flex items-center justify-center text-xs text-gray-600">No Img</div>
                    )}
                    <div>
                      <h3 className="font-bold text-[#e68c3a] uppercase text-xs flex items-center gap-2">
                        {m.type.replace(/-/g, ' ')}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] text-white font-bold tracking-wider ${m.isDeletion ? 'bg-red-600' : m.originalId ? 'bg-blue-600' : 'bg-green-600'}`}>
                          {m.isDeletion ? 'DELETION' : m.originalId ? 'EDIT' : 'NEW'}
                        </span>
                      </h3>
                      <p className="font-bold text-sm text-white">{m.title}</p>
                      {m.submitter && <p className="text-xs text-gray-400">By: {m.submitter}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setPreviewMarker(m)} className="bg-[#444] hover:bg-[#555] px-3 py-1.5 rounded text-xs font-bold text-white transition-colors">Show on Map</button>
                    <button 
                      onClick={async () => {
                        await approveMarker(m.id, editorPassword);
                        setPendingQueue(q => q.filter(x => x.id !== m.id));
                        getMarkers(selectedMapName).then(setMarkers); 
                      }} 
                      className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs font-bold text-white transition-colors"
                    >Approve</button>
                    <button 
                      onClick={async () => {
                        await deleteMarker(m.id, editorPassword);
                        setPendingQueue(q => q.filter(x => x.id !== m.id));
                      }} 
                      className="bg-[#7a2c2c] hover:bg-[#8f3636] px-3 py-1.5 rounded text-xs font-bold text-white transition-colors"
                    >Reject</button>
                  </div>
                </div>
                
                {m.isDeletion ? (
                  <div className="mt-3 p-2 bg-[#1f1f1f] rounded border border-red-900/50 text-xs space-y-1">
                    <p className="text-red-400 font-bold">User requested to permanently delete this marker.</p>
                  </div>
                ) : orig && (
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
          {pendingQueue.length === 0 && <p className="text-gray-500 text-sm italic">No markers pending approval.</p>}
        </div>
      </div>
    </div>
  );
}