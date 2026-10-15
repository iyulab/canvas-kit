import React from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner, type DesignerHandle } from './KonvaDesigner';

// A fixed shape is a mark whose place follows other shapes (a line joining two boxes): selected, never moved.
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

function board() {
    const scene = new Scene();
    scene.add({ id: 'a', type: 'rect', x: 0, y: 0, width: 40, height: 40 });
    scene.add({ id: 'b', type: 'rect', x: 200, y: 0, width: 40, height: 40 });
    scene.add({ id: 'link', type: 'line', x: 0, y: 0, points: [40, 20, 200, 20], strokeWidth: 2, fixed: true });
    return scene;
}
const lastSelection = (spy: ReturnType<typeof vi.fn>) => (spy.mock.lastCall![0] as { id: string }[]).map(o => o.id);

describe('KonvaDesigner fixed shapes', () => {
    beforeEach(() => {
        stageProps = {};
        shapeProps.clear();
    });

    it('take the pointer but cannot be dragged', () => {
        render(<KonvaDesigner width={400} height={300} scene={board()} />);
        expect(shapeProps.get('link')).toMatchObject({ listening: true, draggable: false });
        expect(shapeProps.get('a')).toMatchObject({ listening: true, draggable: true });
    });

    it('hit a press near a line, as containsPoint judges, not only one on its stroke', () => {
        render(<KonvaDesigner width={400} height={300} scene={board()} />);
        expect(shapeProps.get('link')!.hitStrokeWidth).toBe(10); // 2 + 4 on each side
    });

    it('are selected by Tab and shown selected, but the arrows leave them where they are', () => {
        const onSelectionChange = vi.fn();
        const scene = board();
        render(<KonvaDesigner width={400} height={300} scene={scene} onSelectionChange={onSelectionChange} />);
        const region = screen.getByRole('application', { name: 'Designer' });
        for (let i = 0; i < 3; i++) fireEvent.keyDown(region, { key: 'Tab' });
        expect(lastSelection(onSelectionChange)).toEqual(['link']);
        expect(shapeProps.get('link')!.stroke).toBe('#0080ff');
        fireEvent.keyDown(region, { key: 'ArrowRight' });
        expect(scene.getObjects().find(o => o.id === 'link')).toMatchObject({ x: 0, y: 0 });
    });

    it('are caught by a marquee with the rest', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={300} scene={board()} onSelectionChange={onSelectionChange} />);
        const stage = { getStage: () => stage };
        act(() => stageProps.onPointerDown({ target: stage, evt: { clientX: 0, clientY: 0, pointerId: 1, button: 0 } }));
        act(() => {
            window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 399, clientY: 299, pointerId: 1 }));
            window.dispatchEvent(Object.assign(new Event('pointerup'), { clientX: 399, clientY: 299, pointerId: 1 }));
        });
        expect(lastSelection(onSelectionChange)).toEqual(['a', 'b', 'link']);
    });
    it('are selected by the host through select(), which leaves out what is not in the scene or is locked', () => {
        const onSelectionChange = vi.fn();
        const scene = board();
        scene.add({ id: 'plan', type: 'rect', x: 0, y: 0, width: 10, height: 10, locked: true });
        const ref = React.createRef<DesignerHandle>();
        render(<KonvaDesigner ref={ref} width={400} height={300} scene={scene} onSelectionChange={onSelectionChange} />);
        act(() => ref.current!.select(['link', 'plan', 'gone']));
        expect(lastSelection(onSelectionChange)).toEqual(['link']);
    });
});
