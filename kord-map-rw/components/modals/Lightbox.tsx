'use client';

import { useState } from 'react';

interface LightboxProps {
  src: string;
  onClose: () => void;
}

export default function Lightbox({ src, onClose }: LightboxProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div 
      className="fixed inset-0 z-[4000] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out backdrop-blur-sm" 
      onClick={onClose}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-10 h-10 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      <img 
        src={src} 
        onLoad={() => setIsLoaded(true)}
        className={`max-w-full max-h-full object-contain rounded shadow-2xl transition-all duration-300 ${
          isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`} 
        alt="Enlarged Location" 
      />
    </div>
  );
}