'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Scene, CommandHistory } from '@canvas-kit/core';
import { AdvancedDesigner } from '@canvas-kit/designer';
import type { DrawingObject } from '@canvas-kit/core';

export default function FreeDrawingPage() {
    // Canvas-Kit의 Scene을 사용 (그리기는 내부적으로 관리됨)
    const [scene] = useState(() => new Scene());
    const [commandHistory] = useState(() => new CommandHistory());
    const [selectedObjects, setSelectedObjects] = useState<DrawingObject[]>([]);

    const handleSceneChange = useCallback((newScene: Scene) => {
        console.log('Scene changed:', newScene.getObjects().length, 'objects');
    }, []);

    const handleSelectionChange = useCallback((objects: DrawingObject[]) => {
        setSelectedObjects(objects);
        console.log('Selection changed:', objects.length, 'objects selected');
    }, []);

    return (
        <main className="container mx-auto p-8">
            <div className="mb-6">
                <Link href="/samples" className="text-blue-500 hover:text-blue-700 mb-4 inline-block">
                    ← 샘플 목록으로
                </Link>
                <h1 className="text-3xl font-bold mb-2">🎨 Free Drawing</h1>
                <p className="text-gray-600 mb-4">
                    Canvas-Kit의 통합된 디자이너를 사용한 자유 그리기 도구입니다.
                    그리기 도구를 선택하고 브러시나 지우개로 자유롭게 그림을 그릴 수 있습니다.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Canvas-Kit 통합 디자이너 */}
                <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                    <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                        Integrated Drawing Canvas with Keyboard Shortcuts
                    </h3>

                    <div className="h-[600px]">
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded border">
                        <h4 className="font-medium text-blue-700 mb-2">🛠️ Tool Selection</h4>
                        <p className="text-sm text-gray-600">
                            상단 툴바에서 "✏️ 그리기" 도구를 선택하거나 <kbd className="px-1 py-0.5 bg-white rounded border text-xs">2</kbd> 키를 누르세요
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded border">
                        <h4 className="font-medium text-green-700 mb-2">🖌️ Brush Mode</h4>
                        <p className="text-sm text-gray-600">
                            브러시 모드에서 다양한 색상과 두께로 자유롭게 그릴 수 있습니다
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded border">
                        <h4 className="font-medium text-purple-700 mb-2">🧹 Eraser Mode</h4>
                        <p className="text-sm text-gray-600">
                            지우개 모드로 전환하여 그린 내용을 선택적으로 지울 수 있습니다
                        </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded border">
                        <h4 className="font-medium text-orange-700 mb-2">⌨️ Keyboard Shortcuts</h4>
                        <p className="text-sm text-gray-600">
                            <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Z</kbd> 실행 취소,
                            <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Esc</kbd> 선택 도구로 복귀
                        </p>
                    </div>
                </div>

                {/* Canvas-Kit 장점 설명 */}
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <h3 className="text-xl font-semibold mb-3 text-gray-800">🚀 Canvas-Kit 통합 드로잉의 장점</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">🎯 원활한 워크플로우</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 그리기와 객체 편집을 하나의 환경에서</li>
                                <li>• 도구 간 즉시 전환 가능</li>
                                <li>• 일관된 사용자 경험</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">🔧 고급 기능 통합</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 그리기 작업도 Undo/Redo 지원</li>
                                <li>• 드로잉과 도형을 함께 편집</li>
                                <li>• 레이어 관리 시스템</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">🚀 성능 최적화</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 효율적인 렌더링 엔진</li>
                                <li>• 메모리 사용량 최적화</li>
                                <li>• 부드러운 터치/마우스 지원</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">⌨️ 키보드 단축키</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 도구 전환 숫자 키 (1-5)</li>
                                <li>• Undo/Redo 표준 단축키</li>
                                <li>• Esc로 선택 도구 복귀</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 기술적 특징 */}
                <div className="p-6 bg-gray-50 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">🔧 기술적 특징</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded">
                            <h4 className="font-medium text-gray-700 mb-2">📐 Vector-based Drawing</h4>
                            <p className="text-sm text-gray-600">
                                벡터 기반 드로잉으로 확대/축소 시에도 선명한 품질 유지
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded">
                            <h4 className="font-medium text-gray-700 mb-2">🎮 Real-time Rendering</h4>
                            <p className="text-sm text-gray-600">
                                실시간 렌더링으로 부드러운 드로잉 경험 제공
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded">
                            <h4 className="font-medium text-gray-700 mb-2">💾 State Management</h4>
                            <p className="text-sm text-gray-600">
                                Scene 기반 상태 관리로 안정적인 데이터 처리
                            </p>
                        </div>
                    </div>
                </div>

                {/* 현재 Scene 상태 */}
                <div className="p-4 bg-blue-50 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-700 mb-2">
                        📊 Scene 상태: {scene.getObjects().length}개 객체
                    </h4>
                    <p className="text-sm text-gray-600">
                        현재 Scene에 포함된 모든 그리기 요소와 객체들이 통합 관리됩니다.
                    </p>
                    {selectedObjects.length > 0 && (
                        <div className="mt-2 text-sm">
                            <span className="font-medium">선택된 객체:</span>
                            {selectedObjects.map((obj, index) => (
                                <span key={obj.id} className="ml-2 text-blue-600">
                                    {obj.type}#{obj.id}
                                    {index < selectedObjects.length - 1 && ','}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
