import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

// Captures the live props (including handlers) react-konva's shapes receive — mirrors
// KonvaDesigner.drag.test.tsx's approach, needed here for the same reason: JSON-serializing
// mocks drop functions and can't exercise onTransformEnd directly.
let capturedRectProps: Record<string, unknown> | null = null;
let capturedCircleProps: Record<string, unknown> | null = null;

vi.mock('react-konva', () => ({
    Stage: ({ children }: any) => <div>{children}</div>,
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: (props: any) => {
        capturedRectProps = props;
        return <div data-testid="konva-rect" />;
    },
    Circle: (props: any) => {
        capturedCircleProps = props;
        return <div data-testid="konva-circle" />;
    },
    Text: () => null,
    Line: () => null,
    Image: () => null,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

function fakeTransformEndEvent(overrides: { id: string; x: number; y: number; scaleX: number; scaleY: number }) {
    let sx = overrides.scaleX;
    let sy = overrides.scaleY;
    return {
        target: {
            id: () => overrides.id,
            x: () => overrides.x,
            y: () => overrides.y,
            scaleX: (v?: number) => (v === undefined ? sx : (sx = v)),
            scaleY: (v?: number) => (v === undefined ? sy : (sy = v)),
        },
    } as any;
}

describe('KonvaDesigner resize → onSceneChange', () => {
    it('bakes a rect resize scale factor into width/height, not the pre-resize size', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 100, height: 50 });

        const onSceneChange = vi.fn();
        render(<KonvaDesigner width={800} height={600} scene={scene} onSceneChange={onSceneChange} />);

        expect(capturedRectProps).not.toBeNull();
        const event = fakeTransformEndEvent({ id: 'n1', x: 10, y: 20, scaleX: 2, scaleY: 1.5 });
        (capturedRectProps!.onTransformEnd as (e: unknown) => void)(event);

        expect(onSceneChange).toHaveBeenCalledTimes(1);
        const newScene = onSceneChange.mock.calls[0][0] as Scene;
        const updated = newScene.getObjects().find(o => o.id === 'n1');
        expect(updated).toMatchObject({ x: 10, y: 20, width: 200, height: 75 });
    });

    it('resets the Konva node scale to 1 after baking it into size (no compounding on next resize)', () => {
        const scene = new Scene();
        scene.add({ id: 'n1', type: 'rect', x: 0, y: 0, width: 100, height: 50 });
        render(<KonvaDesigner width={800} height={600} scene={scene} />);

        const event = fakeTransformEndEvent({ id: 'n1', x: 0, y: 0, scaleX: 2, scaleY: 2 });
        (capturedRectProps!.onTransformEnd as (e: unknown) => void)(event);

        expect(event.target.scaleX()).toBe(1);
        expect(event.target.scaleY()).toBe(1);
    });

    it('bakes a circle resize into radius', () => {
        const scene = new Scene();
        scene.add({ id: 'c1', type: 'circle', x: 0, y: 0, radius: 20 });

        const onSceneChange = vi.fn();
        render(<KonvaDesigner width={800} height={600} scene={scene} onSceneChange={onSceneChange} />);

        expect(capturedCircleProps).not.toBeNull();
        const event = fakeTransformEndEvent({ id: 'c1', x: 0, y: 0, scaleX: 3, scaleY: 3 });
        (capturedCircleProps!.onTransformEnd as (e: unknown) => void)(event);

        const newScene = onSceneChange.mock.calls[0][0] as Scene;
        const updated = newScene.getObjects().find(o => o.id === 'c1');
        expect(updated).toMatchObject({ radius: 60 });
    });
});
