import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, useReducer, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage, Transformer } from 'react-konva';
import {
    DrawingObject, Scene, defaultImageLoader, CommandHistory, MoveCommand, ResizeCommand,
    IDENTITY_TRANSFORM, fitTransform, zoomAt,
} from '@canvas-kit/core';
import type { Image as ImageShape, Transform, Rect as SceneRect, Size } from '@canvas-kit/core';
import type Konva from 'konva';

const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 10;
// wheel deltaY -> zoom factor. Negative deltaY (scroll up) zooms in.
const ZOOM_SENSITIVITY = 0.001;
// Movement (CSS px) below which a press on empty space is a click (deselect), not a pan.
const PAN_THRESHOLD = 4;

// Server rendering runs no layout effects and React warns about them — layout effect in the browser only.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// An omitted width/height follows the container along that axis.
function useViewportSize(
    containerRef: React.RefObject<HTMLDivElement | null>,
    width: number | undefined,
    height: number | undefined
): { width: number; height: number } {
    const followsContainer = width === undefined || height === undefined;
    const [measured, setMeasured] = useState({ width: 0, height: 0 });

    useIsomorphicLayoutEffect(() => {
        const element = containerRef.current;
        if (!followsContainer || !element) return;
        setMeasured({ width: element.clientWidth, height: element.clientHeight });
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => {
            const box = entries[entries.length - 1]?.contentRect;
            if (box) setMeasured({ width: box.width, height: box.height });
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [containerRef, followsContainer]);

    return { width: width ?? measured.width, height: height ?? measured.height };
}

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

export interface FitToRectOptions {
    /** Space (CSS px) kept clear on every side of the rect. Default 0. */
    padding?: number;
    /** Upper bound on the fitted scale for this call, within the designer's own `minScale`/`maxScale` —
     * e.g. `1` shrinks a large rect to fit but never magnifies a small one past its natural size. */
    maxScale?: number;
}

export interface DesignerHandle {
    /**
     * Fits a scene rect into the current viewport (centered, `minScale`/`maxScale` respected) and
     * reports the result through `onTransformChange` — in uncontrolled mode the designer also adopts
     * it. Called while a container-sized designer is still unmeasured, the fit is held and applied
     * once the viewport has a size.
     */
    fitToRect(rect: SceneRect, options?: FitToRectOptions): void;
}

export interface KonvaDesignerProps {
    /**
     * Viewport size in CSS px. Omit either to follow the container's size along that axis — the
     * designer then fills its parent (`100%`) and tracks resizes, keeping the transform as-is.
     */
    width?: number;
    height?: number;
    scene: Scene;
    /**
     * The view's pan/zoom. Given, the designer is controlled: it never changes this itself and only
     * reports the next value through `onTransformChange`. Omitted, it owns the transform (starting
     * at identity). Objects keep their scene coordinates either way — dragging and resizing report
     * scene positions and sizes, not screen ones.
     */
    transform?: Transform;
    /** Called whenever the transform changes — a pan, a wheel zoom, or `fitToRect`. */
    onTransformChange?: (transform: Transform) => void;
    /** Called with the viewport size (CSS px) once it is known and whenever it changes — with it a
     * controlling owner can keep a rect fitted (`fitTransform`) as the viewport changes. */
    onViewportResize?: (size: Size) => void;
    /** Bounds of the wheel zoom (default 0.1–10). `fitToRect` stays within them too. */
    minScale?: number;
    maxScale?: number;
    onSceneChange?: (scene: Scene) => void;
    onSelectionChange?: (selection: DrawingObject[]) => void;
    enableMultiSelect?: boolean;
    /** Shares an undo/redo stack with a caller that already owns one (e.g. `AdvancedDesigner`,
     * whose toolbar-driven adds should undo/redo together with drags/resizes done here). Standalone
     * usage gets its own stack for free when omitted. */
    commandHistory?: CommandHistory;
}

/**
 * Editing surface for a `Scene`: select, drag, and resize its objects, with undo/redo. Pan by
 * dragging empty space, zoom with the wheel around the pointer; omit `width`/`height` to fill the
 * container.
 */
export const KonvaDesigner = forwardRef<DesignerHandle, KonvaDesignerProps>(function KonvaDesigner({
    width: widthProp,
    height: heightProp,
    scene,
    transform: controlledTransform,
    onTransformChange,
    onViewportResize,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    onSceneChange,
    onSelectionChange,
    enableMultiSelect = false,
    commandHistory,
}, ref) {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useViewportSize(containerRef, widthProp, heightProp);
    const onViewportResizeRef = useRef(onViewportResize);
    onViewportResizeRef.current = onViewportResize;
    useEffect(() => {
        if (width > 0 && height > 0) onViewportResizeRef.current?.({ width, height });
    }, [width, height]);

    // View transform — controlled when `transform` is given, otherwise owned here. Konva applies it
    // at the Stage, so objects (and the drag/resize positions Konva reports for them) stay in scene
    // coordinates.
    const isControlled = controlledTransform !== undefined;
    const [internalTransform, setInternalTransform] = useState<Transform>(controlledTransform ?? IDENTITY_TRANSFORM);
    const transform = isControlled ? controlledTransform! : internalTransform;
    const applyTransform = useCallback((next: Transform) => {
        if (!isControlled) setInternalTransform(next);
        onTransformChange?.(next);
    }, [isControlled, onTransformChange]);

    // A fit asked for before the container has been measured has nothing to fit into yet; it waits
    // here and is applied once, as soon as the viewport has a size.
    const pendingFitRef = useRef<{ rect: SceneRect; options: FitToRectOptions } | null>(null);
    const fit = useCallback((rect: SceneRect, options: FitToRectOptions) => {
        const fitMaxScale = Math.max(minScale, Math.min(options.maxScale ?? maxScale, maxScale));
        applyTransform(fitTransform({ width, height }, rect, { padding: options.padding, minScale, maxScale: fitMaxScale }));
    }, [width, height, minScale, maxScale, applyTransform]);
    useIsomorphicLayoutEffect(() => {
        const pending = pendingFitRef.current;
        if (!pending || width <= 0 || height <= 0) return;
        pendingFitRef.current = null;
        fit(pending.rect, pending.options);
    }, [width, height, fit]);
    useImperativeHandle(ref, () => ({
        fitToRect(rect, options = {}) {
            if (width <= 0 || height <= 0) {
                pendingFitRef.current = { rect, options };
                return;
            }
            pendingFitRef.current = null;
            fit(rect, options);
        },
    }), [width, height, fit]);

    // Pan: a press on empty space (not on a shape — that drag moves the shape) that moves past the
    // threshold. Tracked on the window so it keeps following outside the stage; the transform is
    // computed, never left to Konva's own stage dragging, so a controlled designer stays where its
    // owner puts it.
    const transformRef = useRef(transform);
    transformRef.current = transform;
    const panCleanupRef = useRef<(() => void) | null>(null);
    useEffect(() => () => panCleanupRef.current?.(), []);
    const handleStagePointerDown = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
        const stage = e.target.getStage();
        if (!stage || e.target !== stage || e.evt.button !== 0) return;
        panCleanupRef.current?.();
        const { pointerId, clientX: startX, clientY: startY } = e.evt;
        const start = transformRef.current;
        let panning = false;
        const onMove = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (!panning && Math.hypot(dx, dy) <= PAN_THRESHOLD) return;
            panning = true;
            applyTransform({ x: start.x + dx, y: start.y + dy, scale: start.scale });
        };
        const stop = (ev: PointerEvent) => {
            if (ev.pointerId === pointerId) panCleanupRef.current?.();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        panCleanupRef.current = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
            panCleanupRef.current = null;
        };
    }, [applyTransform]);

    const handleStageWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;
        e.evt.preventDefault(); // the wheel zooms the design, it does not scroll the page
        const factor = Math.exp(-e.evt.deltaY * ZOOM_SENSITIVITY);
        applyTransform(zoomAt(transformRef.current, pointer, factor, { minScale, maxScale }));
    }, [applyTransform, minScale, maxScale]);
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
        <div
            ref={containerRef}
            style={{ position: 'relative', width: widthProp ?? '100%', height: heightProp ?? '100%' }}
        >
            <Stage
                width={width}
                height={height}
                x={transform.x}
                y={transform.y}
                scaleX={transform.scale}
                scaleY={transform.scale}
                ref={stageRef}
                onMouseDown={handleStageMouseDown}
                onPointerDown={handleStagePointerDown}
                onWheel={handleStageWheel}
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
});

export default KonvaDesigner;
