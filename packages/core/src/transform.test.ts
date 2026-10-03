import { describe, it, expect } from 'vitest';
import { viewToScene, sceneToView, fitTransform, zoomAt } from './transform';

describe('viewToScene / sceneToView', () => {
  const t = { x: 40, y: -20, scale: 2 };

  it('maps a view point to scene coordinates by undoing translate then scale', () => {
    expect(viewToScene(t, { x: 140, y: 80 })).toEqual({ x: 50, y: 50 });
  });

  it('maps a scene point to view coordinates', () => {
    expect(sceneToView(t, { x: 50, y: 50 })).toEqual({ x: 140, y: 80 });
  });

  it('are inverses of each other', () => {
    const p = { x: 12.5, y: -7 };
    expect(viewToScene(t, sceneToView(t, p))).toEqual(p);
  });

  it('is the identity under the identity transform', () => {
    expect(viewToScene({ x: 0, y: 0, scale: 1 }, { x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
  });
});

describe('fitTransform', () => {
  const viewport = { width: 200, height: 100 };

  it('scales the rect to fill the viewport along its limiting axis and centers it', () => {
    // 100x100 rect into 200x100: height limits, scale 1, centered horizontally
    const t = fitTransform(viewport, { x: 0, y: 0, width: 100, height: 100 });
    expect(t).toEqual({ x: 50, y: 0, scale: 1 });
  });

  it('zooms in on a small rect away from the origin', () => {
    // 20x10 rect at (100, 50) into 200x100: scale 10, rect center (110, 55) lands on view center
    const t = fitTransform(viewport, { x: 100, y: 50, width: 20, height: 10 });
    expect(t.scale).toBe(10);
    expect(sceneToView(t, { x: 110, y: 55 })).toEqual({ x: 100, y: 50 });
  });

  it('leaves padding on every side', () => {
    const t = fitTransform(viewport, { x: 0, y: 0, width: 100, height: 100 }, { padding: 10 });
    // available height 80 -> scale 0.8
    expect(t.scale).toBeCloseTo(0.8);
    expect(sceneToView(t, { x: 0, y: 0 }).y).toBeCloseTo(10);
    expect(sceneToView(t, { x: 100, y: 100 }).y).toBeCloseTo(90);
  });

  it('clamps the scale to [minScale, maxScale] while keeping the rect centered', () => {
    const tiny = fitTransform(viewport, { x: 0, y: 0, width: 1, height: 1 }, { maxScale: 4 });
    expect(tiny.scale).toBe(4);
    expect(sceneToView(tiny, { x: 0.5, y: 0.5 })).toEqual({ x: 100, y: 50 });

    const huge = fitTransform(viewport, { x: 0, y: 0, width: 1e6, height: 1e6 }, { minScale: 0.5 });
    expect(huge.scale).toBe(0.5);
  });

  it('fits a zero-height rect (a horizontal line) by its width alone', () => {
    const t = fitTransform(viewport, { x: 0, y: 0, width: 50, height: 0 });
    expect(t.scale).toBe(4);
  });

  it('centers a zero-size rect (a point) at scale 1, within the clamp', () => {
    expect(fitTransform(viewport, { x: 10, y: 10, width: 0, height: 0 })).toEqual({ x: 90, y: 40, scale: 1 });
    expect(fitTransform(viewport, { x: 10, y: 10, width: 0, height: 0 }, { minScale: 2 }).scale).toBe(2);
  });

  it('falls back to scale 1 (clamped) when padding leaves no room', () => {
    const t = fitTransform(viewport, { x: 0, y: 0, width: 10, height: 10 }, { padding: 60 });
    expect(t.scale).toBe(1);
  });
});

describe('zoomAt', () => {
  const t = { x: 10, y: 20, scale: 2 };

  it('scales by the factor and keeps the scene point under the view point in place', () => {
    const anchor = { x: 50, y: 60 };
    const before = viewToScene(t, anchor);
    const z = zoomAt(t, anchor, 1.5);
    expect(z.scale).toBe(3);
    expect(sceneToView(z, before).x).toBeCloseTo(anchor.x);
    expect(sceneToView(z, before).y).toBeCloseTo(anchor.y);
  });

  it('clamps the scale to [minScale, maxScale], still anchored at the point', () => {
    const anchor = { x: 50, y: 60 };
    const before = viewToScene(t, anchor);
    const z = zoomAt(t, anchor, 100, { maxScale: 4 });
    expect(z.scale).toBe(4);
    expect(sceneToView(z, before).x).toBeCloseTo(anchor.x);
    expect(zoomAt(t, anchor, 0.001, { minScale: 0.5 }).scale).toBe(0.5);
  });
});
