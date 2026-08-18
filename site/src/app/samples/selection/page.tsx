'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scene, DrawingObject, SelectionUtils, Point } from '@canvas-kit/core';
import dynamic from 'next/dynamic';

const KonvaDesigner = dynamic(() => import('@canvas-kit/designer').then(mod => ({ default: mod.KonvaDesigner })), {
    ssr: false,
});

export default function SelectionPage() {
    const [scene, setScene] = useState<Scene | null>(null);
    const [selectedObjects, setSelectedObjects] = useState<DrawingObject[]>([]);
    const [lastHitTest, setLastHitTest] = useState<string>('');

    useEffect(() => {
        const newScene = new Scene();

        // 테스트용 객체들 추가 (일부 겹치도록 배치)
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
            x: 120,
            y: 70,
            width: 80,
            height: 60,
            fill: '#74b9ff',
            stroke: '#0984e3',
            strokeWidth: 2
        });

        newScene.add({
            type: 'circle',
            x: 180,
            y: 120,
            radius: 35,
            fill: '#55a3ff',
            stroke: '#2d3436',
            strokeWidth: 2
        });

        newScene.add({
            type: 'rect',
            x: 250,
            y: 100,
            width: 70,
            height: 50,
            fill: '#fd79a8',
            stroke: '#e84393',
            strokeWidth: 2
        });

        newScene.add({
            type: 'circle',
            x: 100,
            y: 200,
            radius: 25,
            fill: '#00b894',
            stroke: '#00a085',
            strokeWidth: 2
        });

        // 겹치는 작은 객체들
        newScene.add({
            type: 'rect',
            x: 140,
            y: 180,
            width: 40,
            height: 30,
            fill: '#fdcb6e',
            stroke: '#e17055',
            strokeWidth: 1
        });

        newScene.add({
            type: 'circle',
            x: 160,
            y: 190,
            radius: 20,
            fill: '#6c5ce7',
            stroke: '#5f3dc4',
            strokeWidth: 1
        });

        setScene(newScene);

        // 디버깅: Scene 객체들의 ID 확인
        console.log('🚀 [SELECTION PAGE] Scene created with objects:',
            newScene.getObjects().map(obj => ({
                id: obj.id,
                type: obj.type,
                position: { x: obj.x, y: obj.y }
            }))
        );
    }, []);

    const handleSelectionChange = (objects: DrawingObject[]) => {
        console.log('🔥 [SELECTION PAGE] Selection changed:', objects);
        console.log('🔥 [SELECTION PAGE] Number of selected objects:', objects.length);
        setSelectedObjects(objects);
    };

    const handleSceneChange = (newScene: Scene) => {
        setScene(newScene);
    };

    // Hit Test 데모
    const testHitTest = (point: Point) => {
        if (!scene) return;

        const objects = scene.getObjects();
        const hitObjects = SelectionUtils.getObjectsAtPoint(point, objects);
        const topObject = SelectionUtils.getTopObjectAtPoint(point, objects);

        setLastHitTest(`
      좌표 (${Math.round(point.x)}, ${Math.round(point.y)})에서:
      - 히트된 객체 수: ${hitObjects.length}개
      - 최상위 객체: ${topObject ? `${topObject.type}` : '없음'}
    `);
    };

    if (!scene) {
        return <div>Loading scene...</div>;
    }

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🖱️ Selection System Sample</h1>
                <p className="text-gray-600 mb-4">
                    Canvas-Kit의 핵심 선택 기능 데모 - SelectionUtils와 KonvaDesigner 통합
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-3">Interactive Designer</h2>
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                        <KonvaDesigner
                            scene={scene}
                            onSceneChange={handleSceneChange}
                            onSelectionChange={handleSelectionChange}
                            width={500}
                            height={350}
                            enableMultiSelect={true}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">선택 방법</h3>
                            <ul className="text-sm text-gray-700 space-y-1">
                                <li>• <strong>클릭</strong>: 단일 객체 선택 (파란색 테두리)</li>
                                <li>• <strong>빈 영역 드래그</strong>: 범위 선택 (파란색 박스)</li>
                                <li>• <strong>Ctrl+클릭</strong>: 객체 추가 선택</li>
                                <li>• <strong>Ctrl+Shift+클릭</strong>: 객체 선택 해제</li>
                                <li>• <strong>Ctrl+드래그</strong>: 범위 추가 선택</li>
                                <li>• <strong>Transformer</strong>: 선택된 객체 크기 조절</li>
                            </ul>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <h3 className="font-semibold mb-2">Hit Test 데모</h3>
                            <div className="text-sm text-gray-700">
                                <button
                                    onClick={() => testHitTest({ x: 150, y: 100 })}
                                    className="bg-green-500 text-white px-3 py-1 rounded text-xs mb-2 hover:bg-green-600"
                                >
                                    (150, 100) 테스트
                                </button>
                                <button
                                    onClick={() => testHitTest({ x: 160, y: 190 })}
                                    className="bg-green-500 text-white px-3 py-1 rounded text-xs mb-2 ml-2 hover:bg-green-600"
                                >
                                    (160, 190) 테스트
                                </button>
                                <pre className="text-xs bg-white p-2 rounded mt-2 whitespace-pre-wrap">
                                    {lastHitTest || 'Hit Test 버튼을 클릭하세요'}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3">상태 정보</h2>

                    <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold mb-2">현재 선택</h3>
                        <div className="text-sm text-gray-700">
                            <p className="mb-2">선택된 객체: <strong>{selectedObjects.length}개</strong></p>
                            {selectedObjects.length > 0 && (
                                <div className="space-y-1 max-h-20 overflow-y-auto">
                                    {selectedObjects.map((obj, idx) => (
                                        <div key={idx} className="text-xs bg-white px-2 py-1 rounded">
                                            {obj.type} ({Math.round(obj.x)}, {Math.round(obj.y)})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-3">객체 목록</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {scene.getObjects().map((obj: DrawingObject, index: number) => {
                            const isSelected = selectedObjects.includes(obj);

                            return (
                                <div
                                    key={index}
                                    className={`p-3 rounded border transition-all cursor-pointer ${isSelected
                                        ? 'bg-blue-100 border-blue-300 shadow-sm'
                                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                                            style={{ backgroundColor: obj.fill || '#ccc' }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">
                                                {obj.type.toUpperCase()} #{index + 1}
                                            </div>
                                            <div className="text-xs text-gray-600 truncate">
                                                위치: ({Math.round(obj.x)}, {Math.round(obj.y)})
                                                {obj.type === 'rect' && ` 크기: ${obj.width}×${obj.height}`}
                                                {obj.type === 'circle' && ` 반지름: ${obj.radius}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                        <h3 className="font-semibold mb-2">SelectionUtils 기능</h3>
                        <div className="text-sm text-gray-700">
                            <ul className="space-y-1">
                                <li>✅ isPointInObject</li>
                                <li>✅ getTopObjectAtPoint</li>
                                <li>✅ isObjectCompletelyInRect</li>
                                <li>✅ updateSelection</li>
                                <li>✅ normalizeRect</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
