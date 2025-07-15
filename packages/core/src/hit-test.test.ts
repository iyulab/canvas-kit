import { HitTest } from './hit-test';
import { Scene } from './scene';
import { describe, it, expect, beforeEach } from 'vitest';

describe('HitTest', () => {
    describe('isPointInRect', () => {
        it('should return true when point is inside rectangle', () => {
            const rect = { type: 'rect' as const, x: 10, y: 10, width: 50, height: 30, color: 'red' };
            expect(HitTest.isPointInRect(20, 20, rect)).toBe(true);
            expect(HitTest.isPointInRect(10, 10, rect)).toBe(true); // corner
            expect(HitTest.isPointInRect(60, 40, rect)).toBe(true); // opposite corner
        });

        it('should return false when point is outside rectangle', () => {
            const rect = { type: 'rect' as const, x: 10, y: 10, width: 50, height: 30, color: 'red' };
            expect(HitTest.isPointInRect(5, 20, rect)).toBe(false); // left
            expect(HitTest.isPointInRect(65, 20, rect)).toBe(false); // right
            expect(HitTest.isPointInRect(20, 5, rect)).toBe(false); // above
            expect(HitTest.isPointInRect(20, 45, rect)).toBe(false); // below
        });
    });

    describe('isPointInCircle', () => {
        it('should return true when point is inside circle', () => {
            const circle = { type: 'circle' as const, x: 50, y: 50, radius: 25, color: 'blue' };
            expect(HitTest.isPointInCircle(50, 50, circle)).toBe(true); // center
            expect(HitTest.isPointInCircle(60, 50, circle)).toBe(true); // inside
            expect(HitTest.isPointInCircle(75, 50, circle)).toBe(true); // edge
        });

        it('should return false when point is outside circle', () => {
            const circle = { type: 'circle' as const, x: 50, y: 50, radius: 25, color: 'blue' };
            expect(HitTest.isPointInCircle(80, 50, circle)).toBe(false);
            expect(HitTest.isPointInCircle(50, 80, circle)).toBe(false);
        });
    });

    describe('Scene hit testing', () => {
        let scene: Scene;

        beforeEach(() => {
            scene = new Scene();
            scene.add({ type: 'rect', x: 10, y: 10, width: 50, height: 30, color: 'red' });
            scene.add({ type: 'circle', x: 100, y: 50, radius: 20, color: 'blue' });
            scene.add({ type: 'rect', x: 15, y: 15, width: 30, height: 20, color: 'green' }); // overlapping
        });

        it('should find object at point', () => {
            const obj = scene.getObjectAtPoint(20, 20);
            expect(obj).not.toBeNull();
            expect(obj?.color).toBe('green'); // should return the top-most (last added)
        });

        it('should return null when no object at point', () => {
            const obj = scene.getObjectAtPoint(200, 200);
            expect(obj).toBeNull();
        });

        it('should find all objects at point', () => {
            const objects = scene.getObjectsAtPoint(20, 20);
            expect(objects).toHaveLength(2); // red rect and green rect overlap
            expect(objects[0].color).toBe('red');
            expect(objects[1].color).toBe('green');
        });

        it('should find circle at its center', () => {
            const obj = scene.getObjectAtPoint(100, 50);
            expect(obj?.type).toBe('circle');
            expect(obj?.color).toBe('blue');
        });
    });
});
