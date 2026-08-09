'use client';

import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-[#121212] text-white">
      Loading Kord Map...
    </div>
  ),
});

export default function MapWrapper() {
  return <DynamicMap />;
}