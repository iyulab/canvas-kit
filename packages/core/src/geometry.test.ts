import { describe, it, expect } from 'vitest';
import { getObjectBounds, containsPoint, isObjectInsideRect, isObjectIntersectingRect, polylinePoints } from './geometry';
import { SelectionManager, SelectionUtils } from './selection';
import { HitTest } from './hit-test';
import type { DrawingObject } from './types';

describe('getObjectBounds', () => {
    it('reads rects and images from their top-left corner', () => {
        expect(getObjectBounds({ type: 'rect', x: 10, y: 20, width: 30, height: 40 })).toEqual({ x: 10, y: 20, width: 30, height: 40 });
        expect(getObjectBounds({ type: 'image', x: 1, y: 2, width: 3, height: 4, src: 'a.png' })).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    });

    it('reads circles from their center', () => {
        expect(getObjectBounds({ type: 'circle', x: 50, y: 50, radius: 10 })).toEqual({ x: 40, y: 40, width: 20, height: 20 });
    });

    it('puts a text box below its x/y, one fontSize tall', () => {
        const box = getObjectBounds({ type: 'text', x: 10, y: 20, text: 'Hi', fontSize: 12 });
        expect(box.x).toBe(10);
        expect(box.y).toBe(20);
        expect(box.height).toBe(12);
        expect(box.width).toBeGreaterThan(0);
    });

    it('offsets line and path points by the object x/y', () => {
        const line: DrawingObject = { type: 'line', x: 100, y: 50, points: [0, 0, 20, 10] };
        expect(polylinePoints(line)).toEqual([100, 50, 120, 60]);
        expect(getObjectBounds(line)).toEqual({ x: 100, y: 50, width: 20, height: 10 });
        expect(getObjectBounds({ type: 'path', x: 0, y: 0, points: [5, 5, 1, 9, 7, 2] })).toEqual({ x: 1, y: 2, width: 6, height: 7 });
    });

    it('gives a line without points an empty box at its x/y', () => {
        expect(getObjectBounds({ type: 'line', x: 3, y: 4, points: [] })).toEqual({ x: 3, y: 4, width: 0, height: 0 });
    });
});

describe('one geometry for hit testing and selection', () => {
    // A line moved by dragging keeps its points and changes x/y (as the designer does).
    const movedLine: DrawingObject = { type: 'line', x: 200, y: 0, points: [0, 0, 100, 0], strokeWidth: 2 };
    const text: DrawingObject = { type: 'text', x: 0, y: 100, text: 'Label', fontSize: 16 };

    it('hits a moved line where it is drawn, not where its points alone would put it', () => {
        expect(containsPoint(movedLine, 250, 1)).toBe(true);
        expect(containsPoint(movedLine, 50, 1)).toBe(false);
        expect(HitTest.isPointInObject(250, 1, movedLine)).toBe(true);
        expect(SelectionUtils.isPointInObject({ x: 250, y: 1 }, movedLine)).toBe(true);
    });

    it('agrees on a text box between HitTest, SelectionUtils and SelectionManager', () => {
        const inside = { x: 2, y: 108 };
        const above = { x: 2, y: 95 };
        expect(HitTest.isPointInObject(inside.x, inside.y, text)).toBe(true);
        expect(SelectionUtils.isPointInObject(inside, text)).toBe(true);
        expect(HitTest.isPointInObject(above.x, above.y, text)).toBe(false);
        expect(SelectionUtils.isPointInObject(above, text)).toBe(false);
        expect(new SelectionManager().getObjectBounds(text)).toEqual(getObjectBounds(text));
    });

    it('rect selection uses the same boxes', () => {
        expect(isObjectInsideRect(movedLine, { x: 190, y: -10, width: 120, height: 20 })).toBe(true);
        expect(isObjectInsideRect(movedLine, { x: 0, y: -10, width: 120, height: 20 })).toBe(false);
        expect(isObjectIntersectingRect(movedLine, { x: 280, y: -5, width: 50, height: 10 })).toBe(true);
        expect(SelectionUtils.getObjectsInRect({ x: 190, y: -10, width: 120, height: 20 }, [movedLine, text])).toEqual([movedLine]);
    });

    it('intersects circles exactly rather than by their box', () => {
        const circle: DrawingObject = { type: 'circle', x: 0, y: 0, radius: 10 };
        // The rect touches the circle's bounding-box corner but not the circle itself.
        expect(isObjectIntersectingRect(circle, { x: 8, y: 8, width: 5, height: 5 })).toBe(false);
        expect(isObjectIntersectingRect(circle, { x: 5, y: -2, width: 10, height: 4 })).toBe(true);
    });
});
