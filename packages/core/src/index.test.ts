import { CanvasKitRenderer } from './index';
import { describe, it, expect, beforeEach, vi } from 'vitest';


describe('CanvasKitRenderer', () => {
  let renderer: CanvasKitRenderer;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    renderer = new CanvasKitRenderer(canvas);
  });

  it('should clear the canvas', () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const clearRectSpy = vi.spyOn(ctx, 'clearRect');
    renderer.clear();
    expect(clearRectSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('should draw a rectangle', () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const fillRectSpy = vi.spyOn(ctx, 'fillRect');
    renderer.drawRect({ x: 10, y: 20, width: 50, height: 100, color: 'red' });
    expect(fillRectSpy).toHaveBeenCalledWith(10, 20, 50, 100);
    expect(ctx.fillStyle).toBe('#ff0000');
  });

  it('should draw a circle', () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const arcSpy = vi.spyOn(ctx, 'arc');
    const fillSpy = vi.spyOn(ctx, 'fill');
    renderer.drawCircle({ x: 30, y: 40, radius: 25, color: 'blue' });
    expect(arcSpy).toHaveBeenCalledWith(30, 40, 25, 0, 2 * Math.PI);
    expect(fillSpy).toHaveBeenCalled();
    expect(ctx.fillStyle).toBe('#0000ff');
  });
});
