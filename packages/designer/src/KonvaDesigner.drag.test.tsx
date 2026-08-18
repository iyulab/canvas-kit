import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// Captures the live props (including handlers) react-konva's Rect receives — the shared
// KonvaDesigner.test.tsx mock JSON-serializes props, which drops functions and can't exercise
// onDragEnd directly.
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

describe('KonvaDesigner drag → onSceneChange', () => {
    it('reports the post-drag position, not the pre-drag one (Scene.copy() breaks reference identity)', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 50, height: 30 });

        const onSceneChange = vi.fn();
        render(<KonvaDesigner width={800} height={600} scene={scene} onSceneChange={onSceneChange} />);

        const fakeEvent = {
            target: { id: () => 'n1', x: () => 42, y: () => 99 },
        } as any;

        expect(capturedRectProps).not.toBeNull();
        (capturedRectProps!.onDragEnd as (e: unknown) => void)(fakeEvent);

        expect(onSceneChange).toHaveBeenCalledTimes(1);
        const newScene = onSceneChange.mock.calls[0][0] as Scene;
        const updated = newScene.getObjects().find(o => o.id === 'n1');
        expect(updated).toMatchObject({ x: 42, y: 99 });
    });
});
