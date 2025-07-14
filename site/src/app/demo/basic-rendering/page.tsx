'use client';

import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { useEffect, useState } from 'react';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => mod.Viewer), {
  ssr: false,
});

export default function BasicRenderingDemo() {
  const [scene, setScene] = useState<Scene | undefined>();

  useEffect(() => {
    const newScene = new Scene();
    newScene.add({ type: 'rect', x: 10, y: 10, width: 50, height: 50, color: 'blue' });
    newScene.add({ type: 'circle', x: 100, y: 70, radius: 30, color: 'red' });
    setScene(newScene);
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-bold mb-4">Basic Rendering</h1>
      <Viewer width={800} height={600} scene={scene} />
    </main>
  );
}
