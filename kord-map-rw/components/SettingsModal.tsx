'use client';

import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { MapSettings } from '@/app/page';
import { importLegacyMarkers } from '@/app/actions/markers';

interface SettingsModalProps {
  settings: MapSettings;
  saveSettings: (s: MapSettings) => void;
  close: () => void;
  editorPassword?: string;
  mapName: string;
}

export default function SettingsModal({ 
  mapName, 
  settings, 
  saveSettings, 
  close, 
  editorPassword // Extract it here so the rest of the file can see it
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<MapSettings>(settings);
  
  // 🚀 Import Tool State
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const handleSave = () => {
    saveSettings(localSettings);
    close();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.points && Array.isArray(json.points)) {
          // Map legacy schema to our new Prisma schema
          const mapped = json.points.map((p: any) => ({
            title: p.details || 'Imported Marker',
            description: 'Legacy Import',
            lat: parseFloat(p.y),
            lng: parseFloat(p.x),
            type: p.iconType,
            floorId: p.floor,
            imageUrl: p.image || null,
            submitter: 'Admin Import',
            mapName: json.map || mapName // 🚀 Fallback to current map if json.map is missing
          }));
          setPreviewData(mapped);
        } else {
          alert("Invalid JSON schema: Missing 'points' array.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!previewData || !editorPassword) return;
    setIsImporting(true);

    // 🚀 CHUNKING SYSTEM
    // Base64 images are massive. NextJS crashes if we send > 1MB at once.
    // We slice the data into chunks of 5 markers to ensure we never hit the limit!
    const CHUNK_SIZE = 5; 
    
    for (let i = 0; i < previewData.length; i += CHUNK_SIZE) {
      const chunk = previewData.slice(i, i + CHUNK_SIZE);
      const res = await importLegacyMarkers(chunk, editorPassword);
      
      if (!res.success) {
        alert("Import failed mid-way through chunking.");
        setIsImporting(false);
        return;
      }
      setImportProgress(Math.round(((i + CHUNK_SIZE) / previewData.length) * 100));
    }

    setIsImporting(false);
    alert(`Successfully imported ${previewData.length} markers!`);
    window.location.reload(); // Refresh the map to show the new markers
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex justify-between items-center p-5 border-b border-[#333]">
          <h2 className="text-lg font-bold">Map Settings</h2>
          <button onClick={close} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Zoom Step Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Zoom Step (Mouse Wheel Sensitivity)
            </label>
            <input 
              type="range" min="0.1" max="2" step="0.1"
              value={localSettings.zoomStep}
              onChange={(e) => setLocalSettings({...localSettings, zoomStep: parseFloat(e.target.value)})}
              className="w-full accent-blue-600"
            />
            <div className="text-xs text-gray-500 text-right mt-1">{localSettings.zoomStep}x multiplier</div>
          </div>

          {/* Icon Scale Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Marker Icon Scale
            </label>
            <input 
              type="range" min="0.5" max="3" step="0.1"
              value={localSettings.iconScale || 1}
              onChange={(e) => setLocalSettings({...localSettings, iconScale: parseFloat(e.target.value)})}
              className="w-full accent-blue-600"
            />
            <div className="text-xs text-gray-500 text-right mt-1">{localSettings.iconScale || 1}x</div>
          </div>

          {/* Hardware Acceleration Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Hardware Acceleration</p>
              <p className="text-xs text-gray-500">Uses GPU to pan the map (Recommended)</p>
            </div>
            <button 
              onClick={() => setLocalSettings({...localSettings, hardwareAcceleration: !localSettings.hardwareAcceleration})}
              className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.hardwareAcceleration ? 'bg-blue-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localSettings.hardwareAcceleration ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* 🚀 ADMIN IMPORT TOOL */}
          {editorPassword && (
            <div className="pt-6 border-t border-[#333]">
              <h3 className="text-sm font-bold text-[#e68c3a] uppercase mb-3 flex items-center gap-2">
                <Upload size={16} /> Legacy Map Import
              </h3>
              
              {!previewData ? (
                <div>
                  <input type="file" accept=".json" id="legacy-import" className="hidden" onChange={handleFileUpload} />
                  <label htmlFor="legacy-import" className="w-full bg-[#2a2a2a] hover:bg-[#333] border border-[#444] border-dashed text-gray-400 hover:text-white py-6 rounded flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <Upload size={24} className="mb-2" />
                    <span className="text-sm font-medium">Select Legacy JSON File</span>
                  </label>
                </div>
              ) : (
                <div className="bg-[#2a2a2a] border border-[#444] p-3 rounded">
                  <p className="text-sm font-bold text-white mb-2">Preview: {previewData.length} markers found</p>
                  
                  {/* Miniature Preview List */}
                  <div className="max-h-32 overflow-y-auto space-y-2 mb-3 pr-2 border-b border-[#444] pb-2">
                    {previewData.slice(0, 20).map((m, i) => (
                      <div key={i} className="bg-[#1f1f1f] p-2 rounded text-xs flex justify-between items-center border border-[#333]">
                        <span className="truncate flex-1 font-medium text-gray-200">{m.title}</span>
                        <span className="text-[#e68c3a] font-bold uppercase ml-2 text-[10px]">{m.type.replace(/-/g, ' ')}</span>
                      </div>
                    ))}
                    {previewData.length > 20 && <p className="text-xs text-gray-500 text-center italic mt-2">...and {previewData.length - 20} more</p>}
                  </div>
                  
                  {isImporting ? (
                    <div className="w-full bg-[#111] rounded h-6 relative overflow-hidden flex items-center justify-center border border-[#333]">
                      <div className="absolute top-0 left-0 bottom-0 bg-blue-600 transition-all duration-300" style={{ width: `${importProgress}%` }} />
                      <span className="relative z-10 text-[10px] font-bold text-white">Importing... {importProgress}%</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setPreviewData(null)} className="flex-1 bg-[#333] hover:bg-[#444] py-2 rounded text-xs transition-colors font-bold">Cancel</button>
                      <button onClick={handleImport} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-xs font-bold transition-colors">Confirm Import</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-4 border-t border-[#333] flex justify-end gap-3 bg-[#111]">
          <button onClick={close} className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white font-bold transition-colors hover:bg-[#222]">Close</button>
          <button onClick={handleSave} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 font-medium shadow text-white transition-colors">Save Settings</button>
        </div>
      </div>
    </div>
  );
}