import React from 'react';
import { ITEM_DISPLAY_NAMES, RESOURCE_COLORS } from '../types';

interface HarvestingIndicatorProps {
  isHarvesting: boolean;
  harvestTarget: { x: number; y: number; type: string } | null;
  autoPathLength: number;
}

export const HarvestingIndicator: React.FC<HarvestingIndicatorProps> = ({
  isHarvesting,
  harvestTarget,
  autoPathLength,
}) => {
  if (!isHarvesting && autoPathLength === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 14px',
        background: 'rgba(11, 14, 18, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        color: '#c8ccd0',
        fontSize: 13,
        fontFamily: 'monospace',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      {isHarvesting && harvestTarget ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: RESOURCE_COLORS[harvestTarget.type as keyof typeof RESOURCE_COLORS] || '#888',
              boxShadow: `0 0 6px ${RESOURCE_COLORS[harvestTarget.type as keyof typeof RESOURCE_COLORS] || '#888'}`,
            }}
          />
          <span style={{ color: '#e0e0e0' }}>Harvesting: </span>
          <span style={{ color: RESOURCE_COLORS[harvestTarget.type as keyof typeof RESOURCE_COLORS] || '#ccc' }}>
            {ITEM_DISPLAY_NAMES[harvestTarget.type as keyof typeof ITEM_DISPLAY_NAMES] || harvestTarget.type}
          </span>
        </>
      ) : (
        <>
          <span style={{ color: '#64b5f6' }}>Moving</span>
          <span style={{ color: '#555' }}>({autoPathLength} tiles)</span>
        </>
      )}
    </div>
  );
};
