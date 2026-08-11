'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import DOMPurify from 'dompurify'; // 🛡️ SECURITY IMPORT
import { Floor } from '@/app/page';
import { bounds, NATIVE_SIZE } from '../Map';

export default function SvgMapLayer({ url, hardwareAcceleration, currentFloorId, onFloorsLoaded, setAllFloors, brightness }: any) {
  const map = useMap();
  const svgRef = useRef<SVGElement | null>(null);
  const floorsRef = useRef<Floor[]>([]);

  useEffect(() => {
    let isMounted = true;
    let svgLayer: L.SVGOverlay | null = null;
    
    fetch(url).then((res) => res.text()).then((rawSvgText) => {
        if (!isMounted) return;

        const cleanSvgText = DOMPurify.sanitize(rawSvgText, {
          USE_PROFILES: { svg: true, svgFilters: true }, // Allow SVG tags
          FORBID_TAGS: ['script', 'style'], // Strictly forbid scripting
          FORBID_ATTR: ['onmouseover', 'onload', 'onerror'] // Block inline events
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(cleanSvgText, "image/svg+xml");
        const svgElement = doc.documentElement as unknown as SVGElement;
        if (!svgElement.getAttribute("viewBox")) svgElement.setAttribute("viewBox", `0 0 ${NATIVE_SIZE} ${NATIVE_SIZE}`);
        svgElement.setAttribute("shape-rendering", "optimizeSpeed");
        svgElement.style.pointerEvents = 'none';
        
        let groups = Array.from(svgElement.children).filter(el => el.tagName.toLowerCase() === 'g');
        if (groups.length === 1) {
          const innerGroups = Array.from(groups[0].children).filter(el => el.tagName.toLowerCase() === 'g');
          if (innerGroups.length > 0) groups = innerGroups;
        }

        const extractedFloors: Floor[] = groups.map((g, index) => {
          const rawId = g.getAttribute('id') || `Layer_${index}`;
          const name = rawId.replace(/_x20_/g, ' ').replace(/_/g, ' ');
          return { id: rawId, name };
        });

        floorsRef.current = extractedFloors;
        svgRef.current = svgElement;
        setAllFloors(extractedFloors); 

        svgLayer = L.svgOverlay(svgElement, bounds, { interactive: false });
        svgLayer.addTo(map);

        const uiFloors = extractedFloors.filter(f => f.name.toLowerCase().trim() !== 'ground level');
        onFloorsLoaded(uiFloors);
      });
    return () => { isMounted = false; if (svgLayer) map.removeLayer(svgLayer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, url]);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.willChange = hardwareAcceleration ? 'transform' : 'auto';
  }, [hardwareAcceleration]);

  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.style.filter = `brightness(${brightness}%)`;
  }, [brightness]);

  useEffect(() => {
    if (!svgRef.current || !currentFloorId || floorsRef.current.length === 0) return;
    const floors = floorsRef.current;
    const currentIndex = floors.findIndex(f => f.id === currentFloorId);
    if (currentIndex === -1) return;

    const isFirstFloorSelected = floors[currentIndex].name.toLowerCase().includes('first floor');

    floors.forEach((floor, index) => {
      const gNode = svgRef.current!.querySelector(`g[id="${CSS.escape(floor.id)}"]`) as SVGGElement;
      if (!gNode) return;
      
      gNode.style.display = 'block'; 
      gNode.style.transition = 'opacity 0.4s ease-in-out, filter 0.4s ease-in-out, visibility 0.4s ease-in-out';

      if (floor.name.toLowerCase().trim() === 'ground level' && isFirstFloorSelected) {
        gNode.style.visibility = 'visible'; gNode.style.opacity = '1'; gNode.style.filter = 'none'; return; 
      }
      
      if (index > currentIndex) { 
        gNode.style.visibility = 'hidden'; gNode.style.opacity = '0'; gNode.style.filter = 'none';
      } else if (index === currentIndex) { 
        gNode.style.visibility = 'visible'; gNode.style.opacity = '1'; gNode.style.filter = 'none'; 
      } else if (index < currentIndex) { 
        gNode.style.visibility = 'visible'; gNode.style.opacity = '0.35'; gNode.style.filter = 'brightness(0.25) grayscale(0.6)'; 
      }
    });
  }, [currentFloorId]);
  
  return null;
}