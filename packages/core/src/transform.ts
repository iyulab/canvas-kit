import type { Transform } from './types';
import type { Point, Rect } from './selection';

// 뷰 transform의 좌표 변환 — 렌더러(ctx.translate 후 ctx.scale)와 DOM 오버레이
// (translate(...) scale(...), origin 0 0)가 공유하는 수식을 한 곳에 둔다.
// view = scene * scale + (x, y)

export interface Size {
  width: number;
  height: number;
}

/** Maps a point in view (viewport-local, CSS px) coordinates to scene coordinates. */
export function viewToScene(transform: Transform, point: Point): Point {
  return {
    x: (point.x - transform.x) / transform.scale,
    y: (point.y - transform.y) / transform.scale,
  };
}

/** Maps a point in scene coordinates to view (viewport-local, CSS px) coordinates. */
export function sceneToView(transform: Transform, point: Point): Point {
  return {
    x: point.x * transform.scale + transform.x,
    y: point.y * transform.scale + transform.y,
  };
}

export interface FitTransformOptions {
  /** Space (view px) kept clear on every side of the fitted rect. Default 0. */
  padding?: number;
  minScale?: number;
  maxScale?: number;
}

/**
 * Computes the transform that fits a scene rect inside a viewport — as large as possible
 * while keeping `padding` clear on every side, centered, with the scale clamped to
 * `[minScale, maxScale]`. A zero width or height is fitted by the other axis alone; a rect
 * with no extent at all (or a viewport with no room left after padding) is centered at
 * scale 1, still clamped.
 */
export function fitTransform(viewport: Size, rect: Rect, options: FitTransformOptions = {}): Transform {
  const { padding = 0, minScale = 0, maxScale = Infinity } = options;
  const availableWidth = Math.max(0, viewport.width - 2 * padding);
  const availableHeight = Math.max(0, viewport.height - 2 * padding);

  const scaleX = rect.width > 0 ? availableWidth / rect.width : Infinity;
  const scaleY = rect.height > 0 ? availableHeight / rect.height : Infinity;
  let scale = Math.min(scaleX, scaleY);
  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 1;
  }
  scale = Math.min(maxScale, Math.max(minScale, scale));

  return {
    x: viewport.width / 2 - (rect.x + rect.width / 2) * scale,
    y: viewport.height / 2 - (rect.y + rect.height / 2) * scale,
    scale,
  };
}

export interface ZoomBounds {
  minScale?: number;
  maxScale?: number;
}

/**
 * Scales a transform by `factor` around a view point — the scene point under `point` stays under
 * it — with the resulting scale clamped to `[minScale, maxScale]`. What a wheel or pinch zoom
 * centered on the pointer computes.
 */
export function zoomAt(transform: Transform, point: Point, factor: number, bounds: ZoomBounds = {}): Transform {
  const { minScale = 0, maxScale = Infinity } = bounds;
  const scale = Math.min(maxScale, Math.max(minScale, transform.scale * factor));
  const anchor = viewToScene(transform, point);
  return {
    x: point.x - anchor.x * scale,
    y: point.y - anchor.y * scale,
    scale,
  };
}
