'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => ({ default: mod.Viewer })), {
    ssr: false,
});

export default function SelectionPage() {
    const [scene, setScene] = useState<Scene | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    useEffect(() => {
        const newScene = new Scene();

        // Add test objects
        newScene.add({
            type: 'rect',
            x: 50,
            y: 50,
            width: 80,
            height: 60,
            fill: '#ff6b6b',
            stroke: '#d63031',
            strokeWidth: 2
        });

        newScene.add({
            type: 'rect',
            x: 200,
            y: 80,
            width: 100,
            height: 40,
            fill: '#74b9ff',
            stroke: '#0984e3',
            strokeWidth: 2
        });

        newScene.add({
            type: 'circle',
            x: 100,
            y: 200,
            radius: 30,
            fill: '#55a3ff',
            stroke: '#2d3436',
            strokeWidth: 2
        });

        setScene(newScene);
    }, []);

    if (!scene) {
        return <div>Loading scene...</div>;
    }

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← Back to Samples
                </Link>
                <h1 className="text-3xl font-bold mb-2">✨ Selection System Sample</h1>
                <p className="text-gray-600 mb-4">
                    Object selection demonstration with visual feedback.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-3">Canvas View</h2>
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                        <Viewer scene={scene} width={400} height={300} />
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3">Objects</h2>
                    <div className="space-y-2">
                        {scene.getObjects().map((obj: any, index: number) => (
                            <button
                                key={index}
                                onClick={() => setSelectedIndex(index === selectedIndex ? null : index)}
                                className={`w-full text-left p-3 rounded border transition-colors ${selectedIndex === index
                                        ? 'bg-blue-100 border-blue-300'
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: (obj as any).fill || '#ccc' }}
                                    />
                                    <div>
                                        <div className="font-medium">
                                            {obj.type} #{index + 1}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Position: ({obj.x}, {obj.y})
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedIndex !== null && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold mb-2">Selected Object</h3>
                            <div className="text-sm">
                                <div>Type: {scene.getObjects()[selectedIndex].type}</div>
                                <div>Position: ({scene.getObjects()[selectedIndex].x}, {scene.getObjects()[selectedIndex].y})</div>
                                <div>Fill: {(scene.getObjects()[selectedIndex] as any).fill}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
