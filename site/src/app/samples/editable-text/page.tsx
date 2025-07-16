'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Scene, CommandHistory } from '@canvas-kit/core';
import { AdvancedDesigner } from '@canvas-kit/designer';
import type { DrawingObject, Text } from '@canvas-kit/core';

export default function EditableTextPage() {
    // Canvas-Kit의 Scene을 사용하여 텍스트 객체 관리
    const [scene] = useState(() => {
        const s = new Scene();

        // 기본 텍스트 객체들을 Scene에 추가
        s.add({
            type: 'text',
            id: 'text1',
            x: 50,
            y: 50,
            text: 'Double click to edit this text',
            fontSize: 24,
            fontFamily: 'Arial',
            fill: '#000000'
        } as Text);

        s.add({
            type: 'text',
            id: 'text2',
            x: 50,
            y: 120,
            text: 'You can also edit this one!',
            fontSize: 18,
            fontFamily: 'Times New Roman',
            fill: '#007bff'
        } as Text);

        return s;
    });

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
                <h1 className="text-3xl font-bold mb-2">📝 Editable Text</h1>
                <p className="text-gray-600 mb-4">
                    Canvas-Kit의 통합된 디자이너를 사용한 편집 가능한 텍스트입니다.
                    텍스트 도구를 선택하고 캔버스를 클릭하여 새 텍스트를 추가하거나,
                    기존 텍스트를 더블클릭하여 편집할 수 있습니다.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Canvas-Kit 통합 디자이너 */}
                <div className="border-2 border-gray-200 rounded-lg bg-white overflow-hidden">
                    <h3 className="text-lg font-medium p-4 border-b border-gray-200">
                        Integrated Text Editor with Keyboard Shortcuts
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
                            상단 툴바에서 "📝 텍스트" 도구를 선택하거나 <kbd className="px-1 py-0.5 bg-white rounded border text-xs">3</kbd> 키를 누르세요
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded border">
                        <h4 className="font-medium text-green-700 mb-2">➕ Add Text</h4>
                        <p className="text-sm text-gray-600">
                            텍스트 도구가 선택된 상태에서 캔버스의 원하는 위치를 클릭하면 새 텍스트가 추가됩니다
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded border">
                        <h4 className="font-medium text-purple-700 mb-2">✏️ Edit Text</h4>
                        <p className="text-sm text-gray-600">
                            기존 텍스트를 더블클릭하면 직접 편집할 수 있습니다
                        </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded border">
                        <h4 className="font-medium text-orange-700 mb-2">⌨️ Keyboard Shortcuts</h4>
                        <p className="text-sm text-gray-600">
                            <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Z</kbd> 실행 취소,
                            <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Y</kbd> 다시 실행
                        </p>
                    </div>
                </div>

                {/* Canvas-Kit 장점 설명 */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="text-xl font-semibold mb-3 text-gray-800">🚀 Canvas-Kit 통합의 장점</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">✅ 통합된 경험</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 하나의 컴포넌트로 모든 기능 제공</li>
                                <li>• 일관된 UI/UX 경험</li>
                                <li>• 도구 간 매끄러운 전환</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">🔧 고급 기능</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Undo/Redo 지원</li>
                                <li>• 복사/붙여넣기 기능</li>
                                <li>• 키보드 단축키</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">🎯 개발자 친화적</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Scene 기반 상태 관리</li>
                                <li>• Command Pattern 구조</li>
                                <li>• TypeScript 완전 지원</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-700 mb-2">🔄 확장 가능</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 모듈형 아키텍처</li>
                                <li>• 커스텀 도구 추가 가능</li>
                                <li>• 플러그인 시스템</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 현재 선택 상태 */}
                {selectedObjects.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                        <h4 className="font-medium text-yellow-700 mb-2">
                            📋 선택된 객체: {selectedObjects.length}개
                        </h4>
                        <div className="text-sm text-gray-600">
                            {selectedObjects.map((obj, index) => (
                                <div key={obj.id} className="mb-1">
                                    {index + 1}. {obj.type} - {obj.id}
                                    {obj.type === 'text' && (obj as Text).text && (
                                        <span className="ml-2 text-blue-600">
                                            "{(obj as Text).text}"
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
