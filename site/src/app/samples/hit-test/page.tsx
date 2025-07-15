'use client';

import dynamic from 'next/dynamic';
import { Scene } from '@canvas-kit/core';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

const Viewer = dynamic(() => import('@canvas-kit/viewer').then(mod => mod.Viewer), {
    ssr: false,
});

export default function HitTestSample() {
    const [scene, setScene] = useState<Scene | undefined>();
    const [selectedObject, setSelectedObject] = useState<any>(null);
    const [clickPosition, setClickPosition] = useState<{ x: number, y: number } | null>(null);
    const [hitObjects, setHitObjects] = useState<any[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const newScene = new Scene();

        // 테스트용 객체들 추가 (일부 겹치도록)
        newScene.add({
            type: 'rect',
            x: 50,
            y: 50,
            width: 100,
            height: 80,
            fill: 'rgba(255, 0, 0, 0.7)'
        });

        newScene.add({
            type: 'circle',
            x: 120,
            y: 90,
            radius: 40,
            fill: 'rgba(0, 255, 0, 0.7)'
        });

        newScene.add({
            type: 'rect',
            x: 200,
            y: 30,
            width: 80,
            height: 120,
            fill: 'rgba(0, 0, 255, 0.7)'
        });

        newScene.add({
            type: 'circle',
            x: 240,
            y: 90,
            radius: 30,
            fill: 'rgba(255, 255, 0, 0.7)'
        });

        // 겹치는 작은 사각형
        newScene.add({
            type: 'rect',
            x: 80,
            y: 70,
            width: 60,
            height: 40,
            fill: 'rgba(255, 0, 255, 0.7)'
        });

        setScene(newScene);
    }, []);

    const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!scene) return;

        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setClickPosition({ x, y });

        // 히트 테스트 실행
        const topObject = scene.getObjectAtPoint(x, y);
        const allHitObjects = scene.getObjectsAtPoint(x, y);

        setSelectedObject(topObject);
        setHitObjects(allHitObjects);
    }, [scene]);

    const getObjectInfo = (obj: any, index?: number) => {
        if (!obj) return null;

        const baseInfo = {
            type: obj.type,
            x: obj.x,
            y: obj.y,
            fill: obj.fill
        };

        if (obj.type === 'rect') {
            return { ...baseInfo, width: obj.width, height: obj.height };
        } else if (obj.type === 'circle') {
            return { ...baseInfo, radius: obj.radius };
        }

        return baseInfo;
    };

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎯 Hit Test Sample</h1>
                <p className="text-gray-600">
                    마우스 클릭으로 객체 선택 테스트 - Core 패키지의 히트 테스트 기능을 확인합니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 정보 패널 */}
                <div className="lg:col-span-1">
                    <div className="space-y-4">
                        {/* 클릭 위치 */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-3">클릭 위치</h3>
                            {clickPosition ? (
                                <div className="text-sm">
                                    <div>X: {clickPosition.x}</div>
                                    <div>Y: {clickPosition.y}</div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    캔버스를 클릭해보세요
                                </div>
                            )}
                        </div>

                        {/* 선택된 객체 (최상위) */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-3">선택된 객체</h3>
                            {selectedObject ? (
                                <div className="text-sm">
                                    <div className="font-medium mb-2">최상위 객체:</div>
                                    {Object.entries(getObjectInfo(selectedObject) || {}).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                            <span className="text-gray-600">{key}:</span>
                                            <span className="font-mono">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    선택된 객체 없음
                                </div>
                            )}
                        </div>

                        {/* 모든 히트 객체 */}
                        <div className="bg-green-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-3">
                                겹치는 객체들 ({hitObjects.length}개)
                            </h3>
                            {hitObjects.length > 0 ? (
                                <div className="space-y-3 text-sm">
                                    {hitObjects.map((obj, index) => (
                                        <div key={index} className="border-l-4 border-green-500 pl-3">
                                            <div className="font-medium">#{index + 1} ({obj.type})</div>
                                            <div className="text-gray-600 text-xs">
                                                {obj.type === 'rect'
                                                    ? `${obj.width}×${obj.height} at (${obj.x}, ${obj.y})`
                                                    : `r:${obj.radius} at (${obj.x}, ${obj.y})`
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm">
                                    겹치는 객체 없음
                                </div>
                            )}
                        </div>

                        {/* 사용법 */}
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <h4 className="font-medium mb-2">사용법</h4>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• 캔버스 위를 클릭해보세요</li>
                                <li>• 겹치는 영역을 클릭해보세요</li>
                                <li>• 빈 공간을 클릭해보세요</li>
                                <li>• 다양한 도형을 테스트해보세요</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 캔버스 영역 */}
                <div className="lg:col-span-2">
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                        <h3 className="text-lg font-medium mb-4">인터랙티브 캔버스</h3>
                        {scene && (
                            <div className="border border-gray-300 rounded overflow-hidden relative">
                                <canvas
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    className="cursor-crosshair"
                                    style={{ display: 'block' }}
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                    <Viewer width={400} height={300} scene={scene} />
                                </div>

                                {/* 클릭 위치 표시 */}
                                {clickPosition && (
                                    <div
                                        className="absolute w-2 h-2 bg-red-500 rounded-full pointer-events-none"
                                        style={{
                                            left: clickPosition.x - 4,
                                            top: clickPosition.y - 4,
                                            transform: 'translate(0, 0)'
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* 객체 목록 */}
                    <div className="mt-4">
                        <h4 className="font-medium mb-2">Scene 객체 목록</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {scene?.getObjects().map((obj, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded border text-sm ${selectedObject === obj
                                        ? 'bg-blue-100 border-blue-300'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="font-medium">{obj.type} #{index + 1}</div>
                                    <div className="text-gray-600 text-xs">
                                        {obj.type === 'rect'
                                            ? `${obj.width}×${obj.height} at (${obj.x}, ${obj.y})`
                                            : `r:${obj.radius} at (${obj.x}, ${obj.y})`
                                        }
                                    </div>
                                    <div
                                        className="w-4 h-4 rounded mt-1"
                                        style={{ backgroundColor: obj.fill }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
