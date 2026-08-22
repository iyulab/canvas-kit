import type { DrawingObject, Rect, Circle, Text, Path, Line, Image as ImageShape } from './types';

/** Distance from (x, y) to the segment (x1, y1)-(x2, y2); 0 when the point falls on the segment. */
function distanceToSegment(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(x - x1, y - y1);
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Reuses one off-screen 2D context across calls (`measureText` is the only thing it's used
 * for) rather than creating a canvas per hit test. Returns `null` outside a DOM environment, so
 * callers can fall back to an estimate instead of throwing. */
let measureContext: CanvasRenderingContext2D | null | undefined;
function getMeasureContext(): CanvasRenderingContext2D | null {
    if (measureContext === undefined) {
        measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    }
    return measureContext;
}

export class HitTest {
    static isPointInRect(x: number, y: number, rect: Rect | ImageShape): boolean {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }

    static isPointInCircle(x: number, y: number, circle: Circle): boolean {
        const dx = x - circle.x;
        const dy = y - circle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circle.radius;
    }

    static isPointInText(x: number, y: number, text: Text): boolean {
        const fontSize = text.fontSize || 16;
        const ctx = getMeasureContext();
        let textWidth: number;
        if (ctx) {
            ctx.font = `${fontSize}px ${text.fontFamily || 'sans-serif'}`;
            textWidth = ctx.measureText(text.text).width;
        } else {
            // No DOM canvas available (e.g. a non-browser test environment) — fall back to the
            // same rough estimate this method used before measureText was available.
            textWidth = text.text.length * fontSize * 0.6;
        }
        const textHeight = fontSize;

        return (
            x >= text.x &&
            x <= text.x + textWidth &&
            y >= text.y - textHeight &&
            y <= text.y
        );
    }

    /** `strokeWidth` is the line's own rendered thickness (default 1, matching canvas's default
     * lineWidth); half of it plus a few pixels of pointer tolerance sets how close a click needs
     * to land to the actual segments — not just their bounding box. */
    static isPointInPolyline(x: number, y: number, points: number[], strokeWidth = 1): boolean {
        if (points.length < 4) return false;
        const threshold = strokeWidth / 2 + 4;
        for (let i = 0; i < points.length - 2; i += 2) {
            const distance = distanceToSegment(x, y, points[i], points[i + 1], points[i + 2], points[i + 3]);
            if (distance <= threshold) return true;
        }
        return false;
    }

    static isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
        switch (obj.type) {
            case 'rect':
                return this.isPointInRect(x, y, obj as Rect);
            case 'circle':
                return this.isPointInCircle(x, y, obj as Circle);
            case 'text':
                return this.isPointInText(x, y, obj as Text);
            case 'path':
                return this.isPointInPolyline(x, y, (obj as Path).points, (obj as Path).strokeWidth);
            case 'line':
                return this.isPointInPolyline(x, y, (obj as Line).points, (obj as Line).strokeWidth);
            case 'image':
                return this.isPointInRect(x, y, obj as ImageShape);
            default:
                return false;
        }
    }

    static getObjectsAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject[] {
        return objects.filter(obj => this.isPointInObject(x, y, obj));
    }

    static getTopObjectAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject | null {
        const hitObjects = this.getObjectsAtPoint(x, y, objects);
        return hitObjects.length > 0 ? hitObjects[hitObjects.length - 1] : null;
    }
}
