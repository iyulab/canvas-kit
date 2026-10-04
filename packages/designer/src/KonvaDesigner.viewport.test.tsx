import React, { createRef } from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';
import type { DesignerHandle } from './KonvaDesigner';

// Captures the live props (including handlers) the Stage receives, so the viewport's own pointer
// and wheel handling can be driven with Konva-shaped events.
let stageProps: Record<string, any> = {};

vi.mock('react-konva', () => ({
    Stage: (props: any) => {
        stageProps = props;
        return <div data-testid="konva-stage">{props.children}</div>;
    },
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: (props: any) => <div data-testid="konva-rect" data-props={JSON.stringify(props)} />,
    Circle: () => null,
    Text: () => null,
    Line: () => null,
    Image: () => null,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

const stageNode = { getStage(): unknown { return stageNode; }, getPointerPosition: () => ({ x: 100, y: 50 }) };
const shapeNode = { getStage: () => stageNode, id: () => 'n1' };

const MIDDLE = 1;
function pointerDown(target: unknown, clientX: number, clientY: number, button = 0, modifiers: { shiftKey?: boolean } = {}) {
    act(() => stageProps.onPointerDown({ target, evt: { clientX, clientY, pointerId: 1, button, preventDefault: vi.fn(), ...modifiers } }));
}
function windowPointer(type: 'pointermove' | 'pointerup', clientX: number, clientY: number) {
    act(() => {
        window.dispatchEvent(Object.assign(new Event(type), { clientX, clientY, pointerId: 1 }));
    });
}
function wheel(deltaY: number) {
    const preventDefault = vi.fn();
    act(() => stageProps.onWheel({ target: stageNode, evt: { deltaY, preventDefault } }));
    return preventDefault;
}
function stageTransform() {
    return { x: stageProps.x, y: stageProps.y, scale: stageProps.scaleX };
}

describe('KonvaDesigner viewport', () => {
    beforeEach(() => {
        stageProps = {};
    });

    describe('pan/zoom (uncontrolled)', () => {
        it('starts at the identity transform', () => {
            render(<KonvaDesigner width={400} height={200} scene={new Scene()} />);
            expect(stageTransform()).toEqual({ x: 0, y: 0, scale: 1 });
            expect(stageProps.scaleY).toBe(1);
        });

        it('pans with a middle-button drag, and reports it', () => {
            const onTransformChange = vi.fn();
            render(<KonvaDesigner width={400} height={200} scene={new Scene()} onTransformChange={onTransformChange} />);

            pointerDown(stageNode, 100, 100, MIDDLE);
            windowPointer('pointermove', 130, 115);
            windowPointer('pointerup', 130, 115);

            expect(stageTransform()).toEqual({ x: 30, y: 15, scale: 1 });
            expect(onTransformChange).toHaveBeenLastCalledWith({ x: 30, y: 15, scale: 1 });
        });

        it('does not pan for a left drag that starts on a shape (that is the shape moving)', () => {
            const onTransformChange = vi.fn();
            render(<KonvaDesigner width={400} height={200} scene={new Scene()} onTransformChange={onTransformChange} />);

            pointerDown(shapeNode, 100, 100);
            windowPointer('pointermove', 160, 140);
            windowPointer('pointerup', 160, 140);

            expect(stageTransform()).toEqual({ x: 0, y: 0, scale: 1 });
            expect(onTransformChange).not.toHaveBeenCalled();
        });

        it('treats a press that stays within the threshold as a click, not a pan', () => {
            const onTransformChange = vi.fn();
            render(<KonvaDesigner width={400} height={200} scene={new Scene()} onTransformChange={onTransformChange} />);

            pointerDown(stageNode, 100, 100, MIDDLE);
            windowPointer('pointermove', 102, 101);
            windowPointer('pointerup', 102, 101);

            expect(onTransformChange).not.toHaveBeenCalled();
        });

        it('stops following the pointer once it is released', () => {
            render(<KonvaDesigner width={400} height={200} scene={new Scene()} />);

            pointerDown(stageNode, 100, 100, MIDDLE);
            windowPointer('pointermove', 130, 100);
            windowPointer('pointerup', 130, 100);
            windowPointer('pointermove', 300, 300);

            expect(stageTransform()).toEqual({ x: 30, y: 0, scale: 1 });
        });

        it('pans with a left drag while Space is held, on empty space or over a shape', () => {
            const onTransformChange = vi.fn();
            const { container } = render(<KonvaDesigner width={400} height={200} scene={new Scene()} onTransformChange={onTransformChange} />);
            const designer = container.firstElementChild as HTMLElement;

            fireEvent.keyDown(designer, { key: ' ' });
            pointerDown(shapeNode, 100, 100);
            windowPointer('pointermove', 120, 110);
            windowPointer('pointerup', 120, 110);
            expect(onTransformChange).toHaveBeenLastCalledWith({ x: 20, y: 10, scale: 1 });

            fireEvent.keyUp(designer, { key: ' ' });
            onTransformChange.mockClear();
            pointerDown(stageNode, 100, 100);
            windowPointer('pointermove', 160, 140);
            windowPointer('pointerup', 160, 140);
            expect(onTransformChange).not.toHaveBeenCalled(); // without Space, that drag selects
        });

        it('stops treating Space as held once the designer loses focus', () => {
            const onTransformChange = vi.fn();
            const { container } = render(<KonvaDesigner width={400} height={200} scene={new Scene()} onTransformChange={onTransformChange} />);
            const designer = container.firstElementChild as HTMLElement;

            fireEvent.keyDown(designer, { key: ' ' });
            fireEvent.blur(designer);
            pointerDown(stageNode, 100, 100);
            windowPointer('pointermove', 160, 140);
            windowPointer('pointerup', 160, 140);
            expect(onTransformChange).not.toHaveBeenCalled();
        });

        it('zooms around the pointer on wheel, within minScale/maxScale, without scrolling the page', () => {
            render(<KonvaDesigner width={400} height={200} scene={new Scene()} maxScale={2} />);

            const preventDefault = wheel(-100);
            expect(preventDefault).toHaveBeenCalled();
            const zoomed = stageTransform();
            expect(zoomed.scale).toBeGreaterThan(1);
            // the scene point under the pointer (100, 50) stays under it
            expect((100 - zoomed.x) / zoomed.scale).toBeCloseTo(100);
            expect((50 - zoomed.y) / zoomed.scale).toBeCloseTo(50);

            for (let i = 0; i < 20; i++) wheel(-1000);
            expect(stageTransform().scale).toBe(2);
        });
    });

    describe('pan/zoom (controlled)', () => {
        it('renders the given transform and reports interactions without adopting them', () => {
            const onTransformChange = vi.fn();
            render(
                <KonvaDesigner
                    width={400}
                    height={200}
                    scene={new Scene()}
                    transform={{ x: 5, y: 6, scale: 2 }}
                    onTransformChange={onTransformChange}
                />
            );
            expect(stageTransform()).toEqual({ x: 5, y: 6, scale: 2 });

            pointerDown(stageNode, 100, 100, MIDDLE);
            windowPointer('pointermove', 130, 115);
            windowPointer('pointerup', 130, 115);
            wheel(-100);

            expect(onTransformChange).toHaveBeenCalledWith({ x: 35, y: 21, scale: 2 });
            expect(stageTransform()).toEqual({ x: 5, y: 6, scale: 2 });
        });
    });

    describe('sizing', () => {
        let resizeCallback: ResizeObserverCallback | undefined;
        const originalResizeObserver = globalThis.ResizeObserver;

        beforeEach(() => {
            resizeCallback = undefined;
            globalThis.ResizeObserver = class {
                constructor(cb: ResizeObserverCallback) {
                    resizeCallback = cb;
                }
                observe() {}
                unobserve() {}
                disconnect() {}
            } as unknown as typeof ResizeObserver;
        });

        afterEach(() => {
            globalThis.ResizeObserver = originalResizeObserver;
        });

        function resizeTo(width: number, height: number) {
            act(() => {
                resizeCallback?.([{ contentRect: { width, height } } as unknown as ResizeObserverEntry], {} as ResizeObserver);
            });
        }

        it('follows its container when width and height are omitted', () => {
            const { container } = render(<KonvaDesigner scene={new Scene()} />);
            const wrapper = container.firstElementChild as HTMLElement;
            expect(wrapper.style.width).toBe('100%');
            expect(wrapper.style.height).toBe('100%');

            resizeTo(320, 180);
            expect(stageProps.width).toBe(320);
            expect(stageProps.height).toBe(180);
        });

        it('reports the viewport size once measured and on every resize', () => {
            const onViewportResize = vi.fn();
            render(<KonvaDesigner scene={new Scene()} onViewportResize={onViewportResize} />);
            expect(onViewportResize).not.toHaveBeenCalled();
            resizeTo(320, 180);
            expect(onViewportResize).toHaveBeenLastCalledWith({ width: 320, height: 180 });
            resizeTo(640, 360);
            expect(onViewportResize).toHaveBeenCalledTimes(2);
        });

        it('uses explicit width/height as-is', () => {
            render(<KonvaDesigner width={100} height={80} scene={new Scene()} />);
            resizeTo(999, 999);
            expect(stageProps.width).toBe(100);
            expect(stageProps.height).toBe(80);
        });

        it('holds a fitToRect asked for before the container is measured, then applies it once', () => {
            const ref = createRef<DesignerHandle>();
            const onTransformChange = vi.fn();
            render(<KonvaDesigner ref={ref} scene={new Scene()} onTransformChange={onTransformChange} />);

            act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));
            expect(onTransformChange).not.toHaveBeenCalled();

            resizeTo(400, 200);
            expect(onTransformChange).toHaveBeenCalledTimes(1);
            expect(onTransformChange).toHaveBeenLastCalledWith({ x: 100, y: 0, scale: 2 });
            expect(stageTransform()).toEqual({ x: 100, y: 0, scale: 2 });

            resizeTo(800, 400);
            expect(onTransformChange).toHaveBeenCalledTimes(1);
        });
    });

    describe('fitToRect', () => {
        it('fits a scene rect, honoring padding and a per-call maxScale within the designer bounds', () => {
            const ref = createRef<DesignerHandle>();
            const onTransformChange = vi.fn();
            render(<KonvaDesigner ref={ref} width={400} height={200} maxScale={4} scene={new Scene()} onTransformChange={onTransformChange} />);

            act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }, { maxScale: 1 }));
            expect(onTransformChange).toHaveBeenLastCalledWith({ x: 150, y: 50, scale: 1 });

            act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 1, height: 1 }, { padding: 10 }));
            expect(onTransformChange.mock.lastCall![0].scale).toBe(4);
        });
    });
});

describe('KonvaDesigner marquee selection', () => {
    function sceneWithShapes() {
        const scene = new Scene();
        scene.add({ id: 'a', type: 'rect', x: 10, y: 10, width: 20, height: 20 });
        scene.add({ id: 'b', type: 'rect', x: 100, y: 10, width: 20, height: 20 });
        scene.add({ id: 'c', type: 'circle', x: 300, y: 150, radius: 10 });
        return scene;
    }
    const selectedIds = (spy: ReturnType<typeof vi.fn>) => (spy.mock.lastCall![0] as { id: string }[]).map(o => o.id);

    beforeEach(() => {
        stageProps = {};
    });

    it('selects every shape the dragged box touches', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onSelectionChange={onSelectionChange} />);

        pointerDown(stageNode, 0, 0);
        windowPointer('pointermove', 110, 40); // reaches into b, not c
        windowPointer('pointerup', 110, 40);

        expect(selectedIds(onSelectionChange)).toEqual(['a', 'b']);
    });

    it('draws the box while dragging and removes it on release', () => {
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} />);
        const marqueeBoxes = () => document.querySelectorAll('[data-testid="konva-rect"]').length;
        const before = marqueeBoxes();

        pointerDown(stageNode, 0, 0);
        windowPointer('pointermove', 50, 50);
        expect(marqueeBoxes()).toBe(before + 1);
        windowPointer('pointerup', 50, 50);
        expect(marqueeBoxes()).toBe(before);
    });

    it('adds to the selection with Shift, and replaces it without', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onSelectionChange={onSelectionChange} />);

        pointerDown(stageNode, 0, 0);
        windowPointer('pointermove', 40, 40);
        windowPointer('pointerup', 40, 40);
        pointerDown(stageNode, 280, 130, 0, { shiftKey: true });
        windowPointer('pointermove', 320, 170);
        windowPointer('pointerup', 320, 170);
        expect(selectedIds(onSelectionChange)).toEqual(['a', 'c']);

        pointerDown(stageNode, 90, 0);
        windowPointer('pointermove', 130, 40);
        windowPointer('pointerup', 130, 40);
        expect(selectedIds(onSelectionChange)).toEqual(['b']);
    });

    it('clears the selection on a click on empty space', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onSelectionChange={onSelectionChange} />);
        pointerDown(stageNode, 0, 0);
        windowPointer('pointermove', 40, 40);
        windowPointer('pointerup', 40, 40);
        expect(selectedIds(onSelectionChange)).toEqual(['a']);

        pointerDown(stageNode, 200, 100);
        windowPointer('pointerup', 201, 100);
        expect(selectedIds(onSelectionChange)).toEqual([]);
    });

    it('selects in scene coordinates under a pan and zoom', () => {
        const onSelectionChange = vi.fn();
        render(
            <KonvaDesigner width={400} height={200} scene={sceneWithShapes()} transform={{ x: 50, y: 0, scale: 2 }} onSelectionChange={onSelectionChange} />
        );
        // View (250, 0)-(290, 60) is scene (100, 0)-(120, 30): only b.
        pointerDown(stageNode, 250, 0);
        windowPointer('pointermove', 290, 60);
        windowPointer('pointerup', 290, 60);
        expect(selectedIds(onSelectionChange)).toEqual(['b']);
    });
});
