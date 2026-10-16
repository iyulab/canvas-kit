import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// A fixed-size shape sets only where something goes: selected and moved, never resized or rotated.
const { shapeProps, transformer, record } = vi.hoisted(() => {
    const shapeProps = new Map<string, Record<string, any>>();
    const transformer: { props: Record<string, any> } = { props: {} };
    const record = (props: any) => {
        if (props.id) shapeProps.set(props.id, props);
        return null;
    };
    return { shapeProps, transformer, record };
});

vi.mock('react-konva', () => ({
    Stage: (props: any) => <div>{props.children}</div>,
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: record,
    Circle: record,
    Text: record,
    Line: record,
    Shape: record,
    Image: record,
    Transformer: (props: any) => {
        transformer.props = props;
        return null;
    },
}));

vi.mock('konva', () => ({ default: {} }));

function board() {
    const scene = new Scene();
    scene.add({ id: 'box', type: 'rect', x: 0, y: 0, width: 40, height: 40 });
    scene.add({ id: 'stamp', type: 'rect', x: 100, y: 0, width: 40, height: 40, fixedSize: true });
    return scene;
}

describe('KonvaDesigner fixed-size shapes', () => {
    beforeEach(() => {
        shapeProps.clear();
        transformer.props = {};
    });

    it('are dragged and nudged like any shape, but a selection holding one takes no resize or rotate handles', () => {
        const scene = board();
        render(<KonvaDesigner width={400} height={300} scene={scene} />);
        expect(shapeProps.get('stamp')).toMatchObject({ listening: true, draggable: true });
        const region = screen.getByRole('application', { name: 'Designer' });
        fireEvent.keyDown(region, { key: 'Tab' });
        expect(transformer.props).toMatchObject({ resizeEnabled: true, rotateEnabled: true });
        fireEvent.keyDown(region, { key: 'Tab' });
        expect(transformer.props).toMatchObject({ resizeEnabled: false, rotateEnabled: false });
        fireEvent.keyDown(region, { key: 'ArrowRight' });
        expect(scene.getObjects().find(o => o.id === 'stamp')!.x).toBeGreaterThan(100);
    });
});
