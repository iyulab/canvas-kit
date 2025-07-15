import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
import type { Scene, DrawingObject, Rect as RectType, Circle as CircleType, Text as TextType } from '@canvas-kit/core';
import Konva from 'konva';

interface KonvaDesignerProps {
    width: number;
    height: number;
    scene: Scene;
    onSceneChange?: (scene: Scene) => void;
    onSelectionChange?: (selectedObjects: DrawingObject[]) => void;
    enableMultiSelect?: boolean;
}

export const KonvaDesigner: React.FC<KonvaDesignerProps> = ({
    width,
    height,
    scene,
    onSceneChange,
    onSelectionChange,
    enableMultiSelect = true
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Scene 객체들을 Konva ID와 매핑
    const objects = scene.getObjects();

    // 객체 변경 처리 (드래그, 리사이즈 등)
    const handleObjectChange = useCallback((updatedObject: DrawingObject) => {
        if (!onSceneChange) return;

        const newObjects = objects.map(obj =>
            getObjectId(obj) === getObjectId(updatedObject) ? updatedObject : obj
        );

        // Scene 업데이트
        const newScene = { ...scene };
        newScene.objects = newObjects;
        onSceneChange(newScene);
    }, [scene, objects, onSceneChange]);

    // 드래그 종료 처리
    const handleDragEnd = useCallback((id: string, e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target;
        const obj = objects.find(o => getObjectId(o) === id);
        if (!obj) return;

        const updatedObject: DrawingObject = {
            ...obj,
            x: node.x(),
            y: node.y(),
        };

        handleObjectChange(updatedObject);
    }, [objects, handleObjectChange]);

    // 변형(리사이즈) 종료 처리
    const handleTransformEnd = useCallback((id: string, e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const obj = objects.find(o => getObjectId(o) === id);
        if (!obj) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        let updatedObject: DrawingObject;

        if (obj.type === 'rect') {
            const rect = obj as RectType;
            updatedObject = {
                ...obj,
                x: node.x(),
                y: node.y(),
                width: Math.max(5, rect.width * scaleX),
                height: Math.max(5, rect.height * scaleY),
            };
        } else if (obj.type === 'circle') {
            const circle = obj as CircleType;
            updatedObject = {
                ...obj,
                x: node.x(),
                y: node.y(),
                radius: Math.max(5, circle.radius * Math.max(scaleX, scaleY)),
            };
        } else {
            updatedObject = {
                ...obj,
                x: node.x(),
                y: node.y(),
            };
        }

        // 스케일 리셋
        node.scaleX(1);
        node.scaleY(1);

        handleObjectChange(updatedObject);
    }, [objects, handleObjectChange]);

    // 선택 처리
    const handleSelect = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
        const isCtrlPressed = e.evt.ctrlKey || e.evt.metaKey;

        let newSelectedIds: string[];

        if (enableMultiSelect && isCtrlPressed) {
            // 멀티 선택 모드
            if (selectedIds.includes(id)) {
                newSelectedIds = selectedIds.filter(sid => sid !== id);
            } else {
                newSelectedIds = [...selectedIds, id];
            }
        } else {
            // 단일 선택 모드
            newSelectedIds = [id];
        }

        setSelectedIds(newSelectedIds);

        // 선택된 객체들을 콜백으로 전달
        if (onSelectionChange) {
            const selectedObjects = objects.filter(obj =>
                newSelectedIds.includes(getObjectId(obj))
            );
            onSelectionChange(selectedObjects);
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
            key: id,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleSelect(id, e),
            onTap: (e: Konva.KonvaEventObject<TouchEvent>) => handleSelect(id, e as any),
            draggable: true,
            onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(id, e),
            onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(id, e),
            // 선택된 객체는 약간 다른 스타일
            opacity: isSelected ? 0.8 : 1,
        };

        switch (obj.type) {
            case 'rect':
                const rect = obj as RectType;
                return (
                    <Rect
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
            </Layer>
        </Stage>
    );
};

export default KonvaDesigner;
