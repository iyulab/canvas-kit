import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
import { Scene, CommandHistory, MoveCommand, ResizeCommand, CopyCommand, CutCommand, PasteCommand, DuplicateCommand, Clipboard, SelectionUtils } from '@canvas-kit/core';
import type { DrawingObject, Rect as RectType, Circle as CircleType, Text as TextType, Point, SelectionMode } from '@canvas-kit/core';
import Konva from 'konva';
import { SelectionBox } from './SelectionBox';

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
        if (startPos.x === newPosition.x && startPos.y === newPosition.y) {
            return;
        }

        const updatedObject: DrawingObject = {
            ...obj,
            x: newPosition.x,
            y: newPosition.y,
        };

        // MoveCommand 생성 및 실행
        const moveCommand = new MoveCommand(obj, startPos, newPosition, scene);
        commandHistory.execute(moveCommand);

        // Scene 업데이트
        const newScene = new Scene();
        // 기존 객체들을 새 Scene에 복사
        objects.forEach(existingObj => {
            if (getObjectId(existingObj) === getObjectId(obj)) {
                newScene.add(updatedObject);
            } else {
                newScene.add(existingObj);
            }
        });
        onSceneChange(newScene);

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
            const rect = obj as RectType;
            currentState.width = rect.width;
            currentState.height = rect.height;
        } else if (obj.type === 'circle') {
            const circle = obj as CircleType;
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
            const rect = obj as RectType;
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
            const circle = obj as CircleType;
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
            // ResizeCommand 생성 및 실행
            const resizeCommand = new ResizeCommand(obj, oldSize, newSize, scene);
            commandHistory.execute(resizeCommand);
        }

        // 스케일 리셋
        node.scaleX(1);
        node.scaleY(1);

        // Scene 업데이트
        const newScene = new Scene();
        objects.forEach(existingObj => {
            if (getObjectId(existingObj) === getObjectId(obj)) {
                newScene.add(updatedObject);
            } else {
                newScene.add(existingObj);
            }
        });
        onSceneChange(newScene);

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
                    if (commandHistory.undo() && onSceneChange) {
                        // Scene 재구성은 Command 자체에서 처리되므로 
                        // 현재 scene 상태를 그대로 전달
                        onSceneChange(scene);
                    }
                } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
                    e.preventDefault();
                    if (commandHistory.redo() && onSceneChange) {
                        onSceneChange(scene);
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
        const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;
        const isShiftPressed = e.evt.shiftKey;

        // 선택 모드 결정
        let mode: SelectionMode = 'replace';
        if (isCtrlPressed && isShiftPressed) {
            mode = 'subtract';
        } else if (isCtrlPressed) {
            mode = 'add';
        }

        const obj = objects.find(o => getObjectId(o) === id);
        if (!obj) return;

        const currentSelection = objects.filter(o => selectedIds.includes(getObjectId(o)));
        const newSelection = SelectionUtils.updateSelection(currentSelection, [obj], mode);

        const newSelectedIds = newSelection.map(o => getObjectId(o));
        setSelectedIds(newSelectedIds);

        // 선택된 객체들을 콜백으로 전달
        if (onSelectionChange) {
            onSelectionChange(newSelection);
        }
    };

    // 빈 영역 클릭 시 선택 해제
    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // 빈 영역을 클릭했는지 확인
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            setSelectedIds([]);
            if (onSelectionChange) {
                onSelectionChange([]);
            }
        }
    };

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
        transformerRef.current.getLayer()?.batchDraw();
    }, [selectedIds]);

    // 객체의 고유 ID 생성
    const getObjectId = (obj: DrawingObject): string => {
        return obj.id || `${obj.type}-${objects.indexOf(obj)}`;
    };

    // DrawingObject를 Konva 컴포넌트로 변환
    const renderObject = (obj: DrawingObject) => {
        const id = getObjectId(obj);
        const isSelected = selectedIds.includes(id);

        const commonProps = {
            id,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleSelect(id, e),
            onTap: (e: Konva.KonvaEventObject<TouchEvent>) => handleSelect(id, e as any),
            draggable: true,
            onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => handleDragStart(id, e),
            onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(id, e),
            onTransformStart: (e: Konva.KonvaEventObject<Event>) => handleTransformStart(id, e),
            onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(id, e),
            // 선택된 객체는 약간 다른 스타일
            opacity: isSelected ? 0.8 : 1,
        };

        switch (obj.type) {
            case 'rect':
                const rect = obj as RectType;
                return (
                    <Rect
                        key={id}
                        {...commonProps}
                        x={rect.x}
                        y={rect.y}
                        width={rect.width}
                        height={rect.height}
                        fill={rect.fill || '#ff0000'}
                        stroke={rect.stroke}
                        strokeWidth={rect.strokeWidth || 0}
                    />
                );

            case 'circle':
                const circle = obj as CircleType;
                return (
                    <Circle
                        key={id}
                        {...commonProps}
                        x={circle.x}
                        y={circle.y}
                        radius={circle.radius}
                        fill={circle.fill || '#00ff00'}
                        stroke={circle.stroke}
                        strokeWidth={circle.strokeWidth || 0}
                    />
                );

            case 'text':
                const text = obj as TextType;
                return (
                    <Text
                        key={id}
                        {...commonProps}
                        x={text.x}
                        y={text.y}
                        text={text.text || 'Text'}
                        fontSize={text.fontSize || 16}
                        fontFamily={text.fontFamily || 'Arial'}
                        fill={text.fill || '#000000'}
                        align={text.align}
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
            onClick={handleStageClick}
            onTap={handleStageClick}
        >
            <Layer>
                {objects.map(renderObject)}
                <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        // 최소 크기 제한
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />

                {/* Rectangle Selection */}
                {enableRectangleSelection && (
                    <SelectionBox
                        isActive={true}
                        onSelectionComplete={handleRectangleSelection}
                        objects={objects}
                    />
                )}
            </Layer>
        </Stage>
    );
};

export default KonvaDesigner;
