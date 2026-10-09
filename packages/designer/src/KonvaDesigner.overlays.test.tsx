import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';

vi.mock('react-konva', () => ({
    Stage: (props: any) => <div data-testid="konva-stage">{props.children}</div>,
    Layer: ({ children }: any) => <div>{children}</div>,
    Rect: () => null,
    Circle: () => null,
    Text: () => null,
    Line: () => null,
    Image: () => null,
    Transformer: () => null,
}));

vi.mock('konva', () => ({ default: {} }));

const scene = () => {
    const s = new Scene();
    s.add({ id: 'n1', type: 'rect', x: 40, y: 30, width: 160, height: 100 });
    return s;
};

describe('KonvaDesigner overlays', () => {
    it('places each item in scene coordinates, under the view transform', () => {
        render(
            <KonvaDesigner
                width={400}
                height={300}
                scene={scene()}
                transform={{ x: 10, y: 20, scale: 2 }}
                overlays={[{ id: 'n1', x: 40, y: 30, width: 160, height: 100, content: <span>Pump A</span> }]}
            />
        );
        const item = screen.getByTestId('designer-overlay-n1');
        expect(item).toHaveTextContent('Pump A');
        expect(item.style.left).toBe('40px');
        expect(item.style.top).toBe('30px');
        expect(item.style.width).toBe('160px');
        expect(item.style.height).toBe('100px');
        expect((item.parentElement as HTMLElement).style.transform).toBe('translate(10px, 20px) scale(2)');
        expect((item.parentElement as HTMLElement).style.transformOrigin).toBe('0 0');
    });

    it('lets the pointer through an item to the shape beneath, unless the item is interactive', () => {
        render(
            <KonvaDesigner
                width={400}
                height={300}
                scene={scene()}
                overlays={[
                    { id: 'shown', x: 0, y: 0, width: 10, height: 10, content: null },
                    { id: 'control', x: 0, y: 0, width: 10, height: 10, content: null, interactive: true },
                ]}
            />
        );
        expect(screen.getByTestId('designer-overlay-layer').style.pointerEvents).toBe('none');
        expect(screen.getByTestId('designer-overlay-shown').style.pointerEvents).toBe('none');
        expect(screen.getByTestId('designer-overlay-control').style.pointerEvents).toBe('auto');
    });

    it("leaves keys typed into an interactive item to the item — they do not pan the view", () => {
        const onTransformChange = vi.fn();
        render(
            <KonvaDesigner
                width={400}
                height={300}
                scene={scene()}
                onTransformChange={onTransformChange}
                overlays={[{ id: 'c', x: 0, y: 0, width: 10, height: 10, interactive: true, content: <input aria-label="Value" /> }]}
            />
        );
        fireEvent.keyDown(screen.getByLabelText('Value'), { key: 'ArrowLeft' });
        expect(onTransformChange).not.toHaveBeenCalled();
        fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowLeft' });
        expect(onTransformChange).toHaveBeenCalled();
    });
});
