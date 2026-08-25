import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Scene, CommandHistory } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// Same capture technique as KonvaDesigner.drag.test.tsx/resize.test.tsx — JSON-serializing mocks
// (the shared KonvaDesigner.test.tsx one) drop functions and can't exercise onDragEnd/
// onTransformEnd directly.
let capturedRectProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
    Stage: ({ children }: any) => <div>{children}</div>,
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: (props: any) => {
        capturedRectProps = props;
        return <div data-testid="konva-rect" />;
    },
    Circle: () => null,
    Text: () => null,
    Line: () => null,
    Image: () => null,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

describe('KonvaDesigner undo/redo', () => {
    it('undoes a drag back to the pre-drag position', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 50, height: 30 });
        const history = new CommandHistory();
        const onSceneChange = vi.fn();

        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
                onSceneChange={onSceneChange}
                commandHistory={history}
            />
        );

        (capturedRectProps!.onDragEnd as (e: unknown) => void)({
            target: { id: () => 'n1', x: () => 42, y: () => 99 },
        });
        expect(history.canUndo()).toBe(true);

        history.undo();

        const scenes = onSceneChange.mock.calls.map(call => call[0] as Scene);
        const afterUndo = scenes[scenes.length - 1];
        expect(afterUndo.getObjects().find(o => o.id === 'n1')).toMatchObject({ x: 0, y: 0 });
    });

    it('undoes a resize back to the pre-resize size', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 100, height: 50 });
        const history = new CommandHistory();
        const onSceneChange = vi.fn();

        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
                onSceneChange={onSceneChange}
                commandHistory={history}
            />
        );

        let scaleX = 2;
        let scaleY = 1.5;
        (capturedRectProps!.onTransformEnd as (e: unknown) => void)({
            target: {
                id: () => 'n1',
                x: () => 10,
                y: () => 20,
                scaleX: (v?: number) => (v === undefined ? scaleX : (scaleX = v)),
                scaleY: (v?: number) => (v === undefined ? scaleY : (scaleY = v)),
            },
        });

        history.undo();

        const scenes = onSceneChange.mock.calls.map(call => call[0] as Scene);
        const afterUndo = scenes[scenes.length - 1];
        expect(afterUndo.getObjects().find(o => o.id === 'n1')).toMatchObject({
            x: 0, y: 0, width: 100, height: 50,
        });
    });

    it('redo re-applies an undone drag', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 50, height: 30 });
        const history = new CommandHistory();
        const onSceneChange = vi.fn();

        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
                onSceneChange={onSceneChange}
                commandHistory={history}
            />
        );

        (capturedRectProps!.onDragEnd as (e: unknown) => void)({
            target: { id: () => 'n1', x: () => 42, y: () => 99 },
        });
        history.undo();
        history.redo();

        const scenes = onSceneChange.mock.calls.map(call => call[0] as Scene);
        const afterRedo = scenes[scenes.length - 1];
        expect(afterRedo.getObjects().find(o => o.id === 'n1')).toMatchObject({ x: 42, y: 99 });
    });

    it('always hands onSceneChange the same canonical Scene, mutated — never a copy', () => {
        // Regression test: calling `onSceneChange(scene.copy())` instead — so a controlled
        // caller's `setScene` would never bail out on identical-reference state — breaks
        // undo/redo the moment more than one operation happens. A command captures `scene` at
        // construction time and mutates it in place for as long as it lives in the undo/redo
        // stack, so the *original* reference must stay canonical; handing out a copy at any
        // point orphans every command still pointing at the pre-copy object, and its later
        // undo/redo mutates that orphan instead of what's on screen — the next test below
        // reproduces exactly that failure across two sequential operations.
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 50, height: 30 });
        const history = new CommandHistory();
        const onSceneChange = vi.fn();

        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
                onSceneChange={onSceneChange}
                commandHistory={history}
            />
        );

        (capturedRectProps!.onDragEnd as (e: unknown) => void)({
            target: { id: () => 'n1', x: () => 42, y: () => 99 },
        });
        history.undo();

        const scenes = onSceneChange.mock.calls.map(call => call[0] as Scene);
        expect(scenes).toHaveLength(2);
        expect(scenes[0]).toBe(scene);
        expect(scenes[1]).toBe(scene);
    });

    it('undoes correctly through two sequential drags, not just one (the copy-per-change bug only showed up on the second undo)', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 50, height: 30 });
        const history = new CommandHistory();

        render(<KonvaDesigner width={800} height={600} scene={scene} commandHistory={history} />);

        (capturedRectProps!.onDragEnd as (e: unknown) => void)({
            target: { id: () => 'n1', x: () => 10, y: () => 10 },
        });
        (capturedRectProps!.onDragEnd as (e: unknown) => void)({
            target: { id: () => 'n1', x: () => 20, y: () => 20 },
        });

        history.undo(); // back to (10, 10)
        expect(scene.getObjects().find(o => o.id === 'n1')).toMatchObject({ x: 10, y: 10 });

        history.undo(); // back to (0, 0)
        expect(scene.getObjects().find(o => o.id === 'n1')).toMatchObject({ x: 0, y: 0 });
    });

    it('does not push a command (or call onSceneChange) for a drag that ends at the same position', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 5, y: 5, width: 50, height: 30 });
        const history = new CommandHistory();
        const onSceneChange = vi.fn();

        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
                onSceneChange={onSceneChange}
                commandHistory={history}
            />
        );

        (capturedRectProps!.onDragEnd as (e: unknown) => void)({
            target: { id: () => 'n1', x: () => 5, y: () => 5 },
        });

        expect(history.canUndo()).toBe(false);
        expect(onSceneChange).not.toHaveBeenCalled();
    });
});
