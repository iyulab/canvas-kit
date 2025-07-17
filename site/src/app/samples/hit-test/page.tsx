'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { SelectionUtils } from '@canvas-kit/core';
import type { DrawingObject } from '@canvas-kit/core';

const Viewer = dynamic(() => import('@canvas-kit/designer').then(mod => ({ default: mod.AdvancedDesigner })), {
    ssr: false,
});

export default function HitTestSample() {
    const [scene] = useState(() => {
        const newScene = new Scene();

        // Sample objects for hit testing
        newScene.add({
            id: 'rect1',
            type: 'rect',
            x: 100,
            y: 100,
            width: 120,
            height: 80,
            fill: '#3b82f6',
            stroke: '#1e40af',
            strokeWidth: 2
        });

        newScene.add({
            id: 'circle1',
            type: 'circle',
            x: 300,
            y: 150,
            radius: 50,
            fill: '#ef4444',
            stroke: '#dc2626',
            strokeWidth: 2
        });

        newScene.add({
            id: 'rect2',
            type: 'rect',
            x: 450,
            y: 120,
            width: 80,
            height: 100,
            fill: '#10b981',
            stroke: '#059669',
            strokeWidth: 2
        });

        return newScene;
    });

    const [testPoint, setTestPoint] = useState({ x: 200, y: 200 });
    const [hitResults, setHitResults] = useState<{
        hitObject: DrawingObject | null;
        allObjects: { object: DrawingObject; hit: boolean }[];
    }>({ hitObject: null, allObjects: [] });

    const overlayRef = useRef<HTMLCanvasElement>(null);

    // Perform hit test at current test point
    const performHitTest = useCallback(() => {
        const objects = scene.getObjects();
        const hitObject = SelectionUtils.getTopObjectAtPoint(testPoint, objects);

        const allObjects = objects.map(obj => ({
            object: obj,
            hit: SelectionUtils.isPointInObject(testPoint, obj)
        }));

        setHitResults({ hitObject, allObjects });
    }, [testPoint]); // scene 제거

    // Handle canvas click
    const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setTestPoint({ x, y });
    }, []);

    // Test specific points
    const testSpecificPoint = useCallback((x: number, y: number) => {
        setTestPoint({ x, y });
    }, []);

    // Draw overlay with test point and hit visualization
    const drawOverlay = useCallback((canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw test point
        ctx.fillStyle = '#ff6b6b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(testPoint.x, testPoint.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw crosshairs
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(testPoint.x - 20, testPoint.y);
        ctx.lineTo(testPoint.x + 20, testPoint.y);
        ctx.moveTo(testPoint.x, testPoint.y - 20);
        ctx.lineTo(testPoint.x, testPoint.y + 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight hit objects
        hitResults.allObjects.forEach(({ object, hit }) => {
            if (hit) {
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 3;
                ctx.setLineDash([3, 3]);

                if (object.type === 'rect') {
                    ctx.strokeRect(object.x, object.y, object.width, object.height);
                } else if (object.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(object.x, object.y, object.radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
            }
        });
    }, [testPoint, hitResults.allObjects]); // hitResults 전체가 아닌 hitResults.allObjects만 의존성으로 설정

    // Update hit test when test point changes
    React.useEffect(() => {
        performHitTest();
    }, [performHitTest]); // performHitTest를 의존성으로 유지하되 performHitTest의 의존성을 최소화

    // Draw overlay when test point or hit results change
    React.useEffect(() => {
        if (overlayRef.current) {
            drawOverlay(overlayRef.current);
        }
    }, [drawOverlay]); // drawOverlay를 의존성으로 유지하되 drawOverlay의 의존성을 최소화

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎯 Hit Test Sample</h1>
                <p className="text-gray-600 mb-4">
                    마우스 포인트와 객체의 충돌 감지 시스템을 테스트합니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div>
                            <h3 className="font-semibold mb-3">Test Controls</h3>

                            <div className="space-y-2">
                                <button
                                    onClick={() => testSpecificPoint(160, 140)}
                                    className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                                >
                                    Test Blue Rectangle
                                </button>
                                <button
                                    onClick={() => testSpecificPoint(300, 150)}
                                    className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                                >
                                    Test Red Circle
                                </button>
                                <button
                                    onClick={() => testSpecificPoint(490, 170)}
                                    className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                                >
                                    Test Green Rectangle
                                </button>
                                <button
                                    onClick={() => testSpecificPoint(250, 250)}
                                    className="w-full px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                                >
                                    Test Empty Area
                                </button>
                            </div>
                        </div>

                        <hr />

                        {/* Current Test Point */}
                        <div>
                            <h4 className="font-medium mb-2">Current Test Point</h4>
                            <div className="bg-white p-3 rounded border text-sm">
                                <div>X: <span className="font-mono">{testPoint.x}</span></div>
                                <div>Y: <span className="font-mono">{testPoint.y}</span></div>
                            </div>
                        </div>

                        {/* Hit Results */}
                        <div>
                            <h4 className="font-medium mb-2">Hit Test Results</h4>
                            <div className="bg-white p-3 rounded border text-sm">
                                {hitResults.hitObject ? (
                                    <div className="text-green-600">
                                        <div className="font-medium">✅ Hit!</div>
                                        <div>Object: {hitResults.hitObject.id}</div>
                                        <div>Type: {hitResults.hitObject.type}</div>
                                    </div>
                                ) : (
                                    <div className="text-gray-500">
                                        ❌ No hit detected
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* All Objects Status */}
                        <div>
                            <h4 className="font-medium mb-2">All Objects</h4>
                            <div className="space-y-1 text-sm">
                                {hitResults.allObjects.map(({ object, hit }) => (
                                    <div key={object.id} className={`p-2 rounded ${hit ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'}`}>
                                        <div className="flex justify-between items-center">
                                            <span>{object.id}</span>
                                            <span>{hit ? '🎯' : '⭕'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="lg:col-span-2">
                    <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                        <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                            Hit Test Canvas
                            <span className="text-sm text-gray-500 ml-2">(Click to test)</span>
                        </h3>

                        <div className="relative">
                            <Viewer scene={scene} width={600} height={400} />
                            <canvas
                                ref={overlayRef}
                                width={600}
                                height={400}
                                onClick={handleCanvasClick}
                                className="absolute top-0 left-0 cursor-crosshair"
                                style={{ pointerEvents: 'auto' }}
                            />
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                        <h4 className="font-medium text-blue-900 mb-2">사용법:</h4>
                        <ul className="text-blue-800 text-sm space-y-1">
                            <li>• 캔버스를 클릭하여 해당 지점에서 히트 테스트 수행</li>
                            <li>• 빨간 점이 현재 테스트 포인트를 표시</li>
                            <li>• 노란 점선이 히트된 객체를 강조 표시</li>
                            <li>• 버튼을 사용하여 특정 지점 테스트 가능</li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
