import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { Scene, CommandHistory } from '@canvas-kit/core';
import type { DrawingObject } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';
import { FreeDrawingCanvas } from './FreeDrawingCanvas';
import { EditableText } from './EditableText';

export type DesignerTool = 'select' | 'draw' | 'text' | 'rect' | 'circle';

export interface DrawingTool {
    mode: 'brush' | 'eraser';
    color: string;
    width: number;
}

export interface TextObject {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
    width: number;
}

export interface AdvancedDesignerProps {
    width: number;
    height: number;
    scene: Scene;
    onSceneChange?: (scene: Scene) => void;
    onSelectionChange?: (selectedObjects: DrawingObject[]) => void;
    commandHistory?: CommandHistory;
    showToolbar?: boolean;
    enableKeyboardShortcuts?: boolean;
    enableUndoRedo?: boolean;
}

export const AdvancedDesigner: React.FC<AdvancedDesignerProps> = ({
    width,
    height,
    scene,
    onSceneChange,
    onSelectionChange,
    commandHistory = new CommandHistory(),
    showToolbar = true,
    enableKeyboardShortcuts = true,
    enableUndoRedo = true
}) => {
    const [currentTool, setCurrentTool] = useState<DesignerTool>('select');
    const [drawingTool, setDrawingTool] = useState<DrawingTool>({
        mode: 'brush',
        color: '#000000',
        width: 5
    });
    const [textObjects, setTextObjects] = useState<TextObject[]>([]);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

    const stageRef = useRef<any>(null);

    // 키보드 단축키 처리
    useEffect(() => {
        if (!enableKeyboardShortcuts) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 입력 필드에서는 단축키 비활성화
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isCtrl = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            if (enableUndoRedo && isCtrl) {
                if (e.key === 'z' && !isShift) {
                    e.preventDefault();
                    if (commandHistory.canUndo()) {
                        commandHistory.undo();
                        console.log('Undo executed via keyboard shortcut');
                    }
                } else if ((e.key === 'y') || (e.key === 'z' && isShift)) {
                    e.preventDefault();
                    if (commandHistory.canRedo()) {
                        commandHistory.redo();
                        console.log('Redo executed via keyboard shortcut');
                    }
                }
            }

            // 도구 전환 단축키
            if (!isCtrl && !isShift) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        setCurrentTool('select');
                        break;
                    case '2':
                        e.preventDefault();
                        setCurrentTool('draw');
                        break;
                    case '3':
                        e.preventDefault();
                        setCurrentTool('text');
                        break;
                    case '4':
                        e.preventDefault();
                        setCurrentTool('rect');
                        break;
                    case '5':
                        e.preventDefault();
                        setCurrentTool('circle');
                        break;
                    case 'Escape':
                        e.preventDefault();
                        setCurrentTool('select');
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableKeyboardShortcuts, enableUndoRedo, commandHistory]);

    // 디버깅을 위한 command history 상태 추적
    useEffect(() => {
        const handleHistoryChange = () => {
            console.log('Command history changed:', {
                canUndo: commandHistory.canUndo(),
                canRedo: commandHistory.canRedo()
            });
        };

        // CommandHistory에 이벤트 리스너가 있다면 추가
        // 현재는 수동으로 상태 변경을 감지하기 위해 interval 사용
        const interval = setInterval(handleHistoryChange, 1000);

        return () => clearInterval(interval);
    }, [commandHistory]);

    const handleToolChange = useCallback((tool: DesignerTool) => {
        setCurrentTool(tool);
        if (tool !== 'text') {
            setSelectedTextId(null);
        }
    }, []);

    const handleDrawingToolChange = useCallback((tool: DrawingTool) => {
        setDrawingTool(tool);
    }, []);

    // 텍스트 관련 핸들러들
    const handleTextChange = useCallback((id: string, newText: string) => {
        setTextObjects(prev => prev.map(text =>
            text.id === id ? { ...text, text: newText } : text
        ));
    }, []);

    const handleTextSelect = useCallback((id: string) => {
        setSelectedTextId(selectedTextId === id ? null : id);
    }, [selectedTextId]);

    const handleTextTransform = useCallback((id: string, attrs: any) => {
        setTextObjects(prev => prev.map(text =>
            text.id === id ? { ...text, ...attrs } : text
        ));
    }, []);

    const addTextAtPosition = useCallback((x: number, y: number) => {
        const newText: TextObject = {
            id: `text-${Date.now()}`,
            x,
            y,
            text: 'New text',
            fontSize: 20,
            fontFamily: 'Arial',
            fill: '#000000',
            width: 200
        };

        setTextObjects(prev => [...prev, newText]);
        setSelectedTextId(newText.id);
    }, []);

    // 스테이지 클릭 핸들러
    const handleStageClick = useCallback((e: any) => {
        if (currentTool === 'text') {
            const pos = e.target.getStage().getPointerPosition();
            if (pos) {
                addTextAtPosition(pos.x, pos.y);
            }
        }
    }, [currentTool, addTextAtPosition]);

    const tools = [
        { id: 'select', label: '선택', icon: '↖️', shortcut: '1' },
        { id: 'draw', label: '그리기', icon: '✏️', shortcut: '2' },
        { id: 'text', label: '텍스트', icon: '📝', shortcut: '3' },
        { id: 'rect', label: '사각형', icon: '⬜', shortcut: '4' },
        { id: 'circle', label: '원', icon: '⭕', shortcut: '5' }
    ];

    const brushColors = [
        '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
        '#ff00ff', '#00ffff', '#ff8800', '#8800ff', '#888888'
    ];

    return (
        <div className="flex flex-col h-full">
            {showToolbar && (
                <div className="bg-gray-100 border-b border-gray-300 p-3">
                    <div className="flex items-center gap-4">
                        {/* 툴 선택 */}
                        <div className="flex gap-1">
                            {tools.map(tool => (
                                <button
                                    key={tool.id}
                                    onClick={() => handleToolChange(tool.id as DesignerTool)}
                                    className={`px-3 py-2 rounded transition-colors ${currentTool === tool.id
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white hover:bg-gray-50 border border-gray-300'
                                        }`}
                                    title={`${tool.label} ${enableKeyboardShortcuts ? `(${tool.shortcut})` : ''}`}
                                >
                                    <span className="mr-1">{tool.icon}</span>
                                    {tool.label}
                                    {enableKeyboardShortcuts && (
                                        <kbd className="ml-2 px-1 py-0.5 text-xs bg-gray-200 text-gray-600 rounded border">
                                            {tool.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* 그리기 도구 설정 */}
                        {currentTool === 'draw' && (
                            <>
                                <div className="h-6 w-px bg-gray-300" />

                                {/* 브러시/지우개 */}
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDrawingToolChange({ ...drawingTool, mode: 'brush' })}
                                        className={`px-2 py-1 rounded text-sm ${drawingTool.mode === 'brush'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white border border-gray-300'
                                            }`}
                                    >
                                        🖌️ 브러시
                                    </button>
                                    <button
                                        onClick={() => handleDrawingToolChange({ ...drawingTool, mode: 'eraser' })}
                                        className={`px-2 py-1 rounded text-sm ${drawingTool.mode === 'eraser'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-white border border-gray-300'
                                            }`}
                                    >
                                        🧹 지우개
                                    </button>
                                </div>

                                {/* 색상 팔레트 */}
                                {drawingTool.mode === 'brush' && (
                                    <div className="flex gap-1">
                                        {brushColors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => handleDrawingToolChange({ ...drawingTool, color })}
                                                className={`w-6 h-6 rounded border-2 ${drawingTool.color === color
                                                    ? 'border-gray-800'
                                                    : 'border-gray-300'
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* 두께 조절 */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">두께:</span>
                                    <input
                                        type="range"
                                        min="1"
                                        max="20"
                                        value={drawingTool.width}
                                        onChange={(e) => handleDrawingToolChange({
                                            ...drawingTool,
                                            width: parseInt(e.target.value)
                                        })}
                                        className="w-20"
                                    />
                                    <span className="text-sm text-gray-600 w-6">{drawingTool.width}</span>
                                </div>
                            </>
                        )}

                        {/* 실행 취소/다시 실행 */}
                        {enableUndoRedo && (
                            <>
                                <div className="h-6 w-px bg-gray-300" />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            commandHistory.undo();
                                            console.log('Undo executed via toolbar button');
                                        }}
                                        disabled={!commandHistory.canUndo()}
                                        className="px-3 py-1 rounded text-sm bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        title={`실행 취소 ${enableKeyboardShortcuts ? '(Ctrl+Z)' : ''}`}
                                    >
                                        ↶ 실행 취소
                                    </button>
                                    <button
                                        onClick={() => {
                                            commandHistory.redo();
                                            console.log('Redo executed via toolbar button');
                                        }}
                                        disabled={!commandHistory.canRedo()}
                                        className="px-3 py-1 rounded text-sm bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        title={`다시 실행 ${enableKeyboardShortcuts ? '(Ctrl+Y)' : ''}`}
                                    >
                                        ↷ 다시 실행
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 relative">
                {/* 기본 디자이너 (선택, 도형 등) */}
                {currentTool === 'select' && (
                    <KonvaDesigner
                        width={width}
                        height={height}
                        scene={scene}
                        onSceneChange={onSceneChange}
                        onSelectionChange={onSelectionChange}
                        enableKeyboardShortcuts={enableKeyboardShortcuts}
                        enableTextEditing={true}
                        enableMultiSelect={true}
                        enableRectangleSelection={true}
                    />
                )}

                {/* 자유 그리기 및 텍스트를 위한 별도 Stage */}
                {(currentTool === 'draw' || currentTool === 'text') && (
                    <Stage
                        width={width}
                        height={height}
                        ref={stageRef}
                        onClick={handleStageClick}
                    >
                        <Layer>
                            {/* 자유 그리기 */}
                            {currentTool === 'draw' && (
                                <FreeDrawingCanvas
                                    width={width}
                                    height={height}
                                    tool={drawingTool}
                                    stage={stageRef.current || undefined}
                                />
                            )}

                            {/* 텍스트 객체들 */}
                            {currentTool === 'text' && textObjects.map(text => (
                                <EditableText
                                    key={text.id}
                                    x={text.x}
                                    y={text.y}
                                    text={text.text}
                                    fontSize={text.fontSize}
                                    fontFamily={text.fontFamily}
                                    fill={text.fill}
                                    width={text.width}
                                    isSelected={selectedTextId === text.id}
                                    onTextChange={(newText) => handleTextChange(text.id, newText)}
                                    onSelect={() => handleTextSelect(text.id)}
                                    onTransform={(attrs) => handleTextTransform(text.id, attrs)}
                                />
                            ))}
                        </Layer>
                    </Stage>
                )}

                {/* 툴 안내 */}
                {currentTool === 'text' && (
                    <div className="absolute bottom-4 left-4 bg-blue-100 border border-blue-300 rounded p-2 text-sm">
                        💡 캔버스를 클릭하여 텍스트를 추가하세요
                    </div>
                )}

                {/* 키보드 단축키 안내 */}
                {enableKeyboardShortcuts && (
                    <div className="absolute bottom-4 right-4 bg-gray-100 border border-gray-300 rounded p-3 text-xs max-w-xs">
                        <h4 className="font-medium mb-2">⌨️ 키보드 단축키</h4>
                        <div className="space-y-1">
                            {enableUndoRedo && (
                                <>
                                    <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Z</kbd> 실행 취소</div>
                                    <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+Y</kbd> 다시 실행</div>
                                </>
                            )}
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">1</kbd> 선택 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">2</kbd> 그리기 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">3</kbd> 텍스트 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">4</kbd> 사각형 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">5</kbd> 원 도구</div>
                            <div><kbd className="px-1 py-0.5 bg-white rounded border text-xs">Esc</kbd> 선택 도구로 복귀</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
