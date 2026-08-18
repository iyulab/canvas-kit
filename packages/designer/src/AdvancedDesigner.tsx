import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Rect as KonvaRect, Circle as KonvaCircle, Line as KonvaLine, Text as KonvaText } from 'react-konva';
import { Scene, CommandHistory, AddCommand } from '@canvas-kit/core';
import type { DrawingObject, CommandHistoryEvent } from '@canvas-kit/core';
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

interface PreviewShape {
    type: 'rect' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
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
    const [historyState, setHistoryState] = useState({
        canUndo: commandHistory.canUndo(),
        canRedo: commandHistory.canRedo()
    });

    const [drawStartPoint, setDrawStartPoint] = useState<{ x: number; y: number } | null>(null);
    const [previewShape, setPreviewShape] = useState<PreviewShape | null>(null);

    const stageRef = useRef<any>(null);

    // CommandHistory 이벤트 구독 (폴링 대체)
    useEffect(() => {
        if (!enableUndoRedo) return;

        const handleHistoryChange = (event: CommandHistoryEvent) => {
            setHistoryState({ canUndo: event.canUndo, canRedo: event.canRedo });
        };

        commandHistory.addEventListener(handleHistoryChange);
        return () => commandHistory.removeEventListener(handleHistoryChange);
    }, [commandHistory, enableUndoRedo]);

    // 키보드 단축키 처리
    useEffect(() => {
        if (!enableKeyboardShortcuts) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isCtrl = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            if (enableUndoRedo && isCtrl) {
                if (e.key === 'z' && !isShift) {
                    e.preventDefault();
                    commandHistory.undo();
                } else if (e.key === 'y' || (e.key === 'z' && isShift)) {
                    e.preventDefault();
                    commandHistory.redo();
                }
            }

            if (!isCtrl && !isShift) {
                switch (e.key) {
                    case '1': e.preventDefault(); setCurrentTool('select'); break;
                    case '2': e.preventDefault(); setCurrentTool('draw'); break;
                    case '3': e.preventDefault(); setCurrentTool('text'); break;
                    case '4': e.preventDefault(); setCurrentTool('rect'); break;
                    case '5': e.preventDefault(); setCurrentTool('circle'); break;
                    case 'Escape': e.preventDefault(); setCurrentTool('select'); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enableKeyboardShortcuts, enableUndoRedo, commandHistory]);

    const handleToolChange = useCallback((tool: DesignerTool) => {
        setCurrentTool(tool);
        setDrawStartPoint(null);
        setPreviewShape(null);
        if (tool !== 'text') {
            setSelectedTextId(null);
        }
    }, []);

    const handleDrawingToolChange = useCallback((tool: DrawingTool) => {
        setDrawingTool(tool);
    }, []);

    const handleTextChange = useCallback((id: string, newText: string) => {
        setTextObjects(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
    }, []);

    const handleTextSelect = useCallback((id: string) => {
        setSelectedTextId(prev => prev === id ? null : id);
    }, []);

    const handleTextTransform = useCallback((id: string, attrs: any) => {
        setTextObjects(prev => prev.map(t => t.id === id ? { ...t, ...attrs } : t));
    }, []);

    const addTextAtPosition = useCallback((x: number, y: number) => {
        const newText: TextObject = {
            id: `text-${Date.now()}`,
            x, y,
            text: 'New text',
            fontSize: 20,
            fontFamily: 'Arial',
            fill: '#000000',
            width: 200
        };
        setTextObjects(prev => [...prev, newText]);
        setSelectedTextId(newText.id);
    }, []);

    const handleShapeMouseDown = useCallback((e: any) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        setDrawStartPoint({ x: pos.x, y: pos.y });
    }, []);

    const handleShapeMouseMove = useCallback((e: any) => {
        if (!drawStartPoint) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;

        if (currentTool === 'rect') {
            const x = Math.min(drawStartPoint.x, pos.x);
            const y = Math.min(drawStartPoint.y, pos.y);
            const w = Math.abs(pos.x - drawStartPoint.x);
            const h = Math.abs(pos.y - drawStartPoint.y);
            setPreviewShape({ type: 'rect', x, y, width: w, height: h, radius: 0 });
        } else if (currentTool === 'circle') {
            const dx = pos.x - drawStartPoint.x;
            const dy = pos.y - drawStartPoint.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            setPreviewShape({
                type: 'circle',
                x: drawStartPoint.x,
                y: drawStartPoint.y,
                width: 0,
                height: 0,
                radius
            });
        }
    }, [drawStartPoint, currentTool]);

    const handleShapeMouseUp = useCallback(() => {
        if (!drawStartPoint || !previewShape) {
            setDrawStartPoint(null);
            setPreviewShape(null);
            return;
        }

        const minSize = 5;
        if (previewShape.type === 'rect' && (previewShape.width < minSize || previewShape.height < minSize)) {
            setDrawStartPoint(null);
            setPreviewShape(null);
            return;
        }
        if (previewShape.type === 'circle' && previewShape.radius < minSize) {
            setDrawStartPoint(null);
            setPreviewShape(null);
            return;
        }

        let newObj: DrawingObject;
        if (previewShape.type === 'rect') {
            newObj = {
                id: `rect-${Date.now()}`,
                type: 'rect',
                x: previewShape.x,
                y: previewShape.y,
                width: previewShape.width,
                height: previewShape.height,
                fill: '#4A90E2',
                stroke: '#2563EB',
                strokeWidth: 1
            };
        } else {
            newObj = {
                id: `circle-${Date.now()}`,
                type: 'circle',
                x: previewShape.x,
                y: previewShape.y,
                radius: previewShape.radius,
                fill: '#E24A4A',
                stroke: '#B91C1C',
                strokeWidth: 1
            };
        }

        const cmd = new AddCommand(newObj, scene);
        commandHistory.execute(cmd);
        onSceneChange?.(scene);

        setDrawStartPoint(null);
        setPreviewShape(null);
    }, [drawStartPoint, previewShape, scene, commandHistory, onSceneChange]);

    const handleStageClick = useCallback((e: any) => {
        if (currentTool === 'text') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                addTextAtPosition(pos.x, pos.y);
            }
        }
    }, [currentTool, addTextAtPosition]);

    // 도구 전환 시 기존 씬 객체를 비상호작용 배경 레이어로 렌더링
    const renderSceneBackground = useCallback(() => (
        <Layer listening={false}>
            {scene.getObjects().map(obj => {
                switch (obj.type) {
                    case 'rect':
                        return <KonvaRect key={obj.id} x={obj.x} y={obj.y} width={(obj as any).width} height={(obj as any).height} fill={obj.fill} stroke={obj.stroke} strokeWidth={obj.strokeWidth} />;
                    case 'circle':
                        return <KonvaCircle key={obj.id} x={obj.x} y={obj.y} radius={(obj as any).radius} fill={obj.fill} stroke={obj.stroke} strokeWidth={obj.strokeWidth} />;
                    case 'line':
                        return <KonvaLine key={obj.id} points={(obj as any).points} stroke={obj.stroke || 'black'} strokeWidth={obj.strokeWidth || 1} />;
                    case 'text':
                        return <KonvaText key={obj.id} x={obj.x} y={obj.y} text={(obj as any).text} fontSize={(obj as any).fontSize || 16} fill={obj.fill || 'black'} />;
                    default:
                        return null;
                }
            })}
        </Layer>
    ), [scene]);

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

    const isDrawingShapeTool = currentTool === 'rect' || currentTool === 'circle';

    return (
        <div className="flex flex-col h-full">
            {showToolbar && (
                <div className="bg-gray-100 border-b border-gray-300 p-3">
                    <div className="flex items-center gap-4">
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

                        {currentTool === 'draw' && (
                            <>
                                <div className="h-6 w-px bg-gray-300" />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleDrawingToolChange({ ...drawingTool, mode: 'brush' })}
                                        className={`px-2 py-1 rounded text-sm ${drawingTool.mode === 'brush' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'}`}
                                    >
                                        🖌️ 브러시
                                    </button>
                                    <button
                                        onClick={() => handleDrawingToolChange({ ...drawingTool, mode: 'eraser' })}
                                        className={`px-2 py-1 rounded text-sm ${drawingTool.mode === 'eraser' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-300'}`}
                                    >
                                        🧹 지우개
                                    </button>
                                </div>
                                {drawingTool.mode === 'brush' && (
                                    <div className="flex gap-1">
                                        {brushColors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => handleDrawingToolChange({ ...drawingTool, color })}
                                                className={`w-6 h-6 rounded border-2 ${drawingTool.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">두께:</span>
                                    <input
                                        type="range" min="1" max="20"
                                        value={drawingTool.width}
                                        onChange={(e) => handleDrawingToolChange({ ...drawingTool, width: parseInt(e.target.value) })}
                                        className="w-20"
                                    />
                                    <span className="text-sm text-gray-600 w-6">{drawingTool.width}</span>
                                </div>
                            </>
                        )}

                        {enableUndoRedo && (
                            <>
                                <div className="h-6 w-px bg-gray-300" />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => commandHistory.undo()}
                                        disabled={!historyState.canUndo}
                                        className="px-3 py-1 rounded text-sm bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                        title={`실행 취소 ${enableKeyboardShortcuts ? '(Ctrl+Z)' : ''}`}
                                    >
                                        ↶ 실행 취소
                                    </button>
                                    <button
                                        onClick={() => commandHistory.redo()}
                                        disabled={!historyState.canRedo}
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
                {currentTool === 'select' && (
                    <KonvaDesigner
                        width={width}
                        height={height}
                        scene={scene}
                        onSceneChange={onSceneChange}
                        onSelectionChange={onSelectionChange}
                        enableMultiSelect={true}
                    />
                )}

                {(currentTool === 'draw' || currentTool === 'text') && (
                    <Stage
                        width={width}
                        height={height}
                        ref={stageRef}
                        onClick={handleStageClick}
                    >
                        {renderSceneBackground()}
                        <Layer>
                            {currentTool === 'draw' && (
                                <FreeDrawingCanvas
                                    width={width}
                                    height={height}
                                    tool={drawingTool}
                                    stage={stageRef.current || undefined}
                                />
                            )}
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

                {isDrawingShapeTool && (
                    <Stage
                        width={width}
                        height={height}
                        ref={stageRef}
                        style={{ cursor: 'crosshair' }}
                        onMouseDown={handleShapeMouseDown}
                        onMouseMove={handleShapeMouseMove}
                        onMouseUp={handleShapeMouseUp}
                    >
                        {renderSceneBackground()}
                        <Layer>
                            {previewShape?.type === 'rect' && (
                                <KonvaRect
                                    x={previewShape.x}
                                    y={previewShape.y}
                                    width={previewShape.width}
                                    height={previewShape.height}
                                    stroke="#2563EB"
                                    strokeWidth={1}
                                    dash={[4, 4]}
                                    fill="rgba(74, 144, 226, 0.1)"
                                    listening={false}
                                />
                            )}
                            {previewShape?.type === 'circle' && (
                                <KonvaCircle
                                    x={previewShape.x}
                                    y={previewShape.y}
                                    radius={previewShape.radius}
                                    stroke="#B91C1C"
                                    strokeWidth={1}
                                    dash={[4, 4]}
                                    fill="rgba(226, 74, 74, 0.1)"
                                    listening={false}
                                />
                            )}
                        </Layer>
                    </Stage>
                )}

                {currentTool === 'text' && (
                    <div className="absolute bottom-4 left-4 bg-blue-100 border border-blue-300 rounded p-2 text-sm">
                        💡 캔버스를 클릭하여 텍스트를 추가하세요
                    </div>
                )}

                {isDrawingShapeTool && (
                    <div className="absolute bottom-4 left-4 bg-green-100 border border-green-300 rounded p-2 text-sm">
                        💡 드래그하여 {currentTool === 'rect' ? '사각형' : '원'}을 그리세요
                    </div>
                )}

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
