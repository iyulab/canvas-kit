import { HitTest } from './hit-test';
import { Scene } from './scene';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

describe('HitTest', () => {
    describe('isPointInRect', () => {
        it('should return true when point is inside rectangle', () => {
            const rect = { type: 'rect' as const, x: 10, y: 10, width: 50, height: 30, fill: 'red' };
            expect(HitTest.isPointInRect(20, 20, rect)).toBe(true);
            expect(HitTest.isPointInRect(10, 10, rect)).toBe(true); // corner
            expect(HitTest.isPointInRect(60, 40, rect)).toBe(true); // opposite corner
        });

        it('should return false when point is outside rectangle', () => {
            const rect = { type: 'rect' as const, x: 10, y: 10, width: 50, height: 30, fill: 'red' };
            expect(HitTest.isPointInRect(5, 20, rect)).toBe(false); // left
            expect(HitTest.isPointInRect(65, 20, rect)).toBe(false); // right
            expect(HitTest.isPointInRect(20, 5, rect)).toBe(false); // above
            expect(HitTest.isPointInRect(20, 45, rect)).toBe(false); // below
        });
    });

    describe('isPointInCircle', () => {
        it('should return true when point is inside circle', () => {
            const circle = { type: 'circle' as const, x: 50, y: 50, radius: 25, fill: 'blue' };
            expect(HitTest.isPointInCircle(50, 50, circle)).toBe(true); // center
            expect(HitTest.isPointInCircle(60, 50, circle)).toBe(true); // inside
            expect(HitTest.isPointInCircle(75, 50, circle)).toBe(true); // edge
        });

        it('should return false when point is outside circle', () => {
            const circle = { type: 'circle' as const, x: 50, y: 50, radius: 25, fill: 'blue' };
            expect(HitTest.isPointInCircle(80, 50, circle)).toBe(false);
            expect(HitTest.isPointInCircle(50, 80, circle)).toBe(false);
        });
    });

    describe('Scene hit testing', () => {
        let scene: Scene;

        beforeEach(() => {
            scene = new Scene();
            scene.add({ type: 'rect', x: 10, y: 10, width: 50, height: 30, fill: 'red' });
            scene.add({ type: 'circle', x: 100, y: 50, radius: 20, fill: 'blue' });
            scene.add({ type: 'rect', x: 15, y: 15, width: 30, height: 20, fill: 'green' }); // overlapping
        });

        it('should find object at point', () => {
            const obj = scene.getObjectAtPoint(20, 20);
            expect(obj).not.toBeNull();
            expect(obj?.fill).toBe('green'); // should return the top-most (last added)
        });

        it('should return null when no object at point', () => {
            const obj = scene.getObjectAtPoint(200, 200);
            expect(obj).toBeNull();
        });

        it('should find all objects at point', () => {
            const objects = scene.getObjectsAtPoint(20, 20);
            expect(objects).toHaveLength(2); // red rect and green rect overlap
            expect(objects[0].fill).toBe('red');
            expect(objects[1].fill).toBe('green');
        });

        it('should find circle at its center', () => {
            const obj = scene.getObjectAtPoint(100, 50);
            expect(obj?.type).toBe('circle');
            expect(obj?.fill).toBe('blue');
        });
    });

    describe('isPointInPolyline', () => {
        it('rejects a point inside the bounding box but far from a diagonal two-point line', () => {
            // (0,0) -> (100,100): bounding box is the full 100x100 square, but (90, 10) is far
            // from the actual diagonal — a bbox-only check would wrongly report a hit here.
            expect(HitTest.isPointInPolyline(90, 10, [0, 0, 100, 100])).toBe(false);
        });

        it('accepts a point close to the diagonal line itself', () => {
            expect(HitTest.isPointInPolyline(50, 51, [0, 0, 100, 100])).toBe(true);
        });

        it('rejects a point in the empty corner of an L-shaped path', () => {
            // (0,0) -> (100,0) -> (100,100): an L shape. (10, 90) sits in the bbox's empty
            // corner, nowhere near either segment.
            expect(HitTest.isPointInPolyline(10, 90, [0, 0, 100, 0, 100, 100])).toBe(false);
        });

        it('accepts a point near either segment of an L-shaped path', () => {
            expect(HitTest.isPointInPolyline(50, 1, [0, 0, 100, 0, 100, 100])).toBe(true); // near first segment
            expect(HitTest.isPointInPolyline(99, 50, [0, 0, 100, 0, 100, 100])).toBe(true); // near second segment
        });

        it('widens the hit threshold with a thicker strokeWidth', () => {
            expect(HitTest.isPointInPolyline(50, 10, [0, 0, 100, 0], 1)).toBe(false);
            expect(HitTest.isPointInPolyline(50, 10, [0, 0, 100, 0], 20)).toBe(true);
        });
    });

    describe('isPointInText', () => {
        let measureText: ReturnType<typeof vi.fn>;

        beforeAll(() => {
            // A stub width function deliberately different from the old length*fontSize*0.6
            // heuristic, so a test passing would prove isPointInText actually uses the context's
            // measureText() return value rather than still computing its own estimate.
            measureText = vi.fn((text: string) => ({ width: text.length * 3 }));
            vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
                measureText,
                set font(_value: string) {},
            } as unknown as CanvasRenderingContext2D);
        });

        it('uses the canvas context measureText width, not the old length*fontSize*0.6 estimate', () => {
            const text = { type: 'text' as const, x: 0, y: 20, text: 'Hello', fontSize: 16 };
            // Stub width: 5 chars * 3 = 15. Old heuristic would have been 5*16*0.6 = 48.
            expect(HitTest.isPointInText(14, 10, text)).toBe(true);
            expect(HitTest.isPointInText(16, 10, text)).toBe(false);
        });

        it('passes the text content to measureText', () => {
            const text = { type: 'text' as const, x: 0, y: 20, text: 'Hello', fontSize: 16 };
            HitTest.isPointInText(0, 10, text);
            expect(measureText).toHaveBeenCalledWith('Hello');
        });
    });

    describe('image hit testing', () => {
        it('treats an image as a rect-shaped bounding box', () => {
            const image = { type: 'image' as const, x: 200, y: 200, width: 40, height: 20, src: 'a.png' };
            expect(HitTest.isPointInObject(210, 210, image)).toBe(true); // inside
            expect(HitTest.isPointInObject(200, 200, image)).toBe(true); // corner
            expect(HitTest.isPointInObject(195, 210, image)).toBe(false); // left of it
            expect(HitTest.isPointInObject(210, 225, image)).toBe(false); // below it
        });

        it('finds an image object in a scene', () => {
            const scene = new Scene();
            scene.add({ type: 'image', x: 200, y: 200, width: 40, height: 20, src: 'a.png' });

            const obj = scene.getObjectAtPoint(210, 210);
            expect(obj?.type).toBe('image');
        });
    });
});
