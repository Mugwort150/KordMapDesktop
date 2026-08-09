'use client';

import { MapSettings, Floor } from '@/app/page';
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/Map'), { ssr: false });

interface MapWrapperProps {
  mode: 'view' | 'edit';
  settings: MapSettings;
  currentFloorId: string | null;
  onFloorsLoaded: (floors: Floor[]) => void;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <DynamicMap {...props} />;
}