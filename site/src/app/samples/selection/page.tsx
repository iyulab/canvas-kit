'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Scene, type DrawingObject } from '@canvas-kit/core';

// Legacy SelectableViewer
const SelectableViewer = dynamic(() => import('@canvas-kit/designer').then(mod => mod.SelectableViewer), {
    ssr: false,
});

// New Konva Designer
const KonvaDesigner = dynamic(() => import('@canvas-kit/designer').then(mod => mod.KonvaDesigner), {
    ssr: false,
});

export default function SelectionPage() {
    const [scene, setScene] = useState<Scene | null>(null);
    const [selectedObjects, setSelectedObjects] = useState<DrawingObject[]>([]);
    const [useKonva, setUseKonva] = useState(true);

    useEffect(() => {
        const newScene = new Scene();

        // Add various objects for selection testing
        newScene.add({
            id: 'rect1',
            type: 'rectangle',
            x: 50,
            y: 50,
            width: 80,
            height: 60,
            fill: '#ff6b6b',
            stroke: '#d63031',
            strokeWidth: 2
        });

        newScene.add({
            id: 'rect2',
            type: 'rectangle',
            x: 200,
            y: 80,
            width: 100,
            height: 40,
            fill: '#74b9ff',
            stroke: '#0984e3',
            strokeWidth: 2
        });

        newScene.add({
            id: 'circle1',
            type: 'circle',
            x: 100,
            y: 200,
            radius: 30,
            fill: '#55a3ff',
            stroke: '#2d3436',
            strokeWidth: 2
        });

        newScene.add({
            id: 'circle2',
            type: 'circle',
            x: 250,
            y: 180,
            radius: 25,
            fill: '#fd79a8',
            stroke: '#e84393',
            strokeWidth: 2
        });

        newScene.add({
            id: 'text1',
            type: 'text',
            x: 150,
            y: 260,
            text: 'Click to Select!',
            fontSize: 16,
            fill: '#2d3436'
        });

        setScene(newScene);
    }, []);

    const handleSelectionChange = (objects: DrawingObject[]) => {
        setSelectedObjects(objects);
    };

    const clearSelection = () => {
        setSelectedObjects([]);
    };

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
                    Interactive object selection with visual feedback and multi-selection support.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-3">Interactive Canvas</h2>
                    <p className="text-gray-600 mb-4">
                        Click on objects to select them. Use Ctrl+Click for multi-selection. Press Escape to clear selection.
                    </p>

                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                        <SelectableViewer
                            scene={scene}
                            width={500}
                            height={350}
                            onSelectionChange={handleSelectionChange}
                            enableMultiSelect={true}
                            className="border border-gray-200"
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3">Selection Info</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="mb-2">
                                <strong>Selected Objects:</strong> {selectedObjects.length}
                            </p>
                            {selectedObjects.length > 0 && (
                                <div className="mt-3">
                                    <h4 className="font-medium mb-2">Selected Items:</h4>
                                    <ul className="space-y-1">
                                        {selectedObjects.map((obj, index) => (
                                            <li key={obj.id || index} className="text-sm bg-white p-2 rounded border">
                                                <span className="font-medium">{obj.id || `Object ${index + 1}`}</span> - {obj.type}
                                                <br />
                                                <span className="text-gray-600">
                                                    Position: ({obj.x}, {obj.y})
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-3">Controls</h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <button
                                onClick={clearSelection}
                                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Clear Selection
                            </button>

                            <div className="text-sm text-gray-600">
                                <h4 className="font-medium mb-2">Keyboard Shortcuts:</h4>
                                <ul className="space-y-1">
                                    <li>• <strong>Escape:</strong> Clear selection</li>
                                    <li>• <strong>Ctrl+A:</strong> Select all</li>
                                    <li>• <strong>Ctrl+Click:</strong> Multi-select</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Features Demonstrated</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ul className="space-y-2 text-sm">
                            <li>✅ <strong>Single Selection:</strong> Click on any object</li>
                            <li>✅ <strong>Multi Selection:</strong> Ctrl+Click to add/remove from selection</li>
                            <li>✅ <strong>Visual Feedback:</strong> Selected objects show blue bounding boxes</li>
                        </ul>
                        <ul className="space-y-2 text-sm">
                            <li>✅ <strong>Hit Testing:</strong> Accurate click detection for all object types</li>
                            <li>✅ <strong>Keyboard Shortcuts:</strong> Escape to clear, Ctrl+A to select all</li>
                            <li>✅ <strong>Event Handling:</strong> Selection change callbacks</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
