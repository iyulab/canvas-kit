import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect as KonvaRect, Circle as KonvaCircle, Text as KonvaText, Transformer as KonvaTransformer } from 'react-konva';
import { Scene, CommandHistory, MoveCommand, ResizeCommand, CopyCommand, CutCommand, PasteCommand, DuplicateCommand, Clipboard, SelectionUtils } from '@canvas-kit/core';
import type { DrawingObject, Rect, Circle, Text, Point, SelectionMode } from '@canvas-kit/core';
import Konva from 'konva';

interface KonvaDesignerProps {
    width: number;
    height: number;
    scene: Scene;
    onSceneChange?: (scene: Scene) => void;
    onSelectionChange?: (selectedObjects: DrawingObject[]) => void;
    enableMultiSelect?: boolean;
    enableRectangleSelection?: boolean;
    commandHistory?: CommandHistory;
}

export const KonvaDesigner: React.FC<KonvaDesignerProps> = ({
    width,
    height,
    scene,
    onSceneChange,
    onSelectionChange,
    enableMultiSelect = true,
    enableRectangleSelection = true,
    commandHistory = new CommandHistory()
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Undo/Redo를 위한 드래그/변형 시작 상태 추적
    const [dragStartPosition, setDragStartPosition] = useState<Record<string, { x: number; y: number }>>({});
    const [transformStartState, setTransformStartState] = useState<Record<string, any>>({});

    // 마우스 이벤트 상태 관리
    const [isDrawingSelection, setIsDrawingSelection] = useState(false);
    const [selectionStart, setSelectionStart] = useState<Point | null>(null);
    const [selectionCurrent, setSelectionCurrent] = useState<Point | null>(null);
    const [mouseDownPos, setMouseDownPos] = useState<Point | null>(null);

    // Scene 객체들을 Konva ID와 매핑
    const objects = scene.getObjects();

    // 객체 변경 처리 (드래그, 리사이즈 등)
    const handleObjectChange = useCallback((updatedObject: DrawingObject) => {
        if (!onSceneChange) return;

        // Scene의 updateObject 메서드 사용
        const newScene = scene.copy();
        const objIndex = objects.findIndex(obj => getObjectId(obj) === getObjectId(updatedObject));
        if (objIndex !== -1) {
            // 기존 객체 제거 후 새 객체 추가
            newScene.remove(objects[objIndex]);
            newScene.add(updatedObject);
        }

        onSceneChange(newScene);
    }, [scene, objects, onSceneChange]);

    // 드래그 시작 처리
    const handleDragStart = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        setDragStartPosition(prev => ({
            ...prev,
            [id]: { x: node.x(), y: node.y() }
        }));
    }, []);

    // 드래그 종료 처리 (Command 패턴 적용)
    const handleDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        const obj = objects.find(o => getObjectId(o) === id);
        const startPos = dragStartPosition[id];

        if (!obj || !startPos || !onSceneChange) return;

        const newPosition = { x: node.x(), y: node.y() };

        // 위치가 실제로 변경되었는지 확인
        if (Math.abs(startPos.x - newPosition.x) < 1 && Math.abs(startPos.y - newPosition.y) < 1) {
            return;
        }

        console.log('🔄 [DEBUG] Creating MoveCommand:', {
            objectId: obj.id,
            oldPos: startPos,
            newPos: newPosition
        });

        // MoveCommand 생성 및 실행
        const moveCommand = new MoveCommand(obj, startPos, newPosition, scene);
        commandHistory.execute(moveCommand);

        // Scene을 새로 생성하지 않고 기존 Scene을 그대로 전달
        // MoveCommand가 이미 Scene의 객체를 수정했음
        onSceneChange(scene);

        // 드래그 시작 위치 초기화
        setDragStartPosition(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
    }, [objects, dragStartPosition, scene, commandHistory, onSceneChange]);

    // 변형 시작 처리
    const handleTransformStart = useCallback((id: string, e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const obj = objects.find(o => getObjectId(o) === id);
        if (!obj) return;

        const currentState: any = {
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
        };

        if (obj.type === 'rect') {
            const rect = obj as Rect;
            currentState.width = rect.width;
            currentState.height = rect.height;
        } else if (obj.type === 'circle') {
            const circle = obj as Circle;
            currentState.radius = circle.radius;
        }

        setTransformStartState(prev => ({
            ...prev,
            [id]: currentState
        }));
    }, [objects]);

    // 변형(리사이즈) 종료 처리 (Command 패턴 적용)
    const handleTransformEnd = useCallback((id: string, e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const obj = objects.find(o => getObjectId(o) === id);
        const startState = transformStartState[id];

        if (!obj || !startState || !onSceneChange) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        let oldSize: any;
        let newSize: any;
        let updatedObject: DrawingObject;

        if (obj.type === 'rect') {
            const rect = obj as Rect;
            oldSize = {
                x: startState.x,
                y: startState.y,
                width: startState.width,
                height: startState.height
            };
            newSize = {
                x: node.x(),
                y: node.y(),
                width: Math.max(5, rect.width * scaleX),
                height: Math.max(5, rect.height * scaleY)
            };
            updatedObject = {
                ...obj,
                x: newSize.x,
                y: newSize.y,
                width: newSize.width,
                height: newSize.height,
            };
        } else if (obj.type === 'circle') {
            const circle = obj as Circle;
            oldSize = {
                x: startState.x,
                y: startState.y,
                radius: startState.radius
            };
            newSize = {
                x: node.x(),
                y: node.y(),
                radius: Math.max(5, circle.radius * Math.max(scaleX, scaleY))
            };
            updatedObject = {
                ...obj,
                x: newSize.x,
                y: newSize.y,
                radius: newSize.radius,
            };
        } else {
            // 텍스트 등 기본 객체
            oldSize = {
                x: startState.x,
                y: startState.y
            };
            newSize = {
                x: node.x(),
                y: node.y()
            };
            updatedObject = {
                ...obj,
                x: newSize.x,
                y: newSize.y,
            };
        }

        // 실제로 변경되었는지 확인
        const hasChanged = JSON.stringify(oldSize) !== JSON.stringify(newSize);

        if (hasChanged) {
            console.log('🔄 [DEBUG] Creating ResizeCommand:', {
                objectId: obj.id,
                oldSize,
                newSize
            });

            // ResizeCommand 생성 및 실행
            const resizeCommand = new ResizeCommand(obj, oldSize, newSize, scene);
            commandHistory.execute(resizeCommand);
        }

        // 스케일 리셋
        node.scaleX(1);
        node.scaleY(1);

        // Scene을 새로 생성하지 않고 기존 Scene을 그대로 전달
        // ResizeCommand가 이미 Scene의 객체를 수정했음
        if (hasChanged && onSceneChange) {
            onSceneChange(scene);
        }

        // 변형 시작 상태 초기화
        setTransformStartState(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
        });
    }, [objects, transformStartState, scene, commandHistory, onSceneChange]);

    // 키보드 단축키 처리
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    console.log('🔄 [DEBUG] Undo requested');
                    if (commandHistory.undo()) {
                        console.log('🔄 [DEBUG] Undo executed, triggering scene update');
                        if (onSceneChange) {
                            // Scene의 변경을 강제로 알리기 위해 복사본 전달
                            onSceneChange(scene.copy());
                        }
                    }
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    console.log('🔄 [DEBUG] Redo requested');
                    if (commandHistory.redo()) {
                        console.log('🔄 [DEBUG] Redo executed, triggering scene update');
                        if (onSceneChange) {
                            // Scene의 변경을 강제로 알리기 위해 복사본 전달
                            onSceneChange(scene.copy());
                        }
                    }
                } else if (e.key === 'c') {
                    e.preventDefault();
                    handleCopy();
                } else if (e.key === 'x') {
                    e.preventDefault();
                    handleCut();
                } else if (e.key === 'v') {
                    e.preventDefault();
                    handlePaste();
                } else if (e.key === 'd') {
                    e.preventDefault();
                    handleDuplicate();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commandHistory, scene, onSceneChange, selectedIds]);

    // Copy/Paste/Cut/Duplicate 핸들러들
    const handleCopy = useCallback(() => {
        const selectedObjects = objects.filter((obj: DrawingObject) =>
            selectedIds.includes(getObjectId(obj))
        );

        if (selectedObjects.length > 0) {
            const copyCommand = new CopyCommand(selectedObjects);
            commandHistory.execute(copyCommand);
        }
    }, [selectedIds, objects, commandHistory]);

    const handleCut = useCallback(() => {
        const selectedObjects = objects.filter((obj: DrawingObject) =>
            selectedIds.includes(getObjectId(obj))
        );

        if (selectedObjects.length > 0 && onSceneChange) {
            const cutCommand = new CutCommand(selectedObjects, scene);
            commandHistory.execute(cutCommand);

            // Scene 업데이트
            const newScene = new Scene();
            objects.forEach((obj: DrawingObject) => {
                if (!selectedIds.includes(getObjectId(obj))) {
                    newScene.add(obj);
                }
            });
            onSceneChange(newScene);

            // 선택 해제
            setSelectedIds([]);
            if (onSelectionChange) {
                onSelectionChange([]);
            }
        }
    }, [selectedIds, objects, scene, commandHistory, onSceneChange, onSelectionChange]);

    const handlePaste = useCallback(() => {
        if (!onSceneChange) return;

        const clipboard = Clipboard.getInstance();
        if (clipboard.isEmpty()) return;

        const pasteCommand = new PasteCommand(scene);
        commandHistory.execute(pasteCommand);

        // Scene 업데이트
        const newScene = new Scene();
        objects.forEach((obj: DrawingObject) => newScene.add(obj));

        // 붙여넣은 객체들 추가
        const pastedObjects = clipboard.paste();
        pastedObjects.forEach((obj: DrawingObject) => newScene.add(obj));

        onSceneChange(newScene);

        // 붙여넣은 객체들 선택
        const pastedIds = pastedObjects.map((obj: DrawingObject) => getObjectId(obj));
        setSelectedIds(pastedIds);
        if (onSelectionChange) {
            onSelectionChange(pastedObjects);
        }
    }, [scene, objects, commandHistory, onSceneChange, onSelectionChange]);

    const handleDuplicate = useCallback(() => {
        const selectedObjects = objects.filter((obj: DrawingObject) =>
            selectedIds.includes(getObjectId(obj))
        );

        if (selectedObjects.length > 0 && onSceneChange) {
            const duplicateCommand = new DuplicateCommand(selectedObjects, scene);
            commandHistory.execute(duplicateCommand);

            // Scene 업데이트
            const newScene = new Scene();
            objects.forEach((obj: DrawingObject) => newScene.add(obj));

            // 중복된 객체들 추가
            const duplicatedObjects = selectedObjects.map((obj: DrawingObject) => ({
                ...obj,
                id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                x: obj.x + 20,
                y: obj.y + 20
            }));
            duplicatedObjects.forEach((obj: DrawingObject) => newScene.add(obj));

            onSceneChange(newScene);

            // 중복된 객체들 선택
            const duplicatedIds = duplicatedObjects.map((obj: DrawingObject) => getObjectId(obj));
            setSelectedIds(duplicatedIds);
            if (onSelectionChange) {
                onSelectionChange(duplicatedObjects);
            }
        }
    }, [selectedIds, objects, scene, commandHistory, onSceneChange, onSelectionChange]);

    // Rectangle Selection 처리
    const handleRectangleSelection = useCallback((rect: { x: number, y: number, width: number, height: number }, mode: SelectionMode = 'replace') => {
        const rectSelection = SelectionUtils.getObjectsInRect(rect, objects, 'complete');
        const currentSelection = objects.filter(obj => selectedIds.includes(getObjectId(obj)));
        const newSelection = SelectionUtils.updateSelection(currentSelection, rectSelection, mode);

        const newSelectedIds = newSelection.map(obj => getObjectId(obj));
        setSelectedIds(newSelectedIds);

        // 선택된 객체들을 콜백으로 전달
        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
    }, [objects, selectedIds, onSelectionChange]);

    // 선택 처리 - SelectionUtils 사용
    const handleSelect = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
        console.log('🔴 [DEBUG] handleSelect called');
        console.log('  - Clicked ID:', id);
        console.log('  - All objects:', objects.map(o => ({ id: getObjectId(o), type: o.type })));
        console.log('  - Current selectedIds:', selectedIds);

        const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
        const isShiftPressed = e.evt.shiftKey;

        // 선택 모드 결정
        let mode: SelectionMode = 'replace';
        if (isCtrlPressed && isShiftPressed) {
            mode = 'subtract';
        } else if (isCtrlPressed) {
            mode = 'add';
        }
        console.log('  - Selection mode:', mode);

        const obj = objects.find(o => getObjectId(o) === id);
        console.log('  - Found object:', obj);
        if (!obj) {
            console.log('  - ❌ Object not found!');
            return;
        }

        const currentSelection = objects.filter(o => selectedIds.includes(getObjectId(o)));
        console.log('  - Current selection objects:', currentSelection);

        const newSelection = SelectionUtils.updateSelection(currentSelection, [obj], mode);
        console.log('  - New selection after update:', newSelection);

        const newSelectedIds = newSelection.map(o => getObjectId(o));
        console.log('  - New selected IDs:', newSelectedIds);

        setSelectedIds(newSelectedIds);

        // 선택된 객체들을 콜백으로 전달
        if (onSelectionChange) {
            console.log('  - Calling onSelectionChange with:', newSelection);
            onSelectionChange(newSelection);
        } else {
            console.log('  - ⚠️  No onSelectionChange callback');
        }

        console.log('🔴 [DEBUG] handleSelect completed');
    };

    // 마우스 다운 이벤트 (Stage 레벨)
    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        const clickedOnEmpty = e.target === stage;
        const pointer = stage.getPointerPosition();

        console.log('🔲 [DEBUG] Mouse down - clickedOnEmpty:', clickedOnEmpty);

        if (clickedOnEmpty && pointer) {
            // 마우스 다운 위치 저장
            setMouseDownPos(pointer);

            if (enableRectangleSelection) {
                // 범위 선택 시작
                console.log('🔲 [DEBUG] Starting rectangle selection at:', pointer);
                setIsDrawingSelection(true);
                setSelectionStart(pointer);
                setSelectionCurrent(pointer);
            }
        }
    }, [enableRectangleSelection]);

    // 마우스 이동 이벤트
    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawingSelection || !selectionStart) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (pointer) {
            setSelectionCurrent(pointer);
        }
    }, [isDrawingSelection, selectionStart]);

    // 마우스 업 이벤트
    const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        const clickedOnEmpty = e.target === stage;

        console.log('🔲 [DEBUG] Mouse up event - isDrawingSelection:', isDrawingSelection);
        console.log('🔲 [DEBUG] Mouse up - clickedOnEmpty:', clickedOnEmpty);

        if (isDrawingSelection && selectionStart && selectionCurrent) {
            console.log('🔲 [DEBUG] Completing rectangle selection');

            // 선택 영역 계산
            const rect = {
                x: Math.min(selectionStart.x, selectionCurrent.x),
                y: Math.min(selectionStart.y, selectionCurrent.y),
                width: Math.abs(selectionCurrent.x - selectionStart.x),
                height: Math.abs(selectionCurrent.y - selectionStart.y)
            };

            console.log('🔲 [DEBUG] Selection rectangle:', rect);

            // 최소 크기 확인
            if (rect.width > 5 && rect.height > 5) {
                const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
                const isShiftPressed = e.evt.shiftKey;

                let mode: SelectionMode = 'replace';
                if (isCtrlPressed && isShiftPressed) {
                    mode = 'subtract';
                } else if (isCtrlPressed) {
                    mode = 'add';
                }

                console.log('🔲 [DEBUG] Selection mode:', mode);
                handleRectangleSelection(rect, mode);
            } else {
                // 범위가 너무 작으면 선택 해제 (단순 클릭으로 간주)
                console.log('🔲 [DEBUG] Rectangle too small - clearing selection');
                setSelectedIds([]);
                if (onSelectionChange) {
                    onSelectionChange([]);
                }
            }

            // 상태 초기화
            setIsDrawingSelection(false);
            setSelectionStart(null);
            setSelectionCurrent(null);
            setMouseDownPos(null);
        } else if (clickedOnEmpty && mouseDownPos && pointer) {
            // 범위 선택이 아닌 경우, 마우스가 거의 움직이지 않았으면 단순 클릭으로 간주
            const moved = Math.abs(pointer.x - mouseDownPos.x) + Math.abs(pointer.y - mouseDownPos.y);

            if (moved < 5) {
                console.log('🔲 [DEBUG] Simple click on empty area - clearing selection');
                setSelectedIds([]);
                if (onSelectionChange) {
                    onSelectionChange([]);
                }
            }

            setMouseDownPos(null);
        }
    }, [isDrawingSelection, selectionStart, selectionCurrent, mouseDownPos, handleRectangleSelection, onSelectionChange]);

    // Transformer 업데이트
    useEffect(() => {
        console.log('🔧 [DEBUG] Transformer useEffect triggered');
        console.log('  - selectedIds:', selectedIds);

        if (!transformerRef.current) {
            console.log('  - ❌ No transformer ref');
            return;
        }

        const stage = stageRef.current;
        if (!stage) {
            console.log('  - ❌ No stage ref');
            return;
        }

        const selectedNodes: Konva.Node[] = [];

        selectedIds.forEach(id => {
            console.log('  - Looking for node with ID:', id);
            const node = stage.findOne(`#${id}`);
            if (node) {
                console.log('  - ✅ Found node:', node);
                selectedNodes.push(node);
            } else {
                console.log('  - ❌ Node not found for ID:', id);
            }
        });

        console.log('  - Total selected nodes:', selectedNodes.length);
        transformerRef.current.nodes(selectedNodes);
        console.log('🔧 [DEBUG] Transformer updated with nodes:', selectedNodes.length);
        transformerRef.current.getLayer()?.batchDraw();
    }, [selectedIds]);

    // 객체의 고유 ID 반환 - Scene에서 자동 생성된 ID만 사용
    const getObjectId = useCallback((obj: DrawingObject): string => {
        if (!obj.id) {
            console.warn('🟡 [DEBUG] Object without ID found:', obj);
            const tempId = `temp-${obj.type}-${Date.now()}`;
            console.warn('🟡 [DEBUG] Generated temp ID:', tempId);
            return tempId;
        }
        console.log('🟢 [DEBUG] Object ID:', obj.id, 'for type:', obj.type);
        return obj.id;
    }, []);

    // DrawingObject를 Konva 컴포넌트로 변환
    const renderObject = (obj: DrawingObject) => {
        const id = getObjectId(obj);
        const isSelected = selectedIds.includes(id);

        console.log('🔵 [DEBUG] Rendering object:', {
            id,
            type: obj.type,
            isSelected,
            selectedIds: selectedIds,
            position: { x: obj.x, y: obj.y }
        });

        const commonProps = {
            id,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                console.log('🟠 [DEBUG] Object clicked! ID:', id);
                e.cancelBubble = true; // 이벤트 버블링 방지
                handleSelect(id, e);
            },
            onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
                console.log('🟠 [DEBUG] Object tapped! ID:', id);
                e.cancelBubble = true;
                handleSelect(id, e as any);
            },
            onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
                const container = e.target.getStage()?.container();
                if (container) {
                    container.style.cursor = 'pointer';
                }
            },
            onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
                const container = e.target.getStage()?.container();
                if (container) {
                    container.style.cursor = 'default';
                }
            },
            draggable: true,
            onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => handleDragStart(id, e),
            onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(id, e),
            onTransformStart: (e: Konva.KonvaEventObject<Event>) => handleTransformStart(id, e),
            onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(id, e),
            // 선택된 객체 시각적 효과
            shadowColor: isSelected ? '#007bff' : undefined,
            shadowBlur: isSelected ? 10 : 0,
            shadowOffset: isSelected ? { x: 0, y: 0 } : undefined,
            shadowOpacity: isSelected ? 0.6 : 0,
        };

        switch (obj.type) {
            case 'rect':
                const rectObj = obj as any; // 타입 문제 임시 우회
                return (
                    <KonvaRect
                        key={id}
                        {...commonProps}
                        x={rectObj.x}
                        y={rectObj.y}
                        width={rectObj.width}
                        height={rectObj.height}
                        fill={rectObj.fill || '#ff0000'}
                        stroke={isSelected ? '#007bff' : (rectObj.stroke || undefined)}
                        strokeWidth={isSelected ? 3 : (rectObj.strokeWidth || 0)}
                    />
                );

            case 'circle':
                const circle = obj as Circle;
                return (
                    <KonvaCircle
                        key={id}
                        {...commonProps}
                        x={circle.x}
                        y={circle.y}
                        radius={circle.radius}
                        fill={circle.fill || '#00ff00'}
                        stroke={isSelected ? '#007bff' : (circle.stroke || undefined)}
                        strokeWidth={isSelected ? 3 : (circle.strokeWidth || 0)}
                    />
                );

            case 'text':
                const text = obj as Text;
                return (
                    <KonvaText
                        key={id}
                        {...commonProps}
                        x={text.x}
                        y={text.y}
                        text={text.text || 'Text'}
                        fontSize={text.fontSize || 16}
                        fontFamily={text.fontFamily || 'Arial'}
                        fill={text.fill || '#000000'}
                        align={text.align}
                        stroke={isSelected ? '#007bff' : undefined}
                        strokeWidth={isSelected ? 1 : 0}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <Stage
            ref={stageRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <Layer>
                {objects.map(renderObject)}
                <KonvaTransformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox: any, newBox: any) => {
                        // 최소 크기 제한
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />

                {/* 범위 선택 시각화 */}
                {isDrawingSelection && selectionStart && selectionCurrent && (
                    <KonvaRect
                        x={Math.min(selectionStart.x, selectionCurrent.x)}
                        y={Math.min(selectionStart.y, selectionCurrent.y)}
                        width={Math.abs(selectionCurrent.x - selectionStart.x)}
                        height={Math.abs(selectionCurrent.y - selectionStart.y)}
                        fill="rgba(0, 123, 255, 0.1)"
                        stroke="#007bff"
                        strokeWidth={1}
                        dash={[5, 5]}
                        listening={false}
                    />
                )}
            </Layer>
        </Stage>
    );
};

export default KonvaDesigner;
