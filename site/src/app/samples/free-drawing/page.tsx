'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => ({ default: mod.Viewer })), {
    ssr: false,
});

interface DrawingSettings {
    strokeColor: string;
    strokeWidth: number;
    tension: number;
    mode: 'pen' | 'brush' | 'eraser';
}

export default function FreeDrawingPage() {
    const [scene, setScene] = useState<Scene>(new Scene());
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<number[]>([]);
    const [settings, setSettings] = useState<DrawingSettings>({
        strokeColor: '#000000',
        strokeWidth: 3,
        tension: 0.5,
        mode: 'pen'
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const getCanvasCoordinates = useCallback((event: React.MouseEvent | MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };

        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }, []);

    const startDrawing = useCallback((event: React.MouseEvent) => {
        if (settings.mode === 'eraser') return;

        const { x, y } = getCanvasCoordinates(event);
        setIsDrawing(true);
        setCurrentPath([x, y]);
    }, [getCanvasCoordinates, settings.mode]);

    const draw = useCallback((event: React.MouseEvent) => {
        if (!isDrawing || settings.mode === 'eraser') return;

        const { x, y } = getCanvasCoordinates(event);
        setCurrentPath(prev => [...prev, x, y]);
    }, [isDrawing, getCanvasCoordinates, settings.mode]);

    const stopDrawing = useCallback(() => {
        if (!isDrawing || currentPath.length < 4) {
            setIsDrawing(false);
            setCurrentPath([]);
            return;
        }

        // Add the path to scene
        const newScene = new Scene();
        scene.getObjects().forEach(obj => newScene.add(obj));

        newScene.add({
            type: 'path',
            x: 0,
            y: 0,
            points: currentPath,
            stroke: settings.strokeColor,
            strokeWidth: settings.strokeWidth,
            tension: settings.tension,
            closed: false
        });

        setScene(newScene);
        setIsDrawing(false);
        setCurrentPath([]);
    }, [isDrawing, currentPath, scene, settings]);

    const clearCanvas = () => {
        setScene(new Scene());
    };

    const handleEraseClick = useCallback((event: React.MouseEvent) => {
        if (settings.mode !== 'eraser') return;

        const { x, y } = getCanvasCoordinates(event);

        // Find and remove objects at clicked position
        const newScene = new Scene();
        const objects = scene.getObjects();

        objects.forEach(obj => {
            // Simple hit test for paths - check if click is near any point
            if (obj.type === 'path') {
                const path = obj as any;
                let shouldKeep = true;

                for (let i = 0; i < path.points.length; i += 2) {
                    const px = path.points[i];
                    const py = path.points[i + 1];
                    const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

                    if (distance < 20) { // Erase threshold
                        shouldKeep = false;
                        break;
                    }
                }

                if (shouldKeep) {
                    newScene.add(obj);
                }
            } else {
                newScene.add(obj);
            }
        });

        setScene(newScene);
    }, [settings.mode, getCanvasCoordinates, scene]);

    const handleMouseDown = (event: React.MouseEvent) => {
        if (settings.mode === 'eraser') {
            handleEraseClick(event);
        } else {
            startDrawing(event);
        }
    };

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← Back to Samples
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎨 Free Drawing Sample</h1>
                <p className="text-gray-600 mb-4">
                    Draw freely on the canvas with customizable brush settings.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Drawing Tools Panel */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                            <h3 className="font-semibold mb-3">Drawing Tools</h3>

                            {/* Mode Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['pen', 'brush', 'eraser'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setSettings(prev => ({ ...prev, mode }))}
                                            className={`px-3 py-2 rounded text-sm capitalize ${settings.mode === mode
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white border border-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color Picker */}
                            {settings.mode !== 'eraser' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={settings.strokeColor}
                                            onChange={(e) => setSettings(prev => ({ ...prev, strokeColor: e.target.value }))}
                                            className="w-12 h-8 rounded border border-gray-300"
                                        />
                                        <input
                                            type="text"
                                            value={settings.strokeColor}
                                            onChange={(e) => setSettings(prev => ({ ...prev, strokeColor: e.target.value }))}
                                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Stroke Width */}
                            {settings.mode !== 'eraser' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">
                                        Stroke Width: {settings.strokeWidth}px
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={settings.strokeWidth}
                                        onChange={(e) => setSettings(prev => ({ ...prev, strokeWidth: Number(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {/* Tension/Smoothness */}
                            {settings.mode !== 'eraser' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-2">
                                        Smoothness: {(settings.tension * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={settings.tension}
                                        onChange={(e) => setSettings(prev => ({ ...prev, tension: Number(e.target.value) }))}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {/* Quick Color Palette */}
                            {settings.mode !== 'eraser' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Quick Colors</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSettings(prev => ({ ...prev, strokeColor: color }))}
                                                className={`w-8 h-8 rounded border-2 ${settings.strokeColor === color ? 'border-gray-800' : 'border-gray-300'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr />

                        {/* Actions */}
                        <div>
                            <h4 className="font-medium mb-2">Actions</h4>
                            <button
                                onClick={clearCanvas}
                                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            >
                                Clear Canvas
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="text-sm text-gray-600">
                            <p><strong>Objects:</strong> {scene.getObjects().length}</p>
                            <p><strong>Mode:</strong> {settings.mode}</p>
                            {isDrawing && <p><strong>Drawing:</strong> {currentPath.length / 2} points</p>}
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="lg:col-span-3">
                    <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                        <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                            Drawing Canvas
                            {settings.mode === 'eraser' && <span className="text-red-500 ml-2">(Eraser Mode)</span>}
                        </h3>
                        <div
                            ref={containerRef}
                            className={`relative ${settings.mode === 'eraser' ? 'cursor-crosshair' : 'cursor-crosshair'}`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                        >
                            <Viewer scene={scene} width={800} height={600} />

                            {/* Current drawing preview */}
                            {isDrawing && currentPath.length >= 4 && (
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={600}
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        background: 'transparent'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-2">How to Use</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• <strong>Pen Mode:</strong> Click and drag to draw precise lines</li>
                            <li>• <strong>Brush Mode:</strong> Similar to pen but optimized for painting</li>
                            <li>• <strong>Eraser Mode:</strong> Click on drawn paths to remove them</li>
                            <li>• Adjust stroke width and smoothness for different effects</li>
                            <li>• Use the color picker or quick color palette</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
