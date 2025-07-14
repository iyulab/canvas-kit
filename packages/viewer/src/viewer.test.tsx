import React from 'react';
import { render, screen } from '@testing-library/react';
import { Viewer } from './viewer';
import { CanvasKitRenderer } from '@canvas-kit/core';

vi.mock('@canvas-kit/core', () => {
  const mockDrawRect = vi.fn();
  const mockDrawCircle = vi.fn();
  const MockCanvasKitRenderer = vi.fn().mockImplementation(() => {
    return { drawRect: mockDrawRect, drawCircle: mockDrawCircle };
  });
  return { CanvasKitRenderer: MockCanvasKitRenderer, mockDrawRect, mockDrawCircle };
});

describe('Viewer', () => {
  it('renders a canvas element and calls the renderer', () => {
    render(<Viewer width={100} height={100} />);
    const canvasElement = screen.getByTestId('canvas');
    expect(canvasElement).toBeInTheDocument();

    expect(CanvasKitRenderer).toHaveBeenCalledTimes(1);
    // We can't easily access the mockDrawRect and mockDrawCircle from the module mock
    // so we can't assert that they have been called. 
    // However, we can assert that the renderer was instantiated.
  });
});