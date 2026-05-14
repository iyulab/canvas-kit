'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Scene, CommandHistory } from '@canvas-kit/core';
import { AdvancedDesigner } from '@canvas-kit/designer';
import type { DrawingObject } from '@canvas-kit/core';

export default function AdvancedDesignerPage() {
    const [scene] = useState(() => {
        const s = new Scene();

        // 기본 샘플 객체들 추가
        s.add({
            type: 'rect',
            id: 'rect1',
            x: 50,
            y: 50,
            width: 100,
            height: 80,
            fill: '#ff6b6b'
        });

        s.add({
            type: 'circle',
            id: 'circle1',
            x: 200,
            y: 100,
            radius: 50,
            fill: '#4ecdc4'
        });

        s.add({
            type: 'rect',
            id: 'rect2',
            x: 300,
            y: 150,
            width: 120,
            height: 60,
            fill: '#45b7d1'
        });

        return s;
    });

    const [commandHistory] = useState(() => new CommandHistory());
    const [selectedObjects, setSelectedObjects] = useState<DrawingObject[]>([]);
    const [, forceUpdate] = useState(0);

    // CommandHistory 이벤트 구독 → 씬 변경 시 사이드바 업데이트
    useEffect(() => {
        const handler = () => forceUpdate(v => v + 1);
        commandHistory.addEventListener(handler);
        return () => commandHistory.removeEventListener(handler);
    }, [commandHistory]);

    const handleSceneChange = useCallback((_newScene: Scene) => {
        forceUpdate(v => v + 1);
    }, []);

    const handleSelectionChange = useCallback((objects: DrawingObject[]) => {
        setSelectedObjects(objects);
    }, []);

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🛠️ Advanced Designer</h1>
                <p className="text-gray-600 mb-4">
                    선택, 그리기, 텍스트 편집 등 모든 기능이 통합된 고급 디자이너입니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* 정보 패널 */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <h3 className="font-semibold mb-3">Designer Info</h3>

                        {/* 현재 선택 정보 */}
                        <div>
                            <h4 className="font-medium mb-2">Selection</h4>
                            <div className="text-sm text-gray-600">
                                {selectedObjects.length === 0 ? (
                                    <p>선택된 객체가 없습니다</p>
                                ) : (
                                    <div>
                                        <p className="mb-1">{selectedObjects.length}개 객체 선택됨</p>
                                        <ul className="space-y-1">
                                            {selectedObjects.map((obj, idx) => (
                                                <li key={idx} className="text-xs">
                                                    • {obj.type} - {obj.id}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 히스토리 정보 */}
                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Command History</h4>
                            <div className="text-sm text-gray-600">
                                <p>실행 취소 가능: {commandHistory.canUndo() ? '예' : '아니오'}</p>
                                <p>다시 실행 가능: {commandHistory.canRedo() ? '예' : '아니오'}</p>
                            </div>
                        </div>

                        {/* 씬 정보 */}
                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Scene Objects</h4>
                            <div className="text-sm text-gray-600">
                                <p className="mb-2">총 {scene.getObjects().length}개 객체</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {scene.getObjects().map((obj, idx) => (
                                        <div key={idx} className="p-2 bg-white rounded border border-gray-200">
                                            <div className="font-medium">{obj.type}</div>
                                            <div className="text-xs text-gray-500">ID: {obj.id}</div>
                                            {obj.type === 'rect' && (
                                                <div className="text-xs text-gray-500">
                                                    {obj.width}×{obj.height}
                                                </div>
                                            )}
                                            {obj.type === 'circle' && (
                                                <div className="text-xs text-gray-500">
                                                    반지름: {obj.radius}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 디자이너 영역 */}
                <div className="lg:col-span-3">
                    <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                        <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                            Advanced Designer Canvas
                        </h3>

                        <div className="bg-white">
                            <AdvancedDesigner
                                width={800}
                                height={600}
                                scene={scene}
                                onSceneChange={handleSceneChange}
                                onSelectionChange={handleSelectionChange}
                                commandHistory={commandHistory}
                                showToolbar={true}
                                enableKeyboardShortcuts={true}
                                enableUndoRedo={true}
                            />
                        </div>
                    </div>

                    {/* 사용법 안내 */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-blue-50 rounded border">
                            <h4 className="font-medium text-blue-700 mb-1">🖱️ Select Tool</h4>
                            <p className="text-sm text-gray-600">객체 선택, 이동, 크기 조정, 다중 선택</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded border">
                            <h4 className="font-medium text-green-700 mb-1">✏️ Draw Tool</h4>
                            <p className="text-sm text-gray-600">자유 그리기, 브러시 모드, 지우개 도구</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded border">
                            <h4 className="font-medium text-purple-700 mb-1">📝 Text Tool</h4>
                            <p className="text-sm text-gray-600">텍스트 추가, 편집, 스타일링</p>
                        </div>
                    </div>

                    {/* 키보드 단축키 */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">⌨️ 키보드 단축키</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="flex justify-between">
                                    <span>실행 취소</span>
                                    <code className="bg-gray-200 px-1 rounded">Ctrl + Z</code>
                                </div>
                                <div className="flex justify-between">
                                    <span>다시 실행</span>
                                    <code className="bg-gray-200 px-1 rounded">Ctrl + Y</code>
                                </div>
                                <div className="flex justify-between">
                                    <span>복사</span>
                                    <code className="bg-gray-200 px-1 rounded">Ctrl + C</code>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between">
                                    <span>붙여넣기</span>
                                    <code className="bg-gray-200 px-1 rounded">Ctrl + V</code>
                                </div>
                                <div className="flex justify-between">
                                    <span>복제</span>
                                    <code className="bg-gray-200 px-1 rounded">Ctrl + D</code>
                                </div>
                                <div className="flex justify-between">
                                    <span>삭제</span>
                                    <code className="bg-gray-200 px-1 rounded">Delete</code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
