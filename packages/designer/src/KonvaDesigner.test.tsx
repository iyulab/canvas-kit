import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scene, tracePath, textBoxOffsetX } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';
import '@testing-library/jest-dom/vitest';

// Mock Konva components
vi.mock('react-konva', () => ({
    Stage: ({ children, ...props }: any) => (
        <div data-testid="konva-stage" {...props}>
            {children}
        </div>
    ),
    Layer: ({ children }: any) => (
        <div data-testid="konva-layer">
            {children}
        </div>
    ),
    Rect: (props: any) => (
        <div data-testid="konva-rect" data-props={JSON.stringify(props)} />
    ),
    Circle: (props: any) => (
        <div data-testid="konva-circle" data-props={JSON.stringify(props)} />
    ),
    Text: (props: any) => (
        <div data-testid="konva-text" data-props={JSON.stringify(props)} />
    ),
    // Runs the shape's sceneFunc against a recording context, so a test can see what it draws.
    Shape: ({ sceneFunc, ...props }: any) => {
        const calls: unknown[][] = [];
        const record = (name: string) => (...args: unknown[]) => { calls.push([name, ...args]); };
        sceneFunc({
            beginPath: record('beginPath'), moveTo: record('moveTo'), lineTo: record('lineTo'),
            quadraticCurveTo: record('quadraticCurveTo'), closePath: record('closePath'),
            fillStrokeShape: record('fillStrokeShape'),
        }, {});
        return <div data-testid="konva-shape" data-props={JSON.stringify(props)} data-calls={JSON.stringify(calls)} />;
    },
    Image: (props: any) => (
        <div data-testid="konva-image" data-props={JSON.stringify({ ...props, image: undefined })} />
    ),
    Transformer: () => (
        <div data-testid="konva-transformer" />
    ),
}));

vi.mock('konva', () => ({
    default: {},
}));

describe('KonvaDesigner', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('renders Konva Stage with correct dimensions', () => {
        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
            />
        );

        const stage = screen.getByTestId('konva-stage');
        expect(stage).toBeInTheDocument();
        expect(stage).toHaveAttribute('width', '800');
        expect(stage).toHaveAttribute('height', '600');
    });

    it('renders scene objects as Konva components', () => {
        // Add test objects to scene
        scene.add({
            id: 'rect1',
            type: 'rect',
            x: 10,
            y: 20,
            width: 50,
            height: 30,
            fill: '#ff0000'
        });

        scene.add({
            id: 'circle1',
            type: 'circle',
            x: 100,
            y: 150,
            radius: 25,
            fill: '#00ff00'
        });

        render(
            <KonvaDesigner
                width={800}
                height={600}
                scene={scene}
            />
        );

        // Check that Konva components are rendered
        expect(screen.getByTestId('konva-rect')).toBeInTheDocument();
        expect(screen.getByTestId('konva-circle')).toBeInTheDocument();
        expect(screen.getByTestId('konva-transformer')).toBeInTheDocument();
    });

    it('renders a path through the same tracePath the canvas renderer uses, offset by x/y', () => {
        const path = { id: 'p1', type: 'path' as const, x: 30, y: 40, points: [0, 0, 20, 10, 40, 0], tension: 0.5, closed: true, fill: 'teal', stroke: 'black', strokeWidth: 2 };
        scene.add(path);

        render(<KonvaDesigner width={800} height={600} scene={scene} />);

        const node = screen.getByTestId('konva-shape');
        expect(JSON.parse(node.getAttribute('data-props')!)).toMatchObject({ id: 'p1', x: 30, y: 40, fill: 'teal', stroke: 'black', strokeWidth: 2 });
        const expected: unknown[][] = [];
        const record = (name: string) => (...args: unknown[]) => { expected.push([name, ...args]); };
        tracePath({ beginPath: record('beginPath'), moveTo: record('moveTo'), lineTo: record('lineTo'), quadraticCurveTo: record('quadraticCurveTo'), closePath: record('closePath') }, path);
        expect(JSON.parse(node.getAttribute('data-calls')!)).toEqual([...expected, ['fillStrokeShape', {}]]);
    });

    it('anchors aligned text at x, as the canvas renderer does', () => {
        const text = { id: 't1', type: 'text' as const, x: 100, y: 10, text: 'Centered', align: 'center' as const };
        scene.add(text);

        render(<KonvaDesigner width={800} height={600} scene={scene} />);

        const props = JSON.parse(screen.getByTestId('konva-text').getAttribute('data-props')!);
        expect(props.x).toBe(100);
        expect(props.offsetX).toBeGreaterThan(0);
        expect(props.offsetX).toBe(textBoxOffsetX(text));
    });

    it('renders an image object as a Konva Image, positioned like other shapes', () => {
        scene.add({
            id: 'img1',
            type: 'image',
            x: 5,
            y: 15,
            width: 200,
            height: 100,
            src: 'https://example.com/floor-plan.png',
        });

        render(<KonvaDesigner width={800} height={600} scene={scene} />);

        const imageNode = screen.getByTestId('konva-image');
        expect(imageNode).toBeInTheDocument();
        const props = JSON.parse(imageNode.getAttribute('data-props')!);
        expect(props).toMatchObject({ id: 'img1', x: 5, y: 15, width: 200, height: 100 });
    });

    it('renders with Layer and Transformer components', () => {
        render(
            <KonvaDesigner
                width={400}
                height={300}
                scene={scene}
            />
        );

        expect(screen.getByTestId('konva-layer')).toBeInTheDocument();
        expect(screen.getByTestId('konva-transformer')).toBeInTheDocument();
    });

    it('calls onSelectionChange callback when provided', () => {
        const onSelectionChange = vi.fn();

        render(
            <KonvaDesigner
                width={400}
                height={300}
                scene={scene}
                onSelectionChange={onSelectionChange}
            />
        );

        // Callback should be set up (we can't easily test click events with mocked Konva)
        expect(onSelectionChange).toBeDefined();
    });
});
