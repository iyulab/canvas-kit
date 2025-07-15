'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => mod.Viewer), {
    ssr: false,
});

interface AnimationObject {
    id: string;
    initialProps: any;
    targetProps: any;
    duration: number;
    startTime: number;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
}

const easing = {
    linear: (t: number) => t,
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => t * (2 - t),
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
};

export default function AnimationPage() {
    const [scene, setScene] = useState<Scene>(new Scene());
    const [isPlaying, setIsPlaying] = useState(false);
    const [animations, setAnimations] = useState<AnimationObject[]>([]);
    const animationRef = useRef<number | undefined>();
    const lastTimeRef = useRef<number>(0);

    // Initialize scene with objects
    useEffect(() => {
        const newScene = new Scene();

        // Bouncing ball
        newScene.add({
            type: 'circle',
            x: 100,
            y: 100,
            radius: 25,
            fill: '#ff6b6b',
            stroke: '#d63031',
            strokeWidth: 2
        });

        // Moving rectangle
        newScene.add({
            type: 'rect',
            x: 50,
            y: 200,
            width: 60,
            height: 40,
            fill: '#74b9ff',
            stroke: '#0984e3',
            strokeWidth: 2
        });

        // Scaling circle
        newScene.add({
            type: 'circle',
            x: 300,
            y: 150,
            radius: 20,
            fill: '#55a3ff',
            stroke: '#2d3436',
            strokeWidth: 2
        });

        // Rotating square
        newScene.add({
            type: 'rect',
            x: 400,
            y: 100,
            width: 50,
            height: 50,
            fill: '#fd79a8',
            stroke: '#e84393',
            strokeWidth: 2
        });

        setScene(newScene);
    }, []);

    const interpolate = useCallback((start: number, end: number, progress: number) => {
        return start + (end - start) * progress;
    }, []);

    const animate = useCallback((currentTime: number) => {
        if (!isPlaying) return;

        const objects = scene.getObjects();
        const newScene = new Scene();

        objects.forEach((obj, index) => {
            let newObj = { ...obj };

            // Different animation for each object
            switch (index) {
                case 0: // Bouncing ball
                    const bounceY = 100 + Math.abs(Math.sin(currentTime * 0.005)) * 200;
                    newObj = { ...newObj, y: bounceY };
                    break;

                case 1: // Moving rectangle
                    const moveX = 50 + (Math.sin(currentTime * 0.003) + 1) * 200;
                    newObj = { ...newObj, x: moveX };
                    break;

                case 2: // Scaling circle
                    if (obj.type === 'circle') {
                        const scale = 20 + Math.sin(currentTime * 0.004) * 15;
                        newObj = { ...newObj, radius: scale };
                    }
                    break;

                case 3: // Color changing and moving rect
                    const colorPhase = (currentTime * 0.002) % (2 * Math.PI);
                    const red = Math.floor(128 + Math.sin(colorPhase) * 127);
                    const green = Math.floor(128 + Math.sin(colorPhase + 2) * 127);
                    const blue = Math.floor(128 + Math.sin(colorPhase + 4) * 127);
                    const spiralX = 400 + Math.cos(currentTime * 0.002) * 100;
                    const spiralY = 100 + Math.sin(currentTime * 0.002) * 100;
                    newObj = {
                        ...newObj,
                        x: spiralX,
                        y: spiralY,
                        fill: `rgb(${red}, ${green}, ${blue})`
                    };
                    break;
            }

            newScene.add(newObj);
        });

        setScene(newScene);
        lastTimeRef.current = currentTime;
        animationRef.current = requestAnimationFrame(animate);
    }, [isPlaying, scene]);

    const startAnimation = () => {
        setIsPlaying(true);
        lastTimeRef.current = performance.now();
        animationRef.current = requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
        setIsPlaying(false);
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    const resetAnimation = () => {
        stopAnimation();

        // Reset to initial state
        const newScene = new Scene();
        newScene.add({
            type: 'circle',
            x: 100,
            y: 100,
            radius: 25,
            fill: '#ff6b6b',
            stroke: '#d63031',
            strokeWidth: 2
        });

        newScene.add({
            type: 'rect',
            x: 50,
            y: 200,
            width: 60,
            height: 40,
            fill: '#74b9ff',
            stroke: '#0984e3',
            strokeWidth: 2
        });

        newScene.add({
            type: 'circle',
            x: 300,
            y: 150,
            radius: 20,
            fill: '#55a3ff',
            stroke: '#2d3436',
            strokeWidth: 2
        });

        newScene.add({
            type: 'rect',
            x: 400,
            y: 100,
            width: 50,
            height: 50,
            fill: '#fd79a8',
            stroke: '#e84393',
            strokeWidth: 2
        });

        setScene(newScene);
    };

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    const addRandomObject = () => {
        const newScene = new Scene();
        scene.getObjects().forEach(obj => newScene.add(obj));

        const shapes = ['rect', 'circle'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const colors = ['#ff6b6b', '#74b9ff', '#55a3ff', '#fd79a8', '#00b894', '#fdcb6e'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        if (shape === 'rect') {
            newScene.add({
                type: 'rect',
                x: Math.random() * 400,
                y: Math.random() * 300,
                width: 30 + Math.random() * 40,
                height: 30 + Math.random() * 40,
                fill: color,
                stroke: '#2d3436',
                strokeWidth: 2
            });
        } else {
            newScene.add({
                type: 'circle',
                x: Math.random() * 400,
                y: Math.random() * 300,
                radius: 15 + Math.random() * 25,
                fill: color,
                stroke: '#2d3436',
                strokeWidth: 2
            });
        }

        setScene(newScene);
    };

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← Back to Samples
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎬 Animation Sample</h1>
                <p className="text-gray-600 mb-4">
                    Demonstrate various animation techniques with Canvas2D rendering.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Animation Controls */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                            <h3 className="font-semibold mb-3">Animation Controls</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={isPlaying ? stopAnimation : startAnimation}
                                    className={`w-full px-4 py-2 rounded font-medium transition-colors ${isPlaying
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                >
                                    {isPlaying ? '⏹️ Stop' : '▶️ Play'}
                                </button>

                                <button
                                    onClick={resetAnimation}
                                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium transition-colors"
                                >
                                    🔄 Reset
                                </button>

                                <button
                                    onClick={addRandomObject}
                                    className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors"
                                >
                                    ➕ Add Random Object
                                </button>
                            </div>
                        </div>

                        <hr />

                        {/* Animation Info */}
                        <div>
                            <h4 className="font-medium mb-2">Animation Types</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                                    <span>Bouncing Ball</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-400 rounded"></div>
                                    <span>Horizontal Movement</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-300 rounded-full"></div>
                                    <span>Scaling</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-pink-400 rounded"></div>
                                    <span>Spiral + Color</span>
                                </div>
                            </div>
                        </div>

                        <hr />

                        {/* Stats */}
                        <div className="text-sm text-gray-600">
                            <p><strong>Status:</strong> {isPlaying ? 'Playing' : 'Stopped'}</p>
                            <p><strong>Objects:</strong> {scene.getObjects().length}</p>
                            <p><strong>FPS:</strong> ~60</p>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="lg:col-span-3">
                    <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                        <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                            Animation Canvas
                            {isPlaying && <span className="text-green-500 ml-2">🟢 Playing</span>}
                        </h3>
                        <div className="relative">
                            <Viewer scene={scene} width={800} height={400} />
                        </div>
                    </div>

                    {/* Animation Types Explanation */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-red-50 rounded-lg">
                            <h4 className="font-medium mb-2 text-red-700">🔴 Bouncing Ball</h4>
                            <p className="text-sm text-gray-700">
                                Vertical sine wave motion creating a bouncing effect using Math.sin() and Math.abs().
                            </p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium mb-2 text-blue-700">🔵 Horizontal Movement</h4>
                            <p className="text-sm text-gray-700">
                                Smooth left-right movement using sine wave oscillation across the canvas.
                            </p>
                        </div>
                        <div className="p-4 bg-indigo-50 rounded-lg">
                            <h4 className="font-medium mb-2 text-indigo-700">🟣 Scaling Animation</h4>
                            <p className="text-sm text-gray-700">
                                Circle radius changes over time creating a pulsing effect using sine waves.
                            </p>
                        </div>
                        <div className="p-4 bg-pink-50 rounded-lg">
                            <h4 className="font-medium mb-2 text-pink-700">🟪 Complex Animation</h4>
                            <p className="text-sm text-gray-700">
                                Combines spiral movement with dynamic color changes using multiple sine functions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
