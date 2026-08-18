import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, useReducer } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { DrawingObject, Scene, defaultImageLoader } from '@canvas-kit/core';
import type { Image as ImageShape } from '@canvas-kit/core';
import type Konva from 'konva';

// Image src loading is async, unlike every other Shape — a small subcomponent so the load-state
// hook lives at its own top level (Rules of Hooks) instead of inside the renderObject callback.
const KonvaImageNode: React.FC<{
    obj: ImageShape;
    commonProps: Record<string, unknown>;
    isSelected: boolean;
}> = ({ obj, commonProps, isSelected }) => {
    const [, rerenderOnLoad] = useReducer((n: number) => n + 1, 0);
    const htmlImage = defaultImageLoader.getOrLoadImage(obj.src, rerenderOnLoad) ?? undefined;

    return (
        <KonvaImage
            {...commonProps}
            image={htmlImage}
            width={obj.width}
            height={obj.height}
            stroke={isSelected ? '#0080ff' : obj.stroke}
            strokeWidth={isSelected ? 2 : obj.strokeWidth || 0}
        />
    );
};

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

    // Stable ref for onSelectionChange — avoids infinite re-render loop
    // when callers pass a non-memoized callback
    const onSelectionChangeRef = useRef(onSelectionChange);
    useLayoutEffect(() => { onSelectionChangeRef.current = onSelectionChange; });

    useEffect(() => {
        const objects = scene.getObjects();
        const selectedObjects = objects.filter(obj => obj.id && selectedIds.includes(obj.id));
        onSelectionChangeRef.current?.(selectedObjects);
    }, [selectedIds, scene]);

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
                // Scene.copy() gives every object a new reference, so the update must be looked
                // up and applied against the copy's own objects — updateObject matches by
                // reference, and originalObject's reference belongs to the pre-copy scene.
                const newScene = scene.copy();
                const objectInNewScene = newScene.getObjects().find(obj => obj.id === objectId);
                if (objectInNewScene) {
                    const updatedObject = { ...objectInNewScene, x: newX, y: newY };
                    newScene.updateObject(objectInNewScene, updatedObject);
                    onSceneChange?.(newScene);
                }
            }
        }
    }, [scene, onSceneChange]);

    // Object resize handler — Konva's Transformer reports a resize as a scale factor on the
    // node (not a new width/height/radius), so it has to be baked into the object's own size
    // fields and the node's scale reset to 1, or the next resize compounds on top of it.
    const handleObjectTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
        const node = e.target;
        const objectId = node.id();

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const x = node.x();
        const y = node.y();

        // Same Scene.copy() reference-identity requirement as handleObjectDragEnd above — look
        // the object up inside the copy, not the pre-copy scene.
        const newScene = scene.copy();
        const objectInNewScene = newScene.getObjects().find(obj => obj.id === objectId);
        if (!objectInNewScene) return;

        let updatedObject: DrawingObject;
        if (objectInNewScene.type === 'rect' || objectInNewScene.type === 'image') {
            updatedObject = {
                ...objectInNewScene,
                x, y,
                width: Math.max(5, objectInNewScene.width * scaleX),
                height: Math.max(5, objectInNewScene.height * scaleY),
            };
        } else if (objectInNewScene.type === 'circle') {
            updatedObject = { ...objectInNewScene, x, y, radius: Math.max(5, objectInNewScene.radius * scaleX) };
        } else {
            return; // line/text aren't resized via width/height/radius
        }

        newScene.updateObject(objectInNewScene, updatedObject);
        onSceneChange?.(newScene);
    }, [scene, onSceneChange]);

    // Render object function
    const renderObject = useCallback((obj: DrawingObject) => {
        const isSelected = obj.id ? selectedIds.includes(obj.id) : false;

        const commonProps = {
            id: obj.id,
            x: obj.x,
            y: obj.y,
            draggable: true,
            onDragEnd: handleObjectDragEnd,
            onTransformEnd: handleObjectTransformEnd,
        };

        switch (obj.type) {
            case 'rect':
                return (
                    <Rect
                        key={obj.id}
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
                        key={obj.id}
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
                        key={obj.id}
                        {...commonProps}
                        points={obj.points}
                        stroke={obj.stroke || 'black'}
                        strokeWidth={obj.strokeWidth || 1}
                    />
                );
            case 'text':
                return (
                    <Text
                        key={obj.id}
                        {...commonProps}
                        text={obj.text}
                        fontSize={obj.fontSize || 16}
                        fill={obj.fill || 'black'}
                        fontFamily={obj.fontFamily || 'Arial'}
                        stroke={isSelected ? '#0080ff' : obj.stroke}
                        strokeWidth={isSelected ? 1 : obj.strokeWidth || 0}
                    />
                );
            case 'image':
                return (
                    <KonvaImageNode
                        key={obj.id}
                        obj={obj}
                        commonProps={commonProps}
                        isSelected={isSelected}
                    />
                );
            default:
                return null;
        }
    }, [selectedIds, handleObjectDragEnd, handleObjectTransformEnd]);

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
