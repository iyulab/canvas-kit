import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene, CommandHistory } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// Live props per rect id and of the stage, so a marquee selection and the drag ends Konva reports
// for a group move can be driven directly.
let stageProps: Record<string, any> = {};
const rectProps = new Map<string, Record<string, any>>();

vi.mock('react-konva', () => ({
    Stage: (props: any) => {
        stageProps = props;
        return <div>{props.children}</div>;
    },
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: (props: any) => {
        if (props.id) rectProps.set(props.id, props);
        return null;
    },
    Circle: () => null,
    Text: () => null,
    Line: () => null,
    Shape: () => null,
    Image: () => null,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

function selectAll() {
    const stage = { getStage: () => stage };
    act(() => stageProps.onPointerDown({ target: stage, evt: { clientX: 0, clientY: 0, pointerId: 1, button: 0 } }));
    act(() => {
        window.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 300, clientY: 300, pointerId: 1 }));
        window.dispatchEvent(Object.assign(new Event('pointerup'), { clientX: 300, clientY: 300, pointerId: 1 }));
    });
}

describe('KonvaDesigner group drag', () => {
    beforeEach(() => {
        stageProps = {};
        rectProps.clear();
    });

    it('records moving every selected shape as one undo step', () => {
        const scene = new Scene();
        scene.add({ id: 'a', type: 'rect', x: 0, y: 0, width: 20, height: 20 });
        scene.add({ id: 'b', type: 'rect', x: 100, y: 0, width: 20, height: 20 });
        const history = new CommandHistory();
        render(<KonvaDesigner width={400} height={400} scene={scene} commandHistory={history} />);
        selectAll();

        // Konva's Transformer has dragged b along with a; each node then reports its own drag end.
        const nodes: Record<string, { x: number; y: number }> = { a: { x: 10, y: 5 }, b: { x: 110, y: 5 } };
        const stage = { findOne: (selector: string) => {
            const id = selector.slice(1);
            return { x: () => nodes[id].x, y: () => nodes[id].y };
        } };
        const dragEnd = (id: string) => ({ target: { id: () => id, x: () => nodes[id].x, y: () => nodes[id].y, getStage: () => stage } });
        act(() => rectProps.get('a')!.onDragEnd(dragEnd('a')));
        act(() => rectProps.get('b')!.onDragEnd(dragEnd('b')));

        expect(scene.getObjects().map(o => [o.x, o.y])).toEqual([[10, 5], [110, 5]]);
        act(() => history.undo());
        expect(scene.getObjects().map(o => [o.x, o.y])).toEqual([[0, 0], [100, 0]]);
        expect(history.canUndo()).toBe(false);
    });
});
