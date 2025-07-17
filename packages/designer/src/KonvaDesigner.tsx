import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Transformer } from 'react-konva';
import { DrawingObject, Scene } from '@canvas-kit/core';
import type Konva from 'konva';

export interface KonvaDesignerProps {
    width: number;
    height: number;
    scene: Scene;
    onSceneChange?: (scene: Scene) => void;
    onSelectionChange?: (selection: DrawingObject[]) => void;
    enableKeyboardShortcuts?: boolean;
    enableTextEditing?: boolean;
    enableMultiSelect?: boolean;
    enableRectangleSelection?: boolean;
}

export const KonvaDesigner: React.FC<KonvaDesignerProps> = ({
    width,
    height,
    scene,
    onSceneChange,
    onSelectionChange,
    enableKeyboardShortcuts = false,
    enableTextEditing = false,
    enableMultiSelect = false,
    enableRectangleSelection = false,
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    // State management
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Update transformer when selection changes
    useEffect(() => {
        const transformer = transformerRef.current;
        const stage = stageRef.current;

        if (!transformer || !stage) return;

        const selectedNodes = selectedIds.map(id => stage.findOne(`#${id}`)).filter((node): node is Konva.Node => node !== undefined);
        transformer.nodes(selectedNodes);
    }, [selectedIds]);

    // Notify selection change
    useEffect(() => {
        const objects = scene.getObjects();
        const selectedObjects = objects.filter(obj => obj.id && selectedIds.includes(obj.id));
        onSelectionChange?.(selectedObjects);
    }, [selectedIds, scene, onSelectionChange]);

    // Mouse event handlers
    const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;

        const clickedOnEmpty = e.target === stage;

        if (clickedOnEmpty) {
            setSelectedIds([]);
        } else {
            const clickedId = e.target.id();
            if (clickedId) {
                if (enableMultiSelect && e.evt.ctrlKey) {
                    setSelectedIds(prev =>
                        prev.includes(clickedId)
                            ? prev.filter(id => id !== clickedId)
                            : [...prev, clickedId]
                    );
                } else {
                    setSelectedIds([clickedId]);
                }
            }
        }
    }, [enableMultiSelect]);

    // Object drag handlers
    const handleObjectDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        const target = e.target;
        const objectId = target.id();
        const objects = scene.getObjects();
        const originalObject = objects.find(obj => obj.id === objectId);

        if (originalObject) {
            const newX = target.x();
            const newY = target.y();

            if (originalObject.x !== newX || originalObject.y !== newY) {
                // Create new scene with updated object
                const newScene = scene.copy();
                const updatedObject = { ...originalObject, x: newX, y: newY };
                newScene.updateObject(originalObject, updatedObject);
                onSceneChange?.(newScene);
            }
        }
    }, [scene, onSceneChange]);

    // Render object function
    const renderObject = useCallback((obj: DrawingObject) => {
        const isSelected = obj.id ? selectedIds.includes(obj.id) : false;

        const commonProps = {
            key: obj.id,
            id: obj.id,
            x: obj.x,
            y: obj.y,
            draggable: true,
            onDragEnd: handleObjectDragEnd,
        };

        switch (obj.type) {
            case 'rect':
                return (
                    <Rect
                        {...commonProps}
                        width={obj.width}
                        height={obj.height}
                        fill={obj.fill}
                        stroke={isSelected ? '#0080ff' : obj.stroke}
                        strokeWidth={isSelected ? 2 : obj.strokeWidth || 0}
                    />
                );
            case 'circle':
                return (
                    <Circle
                        {...commonProps}
                        radius={obj.radius}
                        fill={obj.fill}
                        stroke={isSelected ? '#0080ff' : obj.stroke}
                        strokeWidth={isSelected ? 2 : obj.strokeWidth || 0}
                    />
                );
            case 'line':
                return (
                    <Line
                        {...commonProps}
                        points={obj.points}
                        stroke={obj.stroke || 'black'}
                        strokeWidth={obj.strokeWidth || 1}
                    />
                );
            case 'text':
                return (
                    <Text
                        {...commonProps}
                        text={obj.text}
                        fontSize={obj.fontSize || 16}
                        fill={obj.fill || 'black'}
                        fontFamily={obj.fontFamily || 'Arial'}
                        stroke={isSelected ? '#0080ff' : obj.stroke}
                        strokeWidth={isSelected ? 1 : obj.strokeWidth || 0}
                    />
                );
            default:
                return null;
        }
    }, [selectedIds, handleObjectDragEnd]);

    return (
        <div style={{ position: 'relative' }}>
            <Stage
                width={width}
                height={height}
                ref={stageRef}
                onMouseDown={handleStageMouseDown}
            >
                <Layer>
                    {scene.getObjects().map(renderObject)}

                    <Transformer
                        ref={transformerRef}
                        rotateEnabled={true}
                        enabledAnchors={[
                            'top-left', 'top-center', 'top-right',
                            'middle-left', 'middle-right',
                            'bottom-left', 'bottom-center', 'bottom-right'
                        ]}
                    />
                </Layer>
            </Stage>
        </div>
    );
};

export default KonvaDesigner;
