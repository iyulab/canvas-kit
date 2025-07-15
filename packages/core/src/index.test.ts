import { CanvasKitRenderer, Scene } from './index';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CanvasKitRenderer', () => {
  let renderer: CanvasKitRenderer;
  let canvas: HTMLCanvasElement;
  let scene: Scene;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    renderer = new CanvasKitRenderer(canvas);
    scene = new Scene();
  });

  it('should clear the canvas', () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const clearRectSpy = vi.spyOn(ctx, 'clearRect');
    renderer.clear();
    expect(clearRectSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('should render a scene with a rectangle and a circle', () => {
    scene.add({ type: 'rect', x: 10, y: 20, width: 50, height: 100, fill: 'red' });
    scene.add({ type: 'circle', x: 30, y: 40, radius: 25, fill: 'blue' });

    renderer.render(scene);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // @ts-ignore
    expect(ctx.__getDrawCalls()).toMatchSnapshot();
  });
});
