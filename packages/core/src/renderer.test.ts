import { CanvasKitRenderer } from './renderer';
import { Scene } from './scene';
import { IDENTITY_TRANSFORM } from './types';
import { createImageLoader } from './image-loader';
import type { ImageLoader } from './image-loader';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CanvasKitRenderer transform', () => {
  let renderer: CanvasKitRenderer;
  let canvas: HTMLCanvasElement;
  let scene: Scene;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    renderer = new CanvasKitRenderer(canvas);
    scene = new Scene();
    scene.add({ type: 'rect', x: 10, y: 20, width: 50, height: 100, fill: 'red' });
  });

  it('defaults to the identity transform when none is given', () => {
    renderer.render(scene);

    const ctx = canvas.getContext('2d');
    // @ts-ignore vitest-canvas-mock helper
    const drawCalls = ctx.__getDrawCalls();
    const fillRect = drawCalls.find((c: { type: string }) => c.type === 'fillRect');
    expect(fillRect.transform).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('applies a pan (x/y) transform to drawn objects but not to clear', () => {
    renderer.render(scene, { x: 15, y: 25, scale: 1 });

    const ctx = canvas.getContext('2d');
    // @ts-ignore
    const drawCalls = ctx.__getDrawCalls();
    const clearRect = drawCalls.find((c: { type: string }) => c.type === 'clearRect');
    const fillRect = drawCalls.find((c: { type: string }) => c.type === 'fillRect');

    // clear always runs against the raw canvas, regardless of the view transform
    expect(clearRect.transform).toEqual([1, 0, 0, 1, 0, 0]);
    // drawn objects are offset by the pan
    expect(fillRect.transform).toEqual([1, 0, 0, 1, 15, 25]);
  });

  it('applies a zoom (scale) transform to drawn objects', () => {
    renderer.render(scene, { x: 0, y: 0, scale: 2 });

    const ctx = canvas.getContext('2d');
    // @ts-ignore
    const drawCalls = ctx.__getDrawCalls();
    const fillRect = drawCalls.find((c: { type: string }) => c.type === 'fillRect');

    expect(fillRect.transform).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it('does not leak the transform into a subsequent render with no transform', () => {
    renderer.render(scene, { x: 100, y: 100, scale: 3 });
    renderer.render(scene); // should be back to identity — ctx.save/restore must balance

    const ctx = canvas.getContext('2d');
    // @ts-ignore
    const drawCalls = ctx.__getDrawCalls();
    const fillRects = drawCalls.filter((c: { type: string }) => c.type === 'fillRect');
    expect(fillRects[fillRects.length - 1].transform).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('exports IDENTITY_TRANSFORM as {x:0, y:0, scale:1}', () => {
    expect(IDENTITY_TRANSFORM).toEqual({ x: 0, y: 0, scale: 1 });
  });
});

describe('CanvasKitRenderer image objects', () => {
  let canvas: HTMLCanvasElement;
  let scene: Scene;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    scene = new Scene();
    scene.add({ type: 'image', x: 5, y: 6, width: 40, height: 30, src: 'a.png' });
  });

  it('draws nothing for an image that has not finished loading yet', () => {
    const loader: ImageLoader = { getOrLoadImage: () => null };
    const renderer = new CanvasKitRenderer(canvas, { imageLoader: loader });

    renderer.render(scene);

    const ctx = canvas.getContext('2d');
    // @ts-ignore
    const drawCalls = ctx.__getDrawCalls();
    expect(drawCalls.some((c: { type: string }) => c.type === 'drawImage')).toBe(false);
  });

  it('draws the image once it has loaded', () => {
    const htmlImage = document.createElement('img');
    const loader: ImageLoader = { getOrLoadImage: () => htmlImage };
    const renderer = new CanvasKitRenderer(canvas, { imageLoader: loader });

    renderer.render(scene);

    const ctx = canvas.getContext('2d');
    // @ts-ignore
    const drawCalls = ctx.__getDrawCalls();
    const drawImageCall = drawCalls.find((c: { type: string }) => c.type === 'drawImage');
    expect(drawImageCall).toBeDefined();
  });

  it('calls onImageLoad once a not-yet-loaded image finishes loading', () => {
    let capturedImage: HTMLImageElement;
    const loader = createImageLoader(() => {
      capturedImage = document.createElement('img');
      return capturedImage;
    });
    const onImageLoad = vi.fn();
    const renderer = new CanvasKitRenderer(canvas, { imageLoader: loader, onImageLoad });

    renderer.render(scene); // triggers the load, image not ready yet
    expect(onImageLoad).not.toHaveBeenCalled();

    // simulate the browser firing the image's load event
    (capturedImage! as any).onload?.();

    expect(onImageLoad).toHaveBeenCalledTimes(1);
  });

  it('does not throw when an object has an unrecognized type', () => {
    const renderer = new CanvasKitRenderer(canvas);
    const badScene = new Scene();
    badScene.add({ type: 'unknown-shape' } as any);

    expect(() => renderer.render(badScene)).not.toThrow();
  });
});
