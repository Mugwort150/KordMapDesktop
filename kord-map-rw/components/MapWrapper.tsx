'use client';

import { MapSettings, Floor } from '@/app/page';
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/Map'), { ssr: false });

interface MapWrapperProps {
  mapName: string;
  mapUrl: string;
  mode: 'view' | 'edit';
  settings: MapSettings;
  currentFloorId: string | null;
  setCurrentFloorId: (id: string) => void;
  onFloorsLoaded: (floors: Floor[]) => void;
  editorPassword?: string;
  markers: any[];
  setMarkers: any;
  markerTypes: Record<string, string[]>;
  activeFilters: string[];
  flyToMarker: any;
  setFlyToMarker: any;
  addLocalPendingId: (id: string) => void;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <DynamicMap {...props} />;
}