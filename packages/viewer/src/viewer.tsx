import React, { useRef, useEffect } from 'react';
import { CanvasKitRenderer, Scene } from '@canvas-kit/core';

interface ViewerProps {
  width: number;
  height: number;
  scene?: Scene;
}

export const Viewer: React.FC<ViewerProps> = ({ width, height, scene }: ViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && scene) {
      console.log('Rendering scene with objects:', scene.getObjects());
      const renderer = new CanvasKitRenderer(canvasRef.current);
      renderer.render(scene);
    }
  }, [scene, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      data-testid="canvas"
      style={{ border: '1px solid #ccc' }}
    />
  );
};