import type { DrawingObject, Text } from './types';

/** An axis-aligned box in scene coordinates. */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Font defaults every renderer applies when a text object leaves them unset. */
export const DEFAULT_FONT_SIZE = 16;
export const DEFAULT_FONT_FAMILY = 'Arial';
/** Text with no `fill` is drawn in this color, so it is visible rather than skipped. */
export const DEFAULT_TEXT_FILL = 'black';
/** A line with no `stroke`/`strokeWidth` is drawn with these, so it is visible rather than skipped. */
export const DEFAULT_LINE_STROKE = 'black';
export const DEFAULT_LINE_WIDTH = 1;

/** Extra distance, beyond half the stroke, within which a point still hits a line or path. */
const POLYLINE_HIT_TOLERANCE = 4;

/** Reuses one off-screen 2D context for `measureText` rather than creating a canvas per call.
 * `null` outside a DOM environment, where text width falls back to an estimate. */
let measureContext: CanvasRenderingContext2D | null | undefined;
function getMeasureContext(): CanvasRenderingContext2D | null {
    if (measureContext === undefined) {
        measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    }
    return measureContext;
}

/** The rendered width of a text object's string. */
export function measureTextWidth(text: Text): number {
    const fontSize = text.fontSize ?? DEFAULT_FONT_SIZE;
    const ctx = getMeasureContext();
    if (ctx) {
        ctx.font = `${fontSize}px ${text.fontFamily ?? DEFAULT_FONT_FAMILY}`;
        return ctx.measureText(text.text).width;
    }
    return text.text.length * fontSize * 0.6;
}

/** How far a text box's left edge sits left of the text's `x`: `x` is the alignment anchor — the
 * box's left edge for `left` (the default), its middle for `center`, its right edge for `right`. */
export function textBoxOffsetX(text: Text): number {
    const ratio = text.align === 'center' ? 0.5 : text.align === 'right' ? 1 : 0;
    return ratio === 0 ? 0 : measureTextWidth(text) * ratio;
}

/** A line's or path's points in scene coordinates: `points` are relative to the object's `x`/`y`,
 * so moving the object moves the whole polyline. */
export function polylinePoints(obj: { x: number; y: number; points: readonly number[] }): number[] {
    return obj.points.map((value, i) => value + (i % 2 === 0 ? obj.x : obj.y));
}

/**
 * The box an object occupies in scene coordinates.
 *
 * - `rect` / `image`: `x`/`y` is the top-left corner.
 * - `circle`: `x`/`y` is the center.
 * - `text`: `y` is the top of the text box (one line of `fontSize` height); `x` is its left edge,
 *   middle or right edge as `align` says (`textBoxOffsetX`).
 * - `line` / `path`: the extent of the points, offset by `x`/`y`. No points → an empty box at `x`/`y`.
 */
export function getObjectBounds(obj: DrawingObject): BoundingBox {
    switch (obj.type) {
        case 'rect':
        case 'image':
            return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
        case 'circle':
            return { x: obj.x - obj.radius, y: obj.y - obj.radius, width: obj.radius * 2, height: obj.radius * 2 };
        case 'text': {
            const width = measureTextWidth(obj);
            return { x: obj.x - textBoxOffsetX(obj), y: obj.y, width, height: obj.fontSize ?? DEFAULT_FONT_SIZE };
        }
        case 'line':
        case 'path': {
            const points = polylinePoints(obj);
            if (points.length < 2) return { x: obj.x, y: obj.y, width: 0, height: 0 };
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (let i = 0; i + 1 < points.length; i += 2) {
                minX = Math.min(minX, points[i]);
                maxX = Math.max(maxX, points[i]);
                minY = Math.min(minY, points[i + 1]);
                maxY = Math.max(maxY, points[i + 1]);
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
    }
}

/** Distance from (x, y) to the segment (x1, y1)-(x2, y2); 0 when the point falls on the segment. */
function distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(x - x1, y - y1);
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Whether (x, y) lands within `strokeWidth / 2` plus a small pointer tolerance of any segment of
 * a polyline given in scene coordinates. Fewer than two points never hit. */
export function isPointNearPolyline(x: number, y: number, points: readonly number[], strokeWidth = 1): boolean {
    if (points.length < 4) return false;
    const threshold = strokeWidth / 2 + POLYLINE_HIT_TOLERANCE;
    for (let i = 0; i + 3 < points.length; i += 2) {
        if (distanceToSegment(x, y, points[i], points[i + 1], points[i + 2], points[i + 3]) <= threshold) return true;
    }
    return false;
}

function isPointInBox(x: number, y: number, box: BoundingBox): boolean {
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

/** Whether a scene point hits an object: inside its box, inside a circle's radius, or near a
 * line's or path's actual segments (not merely their bounding box). */
export function containsPoint(obj: DrawingObject, x: number, y: number): boolean {
    switch (obj.type) {
        case 'circle':
            return Math.hypot(x - obj.x, y - obj.y) <= obj.radius;
        case 'line':
        case 'path':
            return isPointNearPolyline(x, y, polylinePoints(obj), obj.strokeWidth);
        default:
            return isPointInBox(x, y, getObjectBounds(obj));
    }
}

/** Whether an object lies entirely inside `rect`. */
export function isObjectInsideRect(obj: DrawingObject, rect: BoundingBox): boolean {
    const box = getObjectBounds(obj);
    return box.x >= rect.x && box.y >= rect.y &&
        box.x + box.width <= rect.x + rect.width &&
        box.y + box.height <= rect.y + rect.height;
}

/** Whether an object overlaps `rect` at all — exactly for circles, by bounding box otherwise. */
export function isObjectIntersectingRect(obj: DrawingObject, rect: BoundingBox): boolean {
    if (obj.type === 'circle') {
        const closestX = Math.max(rect.x, Math.min(obj.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(obj.y, rect.y + rect.height));
        return Math.hypot(obj.x - closestX, obj.y - closestY) <= obj.radius;
    }
    const box = getObjectBounds(obj);
    return !(box.x > rect.x + rect.width || box.x + box.width < rect.x ||
        box.y > rect.y + rect.height || box.y + box.height < rect.y);
}
