'use client';

import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { useEffect, useState } from 'react';

const Designer = dynamic(() => import('@canvas-kit/designer').then(mod => mod.Designer), {
  ssr: false,
});

export default function DesignerDemo() {
  const [scene, setScene] = useState<Scene | undefined>();

  useEffect(() => {
    const newScene = new Scene();
    newScene.add({ type: 'rect', x: 10, y: 10, width: 50, height: 50, color: 'blue' });
    newScene.add({ type: 'circle', x: 100, y: 70, radius: 30, color: 'red' });
    setScene(newScene);
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-bold mb-4">Designer Demo</h1>
      {scene && <Designer width={800} height={600} scene={scene} />}
    </main>
  );
}
