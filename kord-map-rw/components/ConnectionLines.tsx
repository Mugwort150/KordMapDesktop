'use client';

import { useState, useEffect } from 'react';

interface ConnectionLinesProps {
  hoveredFilter: string | null;
}

export default function ConnectionLinesOverlay({ hoveredFilter }: ConnectionLinesProps) {
  const [lines, setLines] = useState<{x1: number, y1: number, x2: number, y2: number, isGhost: boolean}[]>([]);

  useEffect(() => {
    if (!hoveredFilter) { 
      setLines([]); 
      return; 
    }
    
    let animationFrameId: number;
    
    const updateLines = () => {
      const filterEl = document.getElementById(`filter-${hoveredFilter}`);
      const sidebarEl = document.getElementById('kord-sidebar');
      if (!filterEl || !sidebarEl) return;

      const sidebarRect = sidebarEl.getBoundingClientRect();
      const filterIconEl = filterEl.querySelector('img');
      const startRect = (filterIconEl || filterEl).getBoundingClientRect();
      
      const startX = sidebarRect.right;
      const startY = startRect.top + startRect.height / 2;

      const markerEls = document.querySelectorAll(`.marker-type-${hoveredFilter}`);
      const newLines = Array.from(markerEls).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          x1: startX, 
          y1: startY, 
          x2: rect.left + rect.width / 2, 
          y2: rect.top + rect.height / 2,
          isGhost: el.classList.contains('is-ghost')
        };
      });
      setLines(newLines);
      animationFrameId = requestAnimationFrame(updateLines);
    };
    
    updateLines();
    return () => cancelAnimationFrame(animationFrameId);
  }, [hoveredFilter]);

  if (!hoveredFilter || lines.length === 0) return null;

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-[1500]">
      {lines.map((line, i) => {
        const elbowX = line.x1 + 22; 
        return (
          <path 
            key={i} 
            d={`M ${line.x1} ${line.y1} L ${elbowX} ${line.y1} L ${line.x2} ${line.y2}`} 
            fill="none" 
            stroke="#ef4444" 
            strokeWidth={line.isGhost ? "1.5" : "2"} 
            strokeOpacity={line.isGhost ? "0.25" : "0.9"} 
            strokeDasharray={line.isGhost ? "6,6" : "none"} 
            strokeLinejoin="round" 
          />
        );
      })}
    </svg>
  );
}