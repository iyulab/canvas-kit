import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, useReducer } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { DrawingObject, Scene, defaultImageLoader, CommandHistory, MoveCommand, ResizeCommand } from '@canvas-kit/core';
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
    enableMultiSelect?: boolean;
    /** Shares an undo/redo stack with a caller that already owns one (e.g. `AdvancedDesigner`,
     * whose toolbar-driven adds should undo/redo together with drags/resizes done here). Standalone
     * usage gets its own stack for free when omitted. */
    commandHistory?: CommandHistory;
}

export const KonvaDesigner: React.FC<KonvaDesignerProps> = ({
    width,
    height,
    scene,
    onSceneChange,
    onSelectionChange,
    enableMultiSelect = false,
    commandHistory,
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    // Lazy-initialized so an omitted `commandHistory` allocates exactly one default instance,
    // not one per render (a plain default-parameter value would re-run every render).
    const [history] = useState(() => commandHistory ?? new CommandHistory());

    // A command captures `scene` at construction time and mutates it in place for the lifetime
    // of the undo/redo stack (MoveCommand/ResizeCommand, `@canvas-kit/core` commands.ts) — so the
    // *same* `scene` reference must stay canonical for as long as any command referencing it can
    // still be undone/redone. Handing a caller a copy instead (a fresh reference per change, so a
    // naive `setScene(newScene)` always re-renders) breaks this the moment a command from *before*
    // the copy is undone: it mutates the orphaned pre-copy object, not the one actually on screen,
    // so the undo silently does nothing visible — and a second undo/redo after any such swap
    // no-ops the same way. Rerendering `KonvaDesigner` itself is instead driven by its own tick,
    // immediately below, so correctness here doesn't depend on the caller reacting to
    // `onSceneChange` at all.
    const [, forceRerender] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        const handleHistoryChange = () => {
            forceRerender();
            onSceneChange?.(scene);
        };
        history.addEventListener(handleHistoryChange);
        return () => history.removeEventListener(handleHistoryChange);
    }, [history, scene, onSceneChange]);

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

    // Object drag handlers — routed through a Command (undo/redo, `@canvas-kit/core` commands.ts)
    // instead of mutating the scene directly, so a drag can be undone like an add/delete can.
    // The command mutates `scene`'s object in place; the `useEffect` above is what turns that
    // into a fresh `Scene` reference for `onSceneChange`.
    const handleObjectDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        const target = e.target;
        const objectId = target.id();
        const originalObject = scene.getObjects().find(obj => obj.id === objectId);
        if (!originalObject) return;

        const newX = target.x();
        const newY = target.y();
        if (originalObject.x === newX && originalObject.y === newY) return; // no-op drag

        const cmd = new MoveCommand(
            originalObject,
            { x: originalObject.x, y: originalObject.y },
            { x: newX, y: newY },
            scene
        );
        history.execute(cmd);
    }, [scene, history]);

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

        const obj = scene.getObjects().find(o => o.id === objectId);
        if (!obj) return;

        let oldSize: { x: number; y: number; width?: number; height?: number; radius?: number };
        let newSize: typeof oldSize;
        if (obj.type === 'rect' || obj.type === 'image') {
            oldSize = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
            newSize = { x, y, width: Math.max(5, obj.width * scaleX), height: Math.max(5, obj.height * scaleY) };
        } else if (obj.type === 'circle') {
            oldSize = { x: obj.x, y: obj.y, radius: obj.radius };
            newSize = { x, y, radius: Math.max(5, obj.radius * scaleX) };
        } else {
            return; // line/text aren't resized via width/height/radius
        }

        const cmd = new ResizeCommand(obj, oldSize, newSize, scene);
        history.execute(cmd);
    }, [scene, history]);

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
