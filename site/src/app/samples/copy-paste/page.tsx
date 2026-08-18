'use client';

import React, { useState, useCallback } from 'react';
import { Scene, Clipboard, CommandHistory, CopyCommand, CutCommand, PasteCommand, DuplicateCommand } from '@canvas-kit/core';
import { KonvaDesigner } from '@canvas-kit/designer';
import type { DrawingObject } from '@canvas-kit/core';

export default function CopyPasteSample() {
    const [scene, setScene] = useState(() => {
        const newScene = new Scene();

        // 초기 객체들 추가
        newScene.add({
            id: 'rect1',
            type: 'rect',
            x: 50,
            y: 50,
            width: 100,
            height: 80,
            fill: '#ff6b6b',
            stroke: '#d63447',
            strokeWidth: 2
        });

        newScene.add({
            id: 'circle1',
            type: 'circle',
            x: 200,
            y: 100,
            radius: 40,
            fill: '#4ecdc4',
            stroke: '#26a69a',
            strokeWidth: 2
        });

        newScene.add({
            id: 'rect2',
            type: 'rect',
            x: 300,
            y: 50,
            width: 80,
            height: 120,
            fill: '#45b7d1',
            stroke: '#3498db',
            strokeWidth: 2
        });

        return newScene;
    });

    const [selectedObjects, setSelectedObjects] = useState<DrawingObject[]>([]);
    const [commandHistory] = useState(() => new CommandHistory());
    const [historyStatus, setHistoryStatus] = useState(commandHistory.getStatus());
    const [clipboardStatus, setClipboardStatus] = useState(() => {
        const clipboard = Clipboard.getInstance();
        return {
            isEmpty: clipboard.isEmpty(),
            count: clipboard.getCount()
        };
    });

    // Scene 변경 처리
    const handleSceneChange = useCallback((newScene: Scene) => {
        setScene(newScene);
        setHistoryStatus(commandHistory.getStatus());
    }, [commandHistory]);

    // 선택 변경 처리
    const handleSelectionChange = useCallback((objects: DrawingObject[]) => {
        setSelectedObjects(objects);
    }, []);

    // 클립보드 상태 업데이트
    const updateClipboardStatus = useCallback(() => {
        const clipboard = Clipboard.getInstance();
        setClipboardStatus({
            isEmpty: clipboard.isEmpty(),
            count: clipboard.getCount()
        });
    }, []);

    // 수동 Copy
    const handleCopy = useCallback(() => {
        if (selectedObjects.length > 0) {
            const copyCommand = new CopyCommand(selectedObjects);
            commandHistory.execute(copyCommand);
            setHistoryStatus(commandHistory.getStatus());
            updateClipboardStatus();
        }
    }, [selectedObjects, commandHistory, updateClipboardStatus]);

    // 수동 Cut
    const handleCut = useCallback(() => {
        if (selectedObjects.length > 0) {
            const cutCommand = new CutCommand(selectedObjects, scene);
            commandHistory.execute(cutCommand);
            handleSceneChange(scene);
            setSelectedObjects([]);
            updateClipboardStatus();
        }
    }, [selectedObjects, scene, commandHistory, handleSceneChange, updateClipboardStatus]);

    // 수동 Paste
    const handlePaste = useCallback(() => {
        const clipboard = Clipboard.getInstance();
        if (!clipboard.isEmpty()) {
            const pasteCommand = new PasteCommand(scene);
            commandHistory.execute(pasteCommand); // scene에 직접 추가됨
            handleSceneChange(scene); // 동일 참조지만 setHistoryStatus로 리렌더 트리거
            updateClipboardStatus();
        }
    }, [scene, commandHistory, handleSceneChange, updateClipboardStatus]);

    // 수동 Duplicate
    const handleDuplicate = useCallback(() => {
        if (selectedObjects.length > 0) {
            const duplicateCommand = new DuplicateCommand(selectedObjects, scene);
            commandHistory.execute(duplicateCommand); // scene에 직접 추가됨
            handleSceneChange(scene); // 동일 참조지만 setHistoryStatus로 리렌더 트리거
        }
    }, [selectedObjects, scene, commandHistory, handleSceneChange]);

    // 수동 Undo
    const handleUndo = useCallback(() => {
        if (commandHistory.undo()) {
            handleSceneChange(scene);
            updateClipboardStatus();
        }
    }, [commandHistory, scene, handleSceneChange, updateClipboardStatus]);

    // 수동 Redo
    const handleRedo = useCallback(() => {
        if (commandHistory.redo()) {
            handleSceneChange(scene);
            updateClipboardStatus();
        }
    }, [commandHistory, scene, handleSceneChange, updateClipboardStatus]);

    // 클립보드 클리어
    const handleClearClipboard = useCallback(() => {
        Clipboard.getInstance().clear();
        updateClipboardStatus();
    }, [updateClipboardStatus]);

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Copy/Paste System Demo
                </h1>
                <p className="text-gray-600 mb-4">
                    클립보드 기반 복사/붙여넣기 시스템 데모입니다. Undo/Redo와 완전히 통합되어 있습니다.
                </p>

                {/* 컨트롤 버튼들 */}
                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        onClick={handleCopy}
                        disabled={selectedObjects.length === 0}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        📋 Copy (Ctrl+C)
                    </button>
                    <button
                        onClick={handleCut}
                        disabled={selectedObjects.length === 0}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        ✂️ Cut (Ctrl+X)
                    </button>
                    <button
                        onClick={handlePaste}
                        disabled={clipboardStatus.isEmpty}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        📥 Paste (Ctrl+V)
                    </button>
                    <button
                        onClick={handleDuplicate}
                        disabled={selectedObjects.length === 0}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        📑 Duplicate (Ctrl+D)
                    </button>
                    <div className="border-l border-gray-300 mx-2"></div>
                    <button
                        onClick={handleUndo}
                        disabled={!historyStatus.canUndo}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        ⟲ Undo
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={!historyStatus.canRedo}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        ⟳ Redo
                    </button>
                    <button
                        onClick={handleClearClipboard}
                        disabled={clipboardStatus.isEmpty}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        🗑️ Clear Clipboard
                    </button>
                </div>

                {/* 상태 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* 클립보드 상태 */}
                    <div className="bg-blue-50 p-4 rounded-lg border">
                        <h3 className="font-semibold mb-2 text-blue-900">📋 Clipboard Status</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-blue-600">Items:</span>
                                <span className="ml-2 font-mono">{clipboardStatus.count}</span>
                            </div>
                            <div>
                                <span className="text-blue-600">Is Empty:</span>
                                <span className={`ml-2 font-mono ${clipboardStatus.isEmpty ? 'text-red-600' : 'text-green-600'}`}>
                                    {clipboardStatus.isEmpty ? '✗ Empty' : '✓ Has Data'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Command History */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="font-semibold mb-2 text-gray-900">📜 Command History</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-600">Commands:</span>
                                <span className="ml-2 font-mono">{historyStatus.undoCount} / {historyStatus.redoCount}</span>
                            </div>
                            {historyStatus.lastCommand && (
                                <div>
                                    <span className="text-gray-600">Last:</span>
                                    <span className="ml-2 font-mono text-blue-600">{historyStatus.lastCommand}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 사용법 안내 */}
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400">
                <h3 className="font-semibold text-green-900 mb-2">사용법:</h3>
                <ul className="text-green-800 text-sm space-y-1">
                    <li>• 객체를 선택하고 <kbd className="bg-green-200 px-1 rounded">Ctrl+C</kbd>로 복사</li>
                    <li>• <kbd className="bg-green-200 px-1 rounded">Ctrl+X</kbd>로 잘라내기 (복사 + 삭제)</li>
                    <li>• <kbd className="bg-green-200 px-1 rounded">Ctrl+V</kbd>로 붙여넣기 (20px 오프셋)</li>
                    <li>• <kbd className="bg-green-200 px-1 rounded">Ctrl+D</kbd>로 선택된 객체 중복 생성</li>
                    <li>• 모든 작업이 Undo/Redo 시스템과 통합되어 있습니다</li>
                </ul>
            </div>

            {/* 선택된 객체 정보 */}
            {selectedObjects.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                        ⭐ 선택된 객체 ({selectedObjects.length}개):
                    </h3>
                    <div className="space-y-1">
                        {selectedObjects.map((obj, index) => (
                            <div key={obj.id || index} className="text-sm text-yellow-800">
                                {obj.type} - ID: {obj.id} - Position: ({Math.round(obj.x)}, {Math.round(obj.y)})
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 캔버스 */}
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                <KonvaDesigner
                    width={600}
                    height={400}
                    scene={scene}
                    onSceneChange={handleSceneChange}
                    onSelectionChange={handleSelectionChange}
                    enableMultiSelect={true}
                />
            </div>

            {/* 객체 목록 */}
            <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Scene Objects ({scene.getObjects().length}개)</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                    {scene.getObjects().length === 0 ? (
                        <p className="text-gray-500 italic">객체가 없습니다.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {scene.getObjects().map((obj, index) => (
                                <div key={obj.id || index} className="bg-white p-3 rounded border">
                                    <div className="font-mono text-sm">
                                        <div className="font-semibold text-gray-900">{obj.type}</div>
                                        <div className="text-gray-600">ID: {obj.id}</div>
                                        <div className="text-gray-600">
                                            Position: ({Math.round(obj.x)}, {Math.round(obj.y)})
                                        </div>
                                        {obj.type === 'rect' && (
                                            <div className="text-gray-600">
                                                Size: {Math.round(obj.width)}×{Math.round(obj.height)}
                                            </div>
                                        )}
                                        {obj.type === 'circle' && (
                                            <div className="text-gray-600">
                                                Radius: {Math.round(obj.radius)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
