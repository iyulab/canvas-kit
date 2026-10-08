import React from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// A locked shape is the picture the editable ones sit on: drawn, never edited.
let stageProps: Record<string, any> = {};
const { shapeProps, record } = vi.hoisted(() => {
    const shapeProps = new Map<string, Record<string, any>>();
    const record = (props: any) => {
        if (props.id) shapeProps.set(props.id, props);
        return null;
    };
    return { shapeProps, record };
});

vi.mock('react-konva', () => ({
    Stage: (props: any) => {
        stageProps = props;
        return <div>{props.children}</div>;
    },
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: record,
    Circle: record,
    Text: record,
    Line: record,
    Shape: record,
    Image: record,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

function plan() {
    const scene = new Scene();
    scene.add({ id: 'plan', type: 'image', x: 0, y: 0, width: 400, height: 300, src: 'data:image/png;base64,', locked: true });
    scene.add({ id: 'pump', type: 'rect', x: 50, y: 50, width: 40, height: 20 });
    scene.add({ id: 'pipe', type: 'line', x: 0, y: 0, points: [0, 0, 100, 100], locked: true });
    return scene;
}
const lastSelection = (spy: ReturnType<typeof vi.fn>) => (spy.mock.lastCall![0] as { id: string }[]).map(o => o.id);

describe('KonvaDesigner locked shapes', () => {
    beforeEach(() => {
        stageProps = {};
        shapeProps.clear();
    });

    it('draws them, but they take no pointer events and cannot be dragged', () => {
        render(<KonvaDesigner width={400} height={300} scene={plan()} />);
        expect(shapeProps.get('plan')).toMatchObject({ listening: false, draggable: false });
        expect(shapeProps.get('pipe')).toMatchObject({ listening: false, draggable: false });
        expect(shapeProps.get('pump')).toMatchObject({ listening: true, draggable: true });
    });

    it('leaves them out of a marquee that covers them', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={300} scene={plan()} onSelectionChange={onSelectionChange} />);
        const stage = { getStage: () => stage };
        act(() => stageProps.onPointerDown({ target: stage, evt: { clientX: 0, clientY: 0, pointerId: 1, button: 0 } }));
        act(() => {
            window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 399, clientY: 299, pointerId: 1 }));
            window.dispatchEvent(Object.assign(new Event('pointerup'), { clientX: 399, clientY: 299, pointerId: 1 }));
        });
        expect(lastSelection(onSelectionChange)).toEqual(['pump']);
    });

    it('lets go of a selected shape that a new scene locks, and the arrows no longer move it', () => {
        const onSelectionChange = vi.fn();
        const editable = new Scene();
        editable.add({ id: 'pump', type: 'rect', x: 50, y: 50, width: 40, height: 20 });
        const { rerender } = render(<KonvaDesigner width={400} height={300} scene={editable} onSelectionChange={onSelectionChange} />);
        const region = screen.getByRole('region', { name: 'Designer' });
        fireEvent.keyDown(region, { key: 'Tab' });
        expect(lastSelection(onSelectionChange)).toEqual(['pump']);

        const lockedScene = new Scene();
        lockedScene.add({ id: 'pump', type: 'rect', x: 50, y: 50, width: 40, height: 20, locked: true });
        rerender(<KonvaDesigner width={400} height={300} scene={lockedScene} onSelectionChange={onSelectionChange} />);
        expect(lastSelection(onSelectionChange)).toEqual([]);
        fireEvent.keyDown(region, { key: 'ArrowRight' });
        expect(lockedScene.getObjects()[0]).toMatchObject({ x: 50, y: 50 });
    });

    it('steps over them with Tab', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={300} scene={plan()} onSelectionChange={onSelectionChange} />);
        const region = screen.getByRole('region', { name: 'Designer' });
        fireEvent.keyDown(region, { key: 'Tab' });
        expect(lastSelection(onSelectionChange)).toEqual(['pump']);
        expect(fireEvent.keyDown(region, { key: 'Tab' })).toBe(true); // past the last editable shape: focus moves on
    });
});
