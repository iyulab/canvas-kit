import React from 'react';
import { render, screen } from '@testing-library/react';
import { Viewer } from './viewer';
import { CanvasKitRenderer, Scene } from '@canvas-kit/core';
import { vi } from 'vitest';

// Mock the CanvasKitRenderer
const mockRender = vi.fn();
const mockClear = vi.fn();

vi.mock('@canvas-kit/core', () => {
  const MockCanvasKitRenderer = vi.fn(function (this: Record<string, unknown>) {
    this.render = mockRender;
    this.clear = mockClear;
  });

  const MockScene = vi.fn(function (this: Record<string, unknown>) {
    this.add = vi.fn();
    this.remove = vi.fn();
    this.getObjects = vi.fn(() => []);
    this.clear = vi.fn();
  });

  return {
    CanvasKitRenderer: MockCanvasKitRenderer,
    Scene: MockScene,
    IDENTITY_TRANSFORM: { x: 0, y: 0, scale: 1 },
  };
});

describe('Viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a canvas element', () => {
    render(<Viewer width={100} height={100} />);
    const canvasElement = screen.getByTestId('canvas');
    expect(canvasElement).toBeInTheDocument();
    expect(canvasElement).toHaveAttribute('width', '100');
    expect(canvasElement).toHaveAttribute('height', '100');
  });

  it('creates renderer and calls render when scene is provided', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    expect(CanvasKitRenderer).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('does not create renderer when scene is not provided', () => {
    render(<Viewer width={100} height={100} />);

    expect(CanvasKitRenderer).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('renders scene with the identity transform by default', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('passes a given transform through to the renderer', () => {
    const scene = new Scene();
    const transform = { x: 10, y: 20, scale: 2 };
    render(<Viewer width={100} height={100} scene={scene} transform={transform} />);

    expect(mockRender).toHaveBeenCalledWith(scene, transform);
  });

  it('renders no overlays by default', () => {
    render(<Viewer width={100} height={100} />);
    const overlayLayer = screen.getByTestId('overlay-layer');
    expect(overlayLayer.children.length).toBe(0);
  });

  it('renders overlay content positioned at its scene coordinates', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[
          { id: 'w1', x: 30, y: 40, width: 60, height: 20, content: <span>widget-1</span> },
        ]}
      />
    );

    const overlay = screen.getByTestId('overlay-w1');
    expect(overlay).toHaveTextContent('widget-1');
    expect(overlay.style.left).toBe('30px');
    expect(overlay.style.top).toBe('40px');
    expect(overlay.style.width).toBe('60px');
    expect(overlay.style.height).toBe('20px');
  });

  it('renders multiple overlays independently, keyed by id', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[
          { id: 'a', x: 0, y: 0, width: 10, height: 10, content: <span>A</span> },
          { id: 'b', x: 10, y: 10, width: 10, height: 10, content: <span>B</span> },
        ]}
      />
    );

    expect(screen.getByTestId('overlay-a')).toHaveTextContent('A');
    expect(screen.getByTestId('overlay-b')).toHaveTextContent('B');
  });

  it('applies the view transform to the overlay layer so DOM content pans/zooms with the canvas', () => {
    render(
      <Viewer width={100} height={100} transform={{ x: 15, y: 25, scale: 2 }} overlays={[]} />
    );

    const overlayLayer = screen.getByTestId('overlay-layer');
    expect(overlayLayer.style.transform).toBe('translate(15px, 25px) scale(2)');
    expect(overlayLayer.style.transformOrigin).toBe('0 0');
  });

  it('keeps the overlay layer non-interactive but individual overlays interactive', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[{ id: 'w1', x: 0, y: 0, width: 10, height: 10, content: <span>w</span> }]}
      />
    );

    expect(screen.getByTestId('overlay-layer').style.pointerEvents).toBe('none');
    expect(screen.getByTestId('overlay-w1').style.pointerEvents).toBe('auto');
  });
});