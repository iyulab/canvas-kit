import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// Text placed by verticalAlign and padding, and a text with a background drawn as one node (a label: a tag behind
// the text) — pressed, dragged and selected as the scene object it stands for.
let stageProps: Record<string, any> = {};
const { shapeProps, labelChildren, record } = vi.hoisted(() => {
    const shapeProps = new Map<string, Record<string, any>>();
    const labelChildren = new Map<string, Record<string, any>[]>();
    const record = (props: any) => {
        if (props.id) shapeProps.set(props.id, props);
        return null;
    };
    return { shapeProps, labelChildren, record };
});

vi.mock('react-konva', async () => {
    const { Children } = await import('react');
    return {
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
        Label: (props: any) => {
            record(props);
            labelChildren.set(props.id, Children.toArray(props.children).map((child: any) => ({ kind: child.type.name || 'Tag', ...child.props })));
            return null;
        },
        Tag: function Tag() {
            return null;
        },
        Transformer: () => null,
    };
});

vi.mock('konva', () => ({ default: {} }));

/** A Konva node as the stage's mouse-down handler reads it: its id, its parent, and the stage it is on. */
function node(id: string, parent: any, stage: any) {
    return { id: () => id, getParent: () => parent, getStage: () => stage };
}

describe('KonvaDesigner text', () => {
    beforeEach(() => {
        stageProps = {};
        shapeProps.clear();
        labelChildren.clear();
    });

    it('offsets the text by verticalAlign and padding, so x/y stays the anchor', () => {
        const scene = new Scene();
        scene.add({ id: 't', type: 'text', x: 100, y: 50, text: 'Hi', fontSize: 10, verticalAlign: 'bottom', padding: 2 });
        render(<KonvaDesigner width={400} height={300} scene={scene} />);
        expect(shapeProps.get('t')).toMatchObject({ x: 100, y: 50, offsetX: 2, offsetY: 12, padding: 2 });
    });

    it('draws a text with a background as one label: a tag in that colour behind the text', () => {
        const scene = new Scene();
        scene.add({ id: 't', type: 'text', x: 100, y: 50, text: 'Hi', fontSize: 10, background: '#ffcc00', padding: 3 });
        render(<KonvaDesigner width={400} height={300} scene={scene} />);
        expect(shapeProps.get('t')).toMatchObject({ x: 100, y: 50, offsetX: 3, offsetY: 3, draggable: true });
        const [tag, text] = labelChildren.get('t')!;
        expect(tag).toMatchObject({ fill: '#ffcc00' });
        expect(text).toMatchObject({ text: 'Hi', padding: 3 });
        expect(text.id).toBeUndefined(); // the label is the object; the text inside it is not a second one
    });

    it('selects the text when the press lands on the text inside its label', () => {
        const onSelectionChange = vi.fn();
        const scene = new Scene();
        scene.add({ id: 't', type: 'text', x: 100, y: 50, text: 'Hi', background: '#ffcc00' });
        render(<KonvaDesigner width={400} height={300} scene={scene} onSelectionChange={onSelectionChange} />);
        const stage: any = { getStage: () => stage, id: () => '', getParent: () => null };
        const label = node('t', stage, stage);
        const inner = node('', label, stage);
        act(() => stageProps.onMouseDown({ target: inner, evt: { button: 0 } }));
        expect((onSelectionChange.mock.lastCall![0] as { id: string }[]).map(o => o.id)).toEqual(['t']);
    });

    it('rounds and dashes a rect as the canvas renderer does', () => {
        const scene = new Scene();
        scene.add({ id: 'r', type: 'rect', x: 0, y: 0, width: 40, height: 10, stroke: 'black', strokeWidth: 1, cornerRadius: 30, dash: [4, 2] });
        render(<KonvaDesigner width={400} height={300} scene={scene} />);
        expect(shapeProps.get('r')).toMatchObject({ cornerRadius: 5, dash: [4, 2] });
    });
});
