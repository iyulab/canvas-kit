import React, { useRef, useEffect, useState, useCallback, useLayoutEffect, useReducer, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Shape, Image as KonvaImage, Transformer } from 'react-konva';
import {
    DrawingObject, Scene, defaultImageLoader, CommandHistory, MoveCommand, ResizeCommand, CompositeCommand,
    IDENTITY_TRANSFORM, fitTransform, zoomAt, viewToScene, isObjectIntersectingRect,
    DEFAULT_LINE_STROKE, DEFAULT_LINE_WIDTH, DEFAULT_TEXT_FILL, DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY,
    textBoxOffsetX, tracePath,
} from '@canvas-kit/core';
import type { Image as ImageShape, Transform, Rect as SceneRect, Size, ResizeGeometry } from '@canvas-kit/core';
import type Konva from 'konva';

const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 10;
// wheel deltaY -> zoom factor. Negative deltaY (scroll up) zooms in.
const ZOOM_SENSITIVITY = 0.001;
// Movement (CSS px) below which a press is a click, not a pan or a selection drag.
const DRAG_THRESHOLD = 4;
// Keyboard, as in the viewer: an arrow press with nothing selected pans this far (CSS px), Shift
// multiplies it; +/- zoom by this factor around the middle. With a selection, an arrow moves it
// one scene unit, Shift ten.
const KEY_PAN_STEP = 40;
const KEY_PAN_FAST = 4;
const KEY_ZOOM_STEP = 1.25;
const KEY_NUDGE_FAST = 10;
const KEY_DIRECTION: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};
const MARQUEE_STROKE = '#0080ff';
const MARQUEE_FILL = 'rgba(0, 128, 255, 0.08)';

/** The scene rect spanned by two scene points, whichever way the drag went. */
function rectBetween(a: { x: number; y: number }, b: { x: number; y: number }): SceneRect {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

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
    /** Accessible name of the designer — it is focusable, and operable from the keyboard: arrow keys
     * move the selection (Shift for ten units) or, with nothing selected, pan; `+`/`-` zoom; Tab and
     * Shift+Tab select the next or previous shape; Escape clears the selection; Space + drag pans.
     * Default "Designer". */
    ariaLabel?: string;
    /** Shares an undo/redo stack with a caller that already owns one (e.g. `AdvancedDesigner`,
     * whose toolbar-driven adds should undo/redo together with drags/resizes done here). Standalone
     * usage gets its own stack for free when omitted. */
    commandHistory?: CommandHistory;
}

/**
 * Editing surface for a `Scene`: select, drag, and resize its objects, with undo/redo. Click a shape
 * to select it (Shift, Ctrl or Cmd adds or removes it), or drag across empty space to select every
 * shape the box touches; dragging one selected shape moves them all, as one undo step. Pan with
 * Space + drag or the middle mouse button, zoom with the wheel around the pointer; omit
 * `width`/`height` to fill the container.
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
    ariaLabel = 'Designer',
    commandHistory,
}, ref) {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { width, height } = useViewportSize(containerRef, widthProp, heightProp);
    // Latest callback/transform, kept current after each commit — written in an effect, never during
    // render, so a render React throws away cannot leave a stale value behind.
    const onViewportResizeRef = useRef(onViewportResize);
    useLayoutEffect(() => {
        onViewportResizeRef.current = onViewportResize;
    });
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

    // Lazy-initialized so an omitted `commandHistory` allocates exactly one default instance,
    // not one per render (a plain default-parameter value would re-run every render).
    const [history] = useState(() => commandHistory ?? new CommandHistory());

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedIdsRef = useRef(selectedIds);
    useLayoutEffect(() => {
        selectedIdsRef.current = selectedIds;
    });

    // Pointer drags on the stage, tracked on the window so they keep following outside it:
    // - pan: the middle button anywhere, or the left button while Space is held. The transform is
    //   computed, never left to Konva's own stage dragging, so a controlled designer stays where its
    //   owner puts it.
    // - marquee: the left button on empty space, past the threshold — selects every shape the box
    //   touches (Shift/Ctrl/Cmd adds to the selection). Without moving, it is a click that clears the
    //   selection.
    // A left press on a shape is left to Konva, which drags the shape.
    const transformRef = useRef(transform);
    useLayoutEffect(() => {
        transformRef.current = transform;
    });
    const [spaceHeld, setSpaceHeld] = useState(false);
    const spaceHeldRef = useRef(false);
    const holdSpace = useCallback((held: boolean) => {
        spaceHeldRef.current = held;
        setSpaceHeld(held);
    }, []);
    const [marquee, setMarquee] = useState<SceneRect | null>(null);
    const dragCleanupRef = useRef<(() => void) | null>(null);
    useEffect(() => () => dragCleanupRef.current?.(), []);
    const handleStagePointerDown = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
        // Konva cancels a touch press's default action, which also keeps the browser from focusing the
        // designer — focus it on every press, so Space and the keyboard work right after one.
        containerRef.current?.focus({ preventScroll: true });
        const stage = e.target.getStage();
        if (!stage) return;
        const { button } = e.evt;
        const pan = button === 1 || (button === 0 && spaceHeldRef.current);
        if (!pan && !(button === 0 && e.target === stage)) return;
        if (button === 1) e.evt.preventDefault(); // no middle-click autoscroll
        dragCleanupRef.current?.();
        const { pointerId, clientX: startX, clientY: startY } = e.evt;
        const additive = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
        const start = transformRef.current;
        const origin = containerRef.current?.getBoundingClientRect();
        const toScene = (clientX: number, clientY: number) =>
            viewToScene(start, { x: clientX - (origin?.left ?? 0), y: clientY - (origin?.top ?? 0) });
        let moved = false;
        const onMove = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (!moved && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
            moved = true;
            if (pan) applyTransform({ x: start.x + dx, y: start.y + dy, scale: start.scale });
            else setMarquee(rectBetween(toScene(startX, startY), toScene(ev.clientX, ev.clientY)));
        };
        const stop = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            if (!pan && moved) {
                const box = rectBetween(toScene(startX, startY), toScene(ev.clientX, ev.clientY));
                const hit = scene.getObjects()
                    .filter(obj => obj.id && !obj.locked && isObjectIntersectingRect(obj, box))
                    .map(obj => obj.id!);
                setSelectedIds(prev => (additive ? [...new Set([...prev, ...hit])] : hit));
            } else if (!pan && !additive) {
                setSelectedIds([]);
            }
            setMarquee(null);
            dragCleanupRef.current?.();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', stop);
        window.addEventListener('pointercancel', stop);
        dragCleanupRef.current = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', stop);
            window.removeEventListener('pointercancel', stop);
            dragCleanupRef.current = null;
        };
    }, [applyTransform, scene]);

    // Keys pressed while the designer has focus. Space switches the pointer to panning while held.
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === ' ') {
            e.preventDefault(); // Space pans the design, it does not scroll the page
            if (!spaceHeldRef.current) holdSpace(true);
            return;
        }
        const direction = KEY_DIRECTION[e.key];
        const selected = selectedIdsRef.current;
        if (direction && selected.length > 0) {
            const step = e.shiftKey ? KEY_NUDGE_FAST : 1;
            const moves = scene.getObjects()
                .filter(obj => obj.id && !obj.locked && selected.includes(obj.id))
                .map(obj => new MoveCommand(obj, { x: obj.x, y: obj.y }, { x: obj.x + direction[0] * step, y: obj.y + direction[1] * step }, scene));
            if (moves.length > 0) history.execute(moves.length === 1 ? moves[0] : new CompositeCommand(moves, `Move ${moves.length} objects`));
        } else if (direction) {
            const step = KEY_PAN_STEP * (e.shiftKey ? KEY_PAN_FAST : 1);
            const current = transformRef.current;
            // Panning toward the arrow brings what lies that way into view.
            applyTransform({ x: current.x - direction[0] * step, y: current.y - direction[1] * step, scale: current.scale });
        } else if (e.key === '+' || e.key === '=' || e.key === '-') {
            const factor = e.key === '-' ? 1 / KEY_ZOOM_STEP : KEY_ZOOM_STEP;
            applyTransform(zoomAt(transformRef.current, { x: width / 2, y: height / 2 }, factor, { minScale, maxScale }));
        } else if (e.key === 'Escape') {
            if (selected.length === 0) return;
            setSelectedIds([]);
        } else if (e.key === 'Tab') {
            // Tab and Shift+Tab step through the shapes in drawing order. Past the last (or before the
            // first) the key is left alone, so focus moves on out of the designer (no keyboard trap).
            const ids = scene.getObjects().filter(obj => !obj.locked).map(obj => obj.id).filter((id): id is string => !!id);
            const current = selected.length > 0 ? ids.indexOf(selected[selected.length - 1]) : -1;
            const next = current === -1 ? (e.shiftKey ? ids.length - 1 : 0) : current + (e.shiftKey ? -1 : 1);
            if (ids.length === 0 || next < 0 || next >= ids.length) {
                if (selected.length > 0) setSelectedIds([]);
                return;
            }
            setSelectedIds([ids[next]]);
        } else {
            return;
        }
        e.preventDefault();
    }, [holdSpace, scene, history, applyTransform, width, height, minScale, maxScale]);
    const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === ' ') holdSpace(false);
    }, [holdSpace]);

    const handleStageWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;
        e.evt.preventDefault(); // the wheel zooms the design, it does not scroll the page
        const factor = Math.exp(-e.evt.deltaY * ZOOM_SENSITIVITY);
        applyTransform(zoomAt(transformRef.current, pointer, factor, { minScale, maxScale }));
    }, [applyTransform, minScale, maxScale]);

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

    // Update transformer when selection changes
    useEffect(() => {
        const transformer = transformerRef.current;
        const stage = stageRef.current;

        if (!transformer || !stage) return;

        const locked = new Set(scene.getObjects().filter(obj => obj.locked).map(obj => obj.id));
        const selectedNodes = selectedIds
            .filter(id => !locked.has(id))
            .map(id => stage.findOne(`#${id}`))
            .filter((node): node is Konva.Node => node !== undefined);
        transformer.nodes(selectedNodes);
    }, [selectedIds, scene]);

    // A scene in which a selected shape is now locked: it leaves the selection, as it could not be
    // selected in the first place.
    useEffect(() => {
        const locked = new Set(scene.getObjects().filter(obj => obj.locked).map(obj => obj.id));
        if (selectedIdsRef.current.some(id => locked.has(id))) setSelectedIds(prev => prev.filter(id => !locked.has(id)));
    }, [scene]);

    // Stable ref for onSelectionChange — avoids infinite re-render loop
    // when callers pass a non-memoized callback
    const onSelectionChangeRef = useRef(onSelectionChange);
    useLayoutEffect(() => { onSelectionChangeRef.current = onSelectionChange; });

    useEffect(() => {
        const objects = scene.getObjects();
        const selectedObjects = objects.filter(obj => obj.id && selectedIds.includes(obj.id));
        onSelectionChangeRef.current?.(selectedObjects);
    }, [selectedIds, scene]);

    // A press on a shape selects it; Shift/Ctrl/Cmd adds or removes it. Pressing a shape that is
    // already selected keeps the selection, so the press can start dragging the whole group.
    // Presses on empty space are handled by the pointer handler above.
    const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage || e.target === stage || e.evt.button !== 0 || spaceHeldRef.current) return;
        const clickedId = e.target.id();
        if (!clickedId) return;
        if (e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey) {
            setSelectedIds(prev => (prev.includes(clickedId) ? prev.filter(id => id !== clickedId) : [...prev, clickedId]));
        } else {
            setSelectedIds(prev => (prev.includes(clickedId) ? prev : [clickedId]));
        }
    }, []);

    // Object drag handlers — routed through a Command (undo/redo, `@canvas-kit/core` commands.ts)
    // instead of mutating the scene directly, so a drag can be undone like an add/delete can.
    // The command mutates `scene`'s object in place; the `useEffect` above is what turns that
    // into a fresh `Scene` reference for `onSceneChange`.
    // Dragging one of several selected shapes moves them all (Konva's Transformer drags the others
    // along), and Konva ends each of their drags separately. The first drag end records every
    // selected shape's new position as one command, so the group move undoes in one step; the
    // others then find their object already in place and record nothing.
    const handleObjectDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        const target = e.target;
        const targetId = target.id();
        const ids = selectedIdsRef.current.includes(targetId) ? selectedIdsRef.current : [targetId];
        const stage = ids.length > 1 ? target.getStage() : null;
        const moves: MoveCommand[] = [];
        for (const id of ids) {
            const obj = scene.getObjects().find(o => o.id === id);
            const node = id === targetId ? target : stage?.findOne(`#${id}`);
            if (!obj || !node) continue;
            const x = node.x();
            const y = node.y();
            if (obj.x === x && obj.y === y) continue; // not moved, or already recorded
            moves.push(new MoveCommand(obj, { x: obj.x, y: obj.y }, { x, y }, scene));
        }
        if (moves.length === 0) return;
        history.execute(moves.length === 1 ? moves[0] : new CompositeCommand(moves, `Move ${moves.length} objects`));
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

        let oldSize: ResizeGeometry;
        let newSize: ResizeGeometry;
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
            // A locked shape takes no pointer events at all: a press on it is a press on empty space
            // (a marquee, or deselecting), as if only the picture were there.
            listening: !obj.locked,
            draggable: !spaceHeld && !obj.locked,
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
                        stroke={obj.stroke || DEFAULT_LINE_STROKE}
                        strokeWidth={obj.strokeWidth || DEFAULT_LINE_WIDTH}
                    />
                );
            case 'path':
                // Drawn by the same tracePath the canvas renderer uses, so curves match exactly.
                return (
                    <Shape
                        key={obj.id}
                        {...commonProps}
                        sceneFunc={(context, shape) => {
                            tracePath(context, obj);
                            context.fillStrokeShape(shape);
                        }}
                        fill={obj.closed ? obj.fill : undefined}
                        stroke={isSelected ? '#0080ff' : obj.strokeWidth ? obj.stroke : undefined}
                        strokeWidth={isSelected ? 2 : obj.strokeWidth || 0}
                    />
                );
            case 'text':
                return (
                    <Text
                        key={obj.id}
                        {...commonProps}
                        // x is the alignment anchor (geometry.ts), as on the canvas renderer.
                        offsetX={textBoxOffsetX(obj)}
                        text={obj.text}
                        fontSize={obj.fontSize ?? DEFAULT_FONT_SIZE}
                        fill={obj.fill || DEFAULT_TEXT_FILL}
                        fontFamily={obj.fontFamily ?? DEFAULT_FONT_FAMILY}
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
    }, [selectedIds, spaceHeld, handleObjectDragEnd, handleObjectTransformEnd]);

    // An editing surface with its own keyboard model (arrows move or pan, Tab steps through the shapes,
    // Space holds a pan), so it is an `application`: a screen reader passes those keys through instead
    // of using them to read. The lint rules count only widget roles as interactive.
    return (
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            ref={containerRef}
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            role="application"
            aria-label={ariaLabel}
            aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - Tab Shift+Tab Escape Space"
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBlur={() => holdSpace(false)}
            style={{
                position: 'relative',
                width: widthProp ?? '100%',
                height: heightProp ?? '100%',
                cursor: spaceHeld ? 'grab' : undefined,
            }}
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
                <Layer listening={false}>
                    {marquee && (
                        <Rect
                            x={marquee.x}
                            y={marquee.y}
                            width={marquee.width}
                            height={marquee.height}
                            fill={MARQUEE_FILL}
                            stroke={MARQUEE_STROKE}
                            strokeWidth={1 / transform.scale}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
});

export default KonvaDesigner;
