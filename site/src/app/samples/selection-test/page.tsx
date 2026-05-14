'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Scene } from '@canvas-kit/core';
import dynamic from 'next/dynamic';
import type { DrawingObject } from '@canvas-kit/core';

const SimpleSelectionDemo = dynamic(() => import('@canvas-kit/designer').then(mod => mod.SimpleSelectionDemo), {
    ssr: false,
});

export default function SelectionTestPage() {
    const [scene, setScene] = useState<Scene | null>(null);
    const [selectedObjects, setSelectedObjects] = useState<DrawingObject[]>([]);
    const [isCanvasSelected, setIsCanvasSelected] = useState<boolean>(false);

    useEffect(() => {
        const newScene = new Scene();

        // 테스트용 객체들 추가
        newScene.add({
            type: 'rect',
            x: 50,
            y: 50,
            width: 100,
            height: 80,
            fill: '#ff6b6b',
            stroke: '#d63031',
            strokeWidth: 2
        });

        newScene.add({
            type: 'rect',
            x: 200,
            y: 100,
            width: 80,
            height: 60,
            fill: '#74b9ff',
            stroke: '#0984e3',
            strokeWidth: 2
        });

        newScene.add({
            type: 'circle',
            x: 350,
            y: 120,
            radius: 40,
            fill: '#55a3ff',
            stroke: '#2d3436',
            strokeWidth: 2
        });

        newScene.add({
            type: 'rect',
            x: 100,
            y: 200,
            width: 120,
            height: 50,
            fill: '#00b894',
            stroke: '#00a085',
            strokeWidth: 2
        });

        newScene.add({
            type: 'circle',
            x: 300,
            y: 250,
            radius: 30,
            fill: '#fdcb6e',
            stroke: '#e17055',
            strokeWidth: 2
        });

        setScene(newScene);
    }, []);

    const handleSelectionChange = useCallback((objects: DrawingObject[]) => {
        setSelectedObjects(objects);
        if (objects.length > 0) {
            setIsCanvasSelected(false);
        }
    }, []);

    const handleCanvasSelection = useCallback(() => {
        setIsCanvasSelected(true);
        setSelectedObjects([]);
    }, []);

    if (!scene) {
        return <div>Loading...</div>;
    }

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎯 Selection Test</h1>
                <p className="text-gray-600 mb-4">
                    단순한 선택 기능 테스트 데모입니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 컨트롤 */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold mb-3">선택 기능 테스트</h3>

                        <div className="bg-white p-3 rounded border">
                            <h4 className="font-medium mb-2">사용법:</h4>
                            <ul className="text-sm space-y-1">
                                <li>• 객체 클릭: 단일 선택</li>
                                <li>• Ctrl + 클릭: 다중 선택/해제</li>
                                <li>• 빈 영역 클릭: 캔버스 선택</li>
                                <li>• 빈 영역 드래그: 범위 선택</li>
                                <li>• Ctrl + 드래그: 범위 추가 선택</li>
                            </ul>
                        </div>

                        <div className="bg-white p-3 rounded border">
                            <h4 className="font-medium mb-2">선택된 객체</h4>
                            {isCanvasSelected ? (
                                <div className="text-sm bg-gray-100 p-2 rounded">
                                    <div className="font-medium text-gray-700">Canvas</div>
                                    <div className="text-gray-600">전체 캔버스가 선택되었습니다</div>
                                </div>
                            ) : selectedObjects.length === 0 ? (
                                <p className="text-gray-500 text-sm">선택된 객체가 없습니다</p>
                            ) : (
                                <div className="space-y-1">
                                    {selectedObjects.map((obj, index) => (
                                        <div key={obj.id || index} className="text-sm bg-blue-50 p-2 rounded">
                                            <div className="font-medium">{obj.type}</div>
                                            <div className="text-gray-600">
                                                ID: {obj.id} | Position: ({Math.round(obj.x)}, {Math.round(obj.y)})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-blue-50 p-3 rounded border">
                            <h4 className="font-medium mb-2">통계</h4>
                            <div className="text-sm space-y-1">
                                <div>총 객체: {scene.getObjects().length}개</div>
                                <div>선택된 객체: {isCanvasSelected ? 'Canvas' : `${selectedObjects.length}개`}</div>
                                <div>선택 비율: {isCanvasSelected ? 'N/A' : (scene.getObjects().length > 0 ? Math.round((selectedObjects.length / scene.getObjects().length) * 100) : 0) + '%'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 캔버스 */}
                <div className="lg:col-span-2">
                    <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                        <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                            Selection Demo Canvas
                        </h3>

                        <div className="p-4">
                            <SimpleSelectionDemo
                                width={600}
                                height={400}
                                scene={scene}
                                onSelectionChange={handleSelectionChange}
                                onCanvasSelection={handleCanvasSelection}
                            />
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 rounded border">
                            <h4 className="font-medium text-green-700 mb-1">단일 선택</h4>
                            <p className="text-sm text-gray-600">객체를 클릭하여 하나씩 선택</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded border">
                            <h4 className="font-medium text-blue-700 mb-1">다중 선택</h4>
                            <p className="text-sm text-gray-600">Ctrl 키를 누르고 클릭하여 여러 개 선택</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded border">
                            <h4 className="font-medium text-gray-700 mb-1">캔버스 선택</h4>
                            <p className="text-sm text-gray-600">빈 영역을 클릭하여 캔버스 자체 선택</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded border">
                            <h4 className="font-medium text-purple-700 mb-1">범위 선택</h4>
                            <p className="text-sm text-gray-600">빈 영역을 드래그하여 범위 내 객체 선택</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
