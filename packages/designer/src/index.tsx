import React from 'react';
import { Viewer } from '@canvas-kit/viewer';
import type { Scene } from '@canvas-kit/core';

interface DesignerProps {
  width: number;
  height: number;
  scene: Scene;
}

export const Designer: React.FC<DesignerProps> = ({ width, height, scene }) => {
  return (
    <div style={{ position: 'relative', width, height }}>
      <Viewer width={width} height={height} scene={scene} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // Initially, the overlay does not capture mouse events
        }}
      >
        {/* Interaction layer for selection, resizing, etc. */}
      </div>
    </div>
  );
};
