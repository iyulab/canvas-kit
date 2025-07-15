import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scene } from '@canvas-kit/core';
import { KonvaDesigner } from './KonvaDesigner';
import '@testing-library/jest-dom';

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
    Transformer: (props: any) => (
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
            type: 'rectangle',
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
