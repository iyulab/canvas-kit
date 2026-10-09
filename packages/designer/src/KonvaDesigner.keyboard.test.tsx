import React from 'react';
import { render, act, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scene, CommandHistory } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

let stageProps: Record<string, any> = {};

vi.mock('react-konva', () => ({
    Stage: (props: any) => {
        stageProps = props;
        return <div>{props.children}</div>;
    },
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: () => null,
    Circle: () => null,
    Text: () => null,
    Line: () => null,
    Shape: () => null,
    Image: () => null,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

function sceneWithShapes() {
    const scene = new Scene();
    scene.add({ id: 'a', type: 'rect', x: 10, y: 10, width: 20, height: 20 });
    scene.add({ id: 'b', type: 'rect', x: 100, y: 10, width: 20, height: 20 });
    return scene;
}
const ids = (spy: ReturnType<typeof vi.fn>) => (spy.mock.lastCall![0] as { id: string }[]).map(o => o.id);
const designer = () => screen.getByRole('application', { name: 'Designer' });
const key = (k: string, init: Record<string, unknown> = {}) => {
    const event = fireEvent.keyDown(designer(), { key: k, ...init });
    return event; // false when the handler called preventDefault
};

describe('KonvaDesigner keyboard', () => {
    beforeEach(() => {
        stageProps = {};
    });

    it('is a focusable, named application that lists its keys', () => {
        render(<KonvaDesigner width={400} height={200} scene={new Scene()} ariaLabel="Floor editor" />);
        const surface = screen.getByRole('application', { name: 'Floor editor' });
        expect(surface).toHaveAttribute('tabindex', '0');
        expect(surface.getAttribute('aria-keyshortcuts')).toContain('Tab');
        // "+" separates a modifier from its key there, so the plus key is spelled "Plus".
        expect(surface.getAttribute('aria-keyshortcuts')!.split(' ')).toEqual(expect.arrayContaining(['Plus', '=', '-']));
    });

    it('steps through the shapes with Tab and Shift+Tab, and lets focus leave past either end', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onSelectionChange={onSelectionChange} />);

        expect(key('Tab')).toBe(false);
        expect(ids(onSelectionChange)).toEqual(['a']);
        expect(key('Tab')).toBe(false);
        expect(ids(onSelectionChange)).toEqual(['b']);
        expect(key('Tab')).toBe(true); // not handled: focus moves on
        expect(ids(onSelectionChange)).toEqual([]);

        expect(key('Tab', { shiftKey: true })).toBe(false);
        expect(ids(onSelectionChange)).toEqual(['b']);
        key('Tab', { shiftKey: true });
        expect(key('Tab', { shiftKey: true })).toBe(true);
        expect(ids(onSelectionChange)).toEqual([]);
    });

    it('moves the selection with the arrows, as one undo step for several shapes', () => {
        const scene = sceneWithShapes();
        const history = new CommandHistory();
        render(<KonvaDesigner width={400} height={200} scene={scene} commandHistory={history} />);
        key('Tab');
        act(() => {
            // add b to the selection with a Shift+click on it
            stageProps.onMouseDown({ target: { getStage: () => ({}), id: () => 'b' }, evt: { button: 0, shiftKey: true } });
        });

        key('ArrowRight');
        key('ArrowDown', { shiftKey: true });
        expect(scene.getObjects().map(o => [o.x, o.y])).toEqual([[11, 20], [101, 20]]);

        act(() => history.undo());
        expect(scene.getObjects().map(o => [o.x, o.y])).toEqual([[11, 10], [101, 10]]);
    });

    it('pans with the arrows when nothing is selected, and zooms with + and -', () => {
        const onTransformChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onTransformChange={onTransformChange} />);

        key('ArrowRight');
        expect(onTransformChange).toHaveBeenLastCalledWith({ x: -40, y: 0, scale: 1 });
        key('ArrowUp', { shiftKey: true });
        expect(onTransformChange).toHaveBeenLastCalledWith({ x: -40, y: 160, scale: 1 });

        key('+');
        const zoomed = onTransformChange.mock.lastCall![0];
        expect(zoomed.scale).toBeCloseTo(1.25);
        key('-');
        expect(onTransformChange.mock.lastCall![0].scale).toBeCloseTo(1);
    });

    it('clears the selection with Escape', () => {
        const onSelectionChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onSelectionChange={onSelectionChange} />);
        key('Tab');
        expect(key('Escape')).toBe(false);
        expect(ids(onSelectionChange)).toEqual([]);
        expect(key('Escape')).toBe(true); // nothing to clear: left alone
    });

    it('leaves keys pressed with Ctrl or Cmd to the host (undo/redo shortcuts and the like)', () => {
        const onTransformChange = vi.fn();
        render(<KonvaDesigner width={400} height={200} scene={sceneWithShapes()} onTransformChange={onTransformChange} />);
        expect(key('ArrowRight', { ctrlKey: true })).toBe(true);
        expect(onTransformChange).not.toHaveBeenCalled();
    });
});
