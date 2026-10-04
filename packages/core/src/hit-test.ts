import type { DrawingObject, Rect, Circle, Text, Image as ImageShape } from './types';
import { containsPoint, getObjectBounds, isPointNearPolyline } from './geometry';

/** Point hit testing in scene coordinates. Geometry follows `getObjectBounds` (`./geometry`) — the
 * same rules every renderer draws by. */
export class HitTest {
    static isPointInRect(x: number, y: number, rect: Rect | ImageShape): boolean {
        return containsPoint(rect, x, y);
    }

    static isPointInCircle(x: number, y: number, circle: Circle): boolean {
        return containsPoint(circle, x, y);
    }

    /** `x`/`y` of a text object is the top-left of its text box. */
    static isPointInText(x: number, y: number, text: Text): boolean {
        const box = getObjectBounds(text);
        return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
    }

    /** `points` here are already in scene coordinates (a line's or path's own `points` are
     * relative to its `x`/`y` — `isPointInObject` applies that offset). `strokeWidth` is the
     * rendered thickness (default 1, matching canvas's default lineWidth); half of it plus a few
     * pixels of pointer tolerance sets how close a click needs to land to the actual segments. */
    static isPointInPolyline(x: number, y: number, points: number[], strokeWidth = 1): boolean {
        return isPointNearPolyline(x, y, points, strokeWidth);
    }

    static isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
        return containsPoint(obj, x, y);
    }

    static getObjectsAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject[] {
        return objects.filter(obj => containsPoint(obj, x, y));
    }

    static getTopObjectAtPoint(x: number, y: number, objects: readonly DrawingObject[]): DrawingObject | null {
        const hitObjects = this.getObjectsAtPoint(x, y, objects);
        return hitObjects.length > 0 ? hitObjects[hitObjects.length - 1] : null;
    }
}
