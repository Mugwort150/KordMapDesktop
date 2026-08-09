'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { MapSettings } from '@/app/page';

interface SettingsModalProps {
  settings: MapSettings;
  saveSettings: (s: MapSettings) => void;
  close: () => void;
}

export default function SettingsModal({ settings, saveSettings, close }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<MapSettings>(settings);

  const handleSave = () => {
    saveSettings(localSettings);
    close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="flex justify-between items-center p-5 border-b border-[#333]">
          <h2 className="text-lg font-bold">Map Settings</h2>
          <button onClick={close} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
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
        </div>

        <div className="p-4 border-t border-[#333] flex justify-end gap-3 bg-[#111]">
          <button onClick={close} className="px-4 py-2 rounded text-sm text-gray-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-700 font-medium shadow">Save Changes</button>
        </div>
      </div>
    </div>
  );
}