import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Transformer } from 'react-konva';
import { Scene, SelectionUtils } from '@canvas-kit/core';
import type { DrawingObject, SelectionMode } from '@canvas-kit/core';
import Konva from 'konva';

// Canvas 선택을 위한 특별한 타입을 로컬에서 정의
interface CanvasSelection {
    type: 'canvas';
    id: 'canvas';
    x: 0;
    y: 0;
}

type SelectableElement = DrawingObject | CanvasSelection;

interface SimpleSelectionDemoProps {
    width: number;
    height: number;
    scene: Scene;
    onSelectionChange?: (selectedObjects: DrawingObject[]) => void;
    onCanvasSelection?: () => void;
}

export const SimpleSelectionDemo: React.FC<SimpleSelectionDemoProps> = ({
    width,
    height,
    scene,
    onSelectionChange,
    onCanvasSelection
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isCanvasSelected, setIsCanvasSelected] = useState<boolean>(false);
    const [selectionRect, setSelectionRect] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
        visible: boolean;
    }>({ x: 0, y: 0, width: 0, height: 0, visible: false });

    const objects = scene.getObjects();

    // Canvas 선택 객체 생성
    const canvasSelection: CanvasSelection = {
        type: 'canvas',
        id: 'canvas',
        x: 0,
        y: 0
    };

    // 객체 ID 생성
    const getObjectId = (obj: DrawingObject): string => {
        return obj.id || `${obj.type}-${Math.random()}`;
    };

    // 객체 클릭 처리
    const handleObjectClick = useCallback((id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
        console.log('Object clicked:', id);

        // 객체 클릭 시 캔버스 선택 해제
        setIsCanvasSelected(false);

        const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;

        if (isCtrlPressed) {
            // Ctrl + 클릭: 토글 선택
            setSelectedIds(prev => {
                const newSelection = prev.includes(id)
                    ? prev.filter(selectedId => selectedId !== id)
                    : [...prev, id];
                console.log('Multi-select result:', newSelection);
                return newSelection;
            });
        } else {
            // 일반 클릭: 단일 선택
            setSelectedIds([id]);
            console.log('Single select:', id);
        }

        e.cancelBubble = true;
    }, []);

    // 스테이지 클릭 처리 (빈 영역)
    const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            console.log('Empty area clicked - selecting canvas');
            setSelectedIds([]);
            setIsCanvasSelected(true);
            if (onCanvasSelection) {
                onCanvasSelection();
            }
        }
    }, [onCanvasSelection]);

    // 범위 선택 시작
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectStart, setSelectStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (!clickedOnEmpty) return;

        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;

        console.log('Starting rectangle selection at:', pointer);
        setIsSelecting(true);
        setSelectStart(pointer);
        setSelectionRect({ x: pointer.x, y: pointer.y, width: 0, height: 0, visible: true });
    }, []);

    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isSelecting) return;

        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;

        const newRect = {
            x: Math.min(selectStart.x, pointer.x),
            y: Math.min(selectStart.y, pointer.y),
            width: Math.abs(pointer.x - selectStart.x),
            height: Math.abs(pointer.y - selectStart.y),
            visible: true
        };

        setSelectionRect(newRect);
    }, [isSelecting, selectStart]);

    const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isSelecting) return;

        console.log('Ending rectangle selection');
        setIsSelecting(false);
        setSelectionRect(prev => ({ ...prev, visible: false }));

        // 범위 내 객체 찾기
        const rect = {
            x: selectionRect.x,
            y: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height
        };

        if (rect.width > 5 && rect.height > 5) {
            const selectedObjects = objects.filter(obj => {
                return SelectionUtils.isObjectCompletelyInRect(obj, rect);
            });

            const newSelectedIds = selectedObjects.map(obj => getObjectId(obj));
            console.log('Rectangle selection result:', newSelectedIds);

            // 범위 선택 시 캔버스 선택 해제
            setIsCanvasSelected(false);

            const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
            if (isCtrlPressed) {
                // Ctrl + 드래그: 기존 선택에 추가
                setSelectedIds(prev => [...new Set([...prev, ...newSelectedIds])]);
            } else {
                // 일반 드래그: 새로운 선택
                setSelectedIds(newSelectedIds);
            }
        }
    }, [isSelecting, selectionRect, objects]);

    // 선택 변경 알림
    useEffect(() => {
        if (isCanvasSelected) {
            // 캔버스가 선택된 경우 빈 배열을 전달하지만 내부적으로는 캔버스 선택 상태 유지
            console.log('Selection changed: canvas selected');
            if (onSelectionChange) {
                onSelectionChange([]);
            }
        } else {
            const selectedObjects = objects.filter(obj => selectedIds.includes(getObjectId(obj)));
            console.log('Selection changed:', selectedObjects);
            if (onSelectionChange) {
                onSelectionChange(selectedObjects);
            }
        }
    }, [selectedIds, isCanvasSelected, objects, onSelectionChange]);

    // Transformer 업데이트
    useEffect(() => {
        if (!transformerRef.current) return;

        const stage = stageRef.current;
        if (!stage) return;

        const selectedNodes: Konva.Node[] = [];
        selectedIds.forEach(id => {
            const node = stage.findOne(`#${id}`);
            if (node) {
                selectedNodes.push(node);
            }
        });

        transformerRef.current.nodes(selectedNodes);
    }, [selectedIds]);

    // 객체 렌더링
    const renderObject = (obj: DrawingObject) => {
        const id = getObjectId(obj);
        const isSelected = selectedIds.includes(id);

        const commonProps = {
            id,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleObjectClick(id, e),
            stroke: isSelected ? '#007bff' : obj.stroke,
            strokeWidth: isSelected ? 3 : (obj.strokeWidth || 1),
            draggable: true
        };

        switch (obj.type) {
            case 'rect':
                return (
                    <Rect
                        key={id}
                        {...commonProps}
                        x={obj.x}
                        y={obj.y}
                        width={(obj as any).width}
                        height={(obj as any).height}
                        fill={(obj as any).fill || '#ff0000'}
                    />
                );

            case 'circle':
                return (
                    <Circle
                        key={id}
                        {...commonProps}
                        x={obj.x}
                        y={obj.y}
                        radius={(obj as any).radius}
                        fill={(obj as any).fill || '#00ff00'}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <Stage
            width={width}
            height={height}
            ref={stageRef}
            onClick={handleStageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <Layer>
                {/* 객체들 렌더링 */}
                {objects.map(renderObject)}

                {/* 범위 선택 박스 */}
                {selectionRect.visible && (
                    <Rect
                        x={selectionRect.x}
                        y={selectionRect.y}
                        width={selectionRect.width}
                        height={selectionRect.height}
                        fill="rgba(0, 123, 255, 0.1)"
                        stroke="#007bff"
                        strokeWidth={1}
                        dash={[5, 5]}
                        listening={false}
                    />
                )}

                {/* Transformer */}
                <Transformer ref={transformerRef} />
            </Layer>
        </Stage>
    );
};

export default SimpleSelectionDemo;
