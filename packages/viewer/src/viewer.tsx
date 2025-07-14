import React, { useRef, useEffect } from 'react';
import { CanvasKitRenderer, Scene } from '@canvas-kit/core';

interface ViewerProps {
  width: number;
  height: number;
  scene?: Scene;
}

export const Viewer: React.FC<ViewerProps> = ({ width, height, scene }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && scene) {
      const renderer = new CanvasKitRenderer(canvasRef.current);
      renderer.render(scene);
    }
  }, [scene]);

  return <canvas ref={canvasRef} width={width} height={height} data-testid="canvas" />;
};