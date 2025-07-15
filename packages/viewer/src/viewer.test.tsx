import React from 'react';
import { render, screen } from '@testing-library/react';
import { Viewer } from './viewer';
import { CanvasKitRenderer, Scene } from '@canvas-kit/core';
import { vi } from 'vitest';

// Mock the CanvasKitRenderer
const mockRender = vi.fn();
const mockClear = vi.fn();

vi.mock('@canvas-kit/core', () => {
  const MockCanvasKitRenderer = vi.fn().mockImplementation(() => ({
    render: mockRender,
    clear: mockClear,
  }));

  const MockScene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    getObjects: vi.fn(() => []),
    clear: vi.fn(),
  }));

  return {
    CanvasKitRenderer: MockCanvasKitRenderer,
    Scene: MockScene,
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
    expect(mockRender).toHaveBeenCalledWith(scene);
  });

  it('does not create renderer when scene is not provided', () => {
    render(<Viewer width={100} height={100} />);

    expect(CanvasKitRenderer).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });
});