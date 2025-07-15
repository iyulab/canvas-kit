'use client';

import React, { useState, useCallback } from 'react';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner, CommandHistory, AddCommand } from '@canvas-kit/designer';
import type { DrawingObject } from '@canvas-kit/core';

export default function UndoRedoSample() {
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

    // Scene 변경 처리
    const handleSceneChange = useCallback((newScene: Scene) => {
        setScene(newScene);
        // 히스토리 상태 업데이트
        setHistoryStatus(commandHistory.getStatus());
    }, [commandHistory]);

    // 선택 변경 처리
    const handleSelectionChange = useCallback((objects: DrawingObject[]) => {
        setSelectedObjects(objects);
    }, []);

    // 사각형 추가
    const addRectangle = useCallback(() => {
        const newRect: DrawingObject = {
            id: `rect-${Date.now()}`,
            type: 'rect',
            x: Math.random() * 200 + 50,
            y: Math.random() * 200 + 50,
            width: 80,
            height: 60,
            fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
            stroke: '#333',
            strokeWidth: 1
        };

        const addCommand = new AddCommand(newRect, scene);
        commandHistory.execute(addCommand);
        handleSceneChange(scene);
    }, [scene, commandHistory, handleSceneChange]);

    // 원 추가
    const addCircle = useCallback(() => {
        const newCircle: DrawingObject = {
            id: `circle-${Date.now()}`,
            type: 'circle',
            x: Math.random() * 200 + 50,
            y: Math.random() * 200 + 50,
            radius: Math.random() * 30 + 20,
            fill: `hsl(${Math.random() * 360}, 70%, 50%)`,
            stroke: '#333',
            strokeWidth: 1
        };

        const addCommand = new AddCommand(newCircle, scene);
        commandHistory.execute(addCommand);
        handleSceneChange(scene);
    }, [scene, commandHistory, handleSceneChange]);

    // 수동 Undo
    const handleUndo = useCallback(() => {
        if (commandHistory.undo()) {
            handleSceneChange(scene);
        }
    }, [commandHistory, scene, handleSceneChange]);

    // 수동 Redo
    const handleRedo = useCallback(() => {
        if (commandHistory.redo()) {
            handleSceneChange(scene);
        }
    }, [commandHistory, scene, handleSceneChange]);

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Undo/Redo System Demo
                </h1>
                <p className="text-gray-600 mb-4">
                    Command Pattern 기반 실행 취소/다시 실행 시스템 데모입니다.
                </p>

                {/* 컨트롤 버튼들 */}
                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        onClick={addRectangle}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                        사각형 추가
                    </button>
                    <button
                        onClick={addCircle}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                    >
                        원 추가
                    </button>
                    <div className="border-l border-gray-300 mx-2"></div>
                    <button
                        onClick={handleUndo}
                        disabled={!historyStatus.canUndo}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        ⟲ Undo (Ctrl+Z)
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={!historyStatus.canRedo}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        ⟳ Redo (Ctrl+Y)
                    </button>
                </div>

                {/* 히스토리 상태 정보 */}
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Command History Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Undo Count:</span>
                            <span className="ml-2 font-mono">{historyStatus.undoCount}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Redo Count:</span>
                            <span className="ml-2 font-mono">{historyStatus.redoCount}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Can Undo:</span>
                            <span className={`ml-2 font-mono ${historyStatus.canUndo ? 'text-green-600' : 'text-red-600'}`}>
                                {historyStatus.canUndo ? '✓' : '✗'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">Can Redo:</span>
                            <span className={`ml-2 font-mono ${historyStatus.canRedo ? 'text-green-600' : 'text-red-600'}`}>
                                {historyStatus.canRedo ? '✓' : '✗'}
                            </span>
                        </div>
                    </div>
                    {historyStatus.lastCommand && (
                        <div className="mt-2">
                            <span className="text-gray-600">Last Command:</span>
                            <span className="ml-2 font-mono text-blue-600">{historyStatus.lastCommand}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 사용법 안내 */}
            <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400">
                <h3 className="font-semibold text-blue-900 mb-2">사용법:</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                    <li>• 객체를 드래그하여 이동 (자동으로 MoveCommand 생성)</li>
                    <li>• 객체를 선택 후 모서리를 드래그하여 크기 변경 (ResizeCommand 생성)</li>
                    <li>• <kbd className="bg-blue-200 px-1 rounded">Ctrl+Z</kbd>로 실행 취소</li>
                    <li>• <kbd className="bg-blue-200 px-1 rounded">Ctrl+Y</kbd> 또는 <kbd className="bg-blue-200 px-1 rounded">Ctrl+Shift+Z</kbd>로 다시 실행</li>
                    <li>• 최대 50개의 명령을 기억합니다</li>
                </ul>
            </div>

            {/* 선택된 객체 정보 */}
            {selectedObjects.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <h3 className="font-semibold text-green-900 mb-2">
                        선택된 객체 ({selectedObjects.length}개):
                    </h3>
                    <div className="space-y-1">
                        {selectedObjects.map((obj, index) => (
                            <div key={obj.id || index} className="text-sm text-green-800">
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
                    commandHistory={commandHistory}
                    enableMultiSelect={true}
                    enableRectangleSelection={true}
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
