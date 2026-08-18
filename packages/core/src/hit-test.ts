import type { DrawingObject, Rect, Circle, Text, Path, Line, Image as ImageShape } from './types';

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
        const textWidth = text.text.length * fontSize * 0.6;
        const textHeight = fontSize;

        return (
            x >= text.x &&
            x <= text.x + textWidth &&
            y >= text.y - textHeight &&
            y <= text.y
        );
    }

    static isPointInPolyline(x: number, y: number, points: number[]): boolean {
        if (points.length < 4) return false;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < points.length - 1; i += 2) {
            minX = Math.min(minX, points[i]);
            maxX = Math.max(maxX, points[i]);
            minY = Math.min(minY, points[i + 1]);
            maxY = Math.max(maxY, points[i + 1]);
        }
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
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
                return this.isPointInPolyline(x, y, (obj as Path).points);
            case 'line':
                return this.isPointInPolyline(x, y, (obj as Line).points);
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
