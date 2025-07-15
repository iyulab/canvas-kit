import { SelectionManager } from './selection';
import { Scene } from './scene';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SelectionManager', () => {
    let selectionManager: SelectionManager;
    let scene: Scene;
    let rect1: any, rect2: any, circle1: any;

    beforeEach(() => {
        selectionManager = new SelectionManager();
        scene = new Scene();

        rect1 = { type: 'rect', x: 10, y: 10, width: 50, height: 30, fill: 'red' };
        rect2 = { type: 'rect', x: 100, y: 50, width: 40, height: 60, fill: 'blue' };
        circle1 = { type: 'circle', x: 200, y: 100, radius: 25, fill: 'green' };

        scene.add(rect1);
        scene.add(rect2);
        scene.add(circle1);
    });

    describe('basic selection operations', () => {
        it('should start with empty selection', () => {
            expect(selectionManager.getSelectionCount()).toBe(0);
            expect(selectionManager.getSelectedObjects()).toEqual([]);
        });

        it('should select single object', () => {
            selectionManager.selectSingle(rect1);

            expect(selectionManager.getSelectionCount()).toBe(1);
            expect(selectionManager.isSelected(rect1)).toBe(true);
            expect(selectionManager.getSelectedObjects()).toEqual([rect1]);
        });

        it('should replace selection with selectSingle', () => {
            selectionManager.addToSelection(rect1);
            selectionManager.selectSingle(rect2);

            expect(selectionManager.getSelectionCount()).toBe(1);
            expect(selectionManager.isSelected(rect1)).toBe(false);
            expect(selectionManager.isSelected(rect2)).toBe(true);
        });

        it('should add multiple objects to selection', () => {
            selectionManager.addToSelection(rect1);
            selectionManager.addToSelection(circle1);

            expect(selectionManager.getSelectionCount()).toBe(2);
            expect(selectionManager.isSelected(rect1)).toBe(true);
            expect(selectionManager.isSelected(circle1)).toBe(true);
        });

        it('should not add same object twice', () => {
            selectionManager.addToSelection(rect1);
            selectionManager.addToSelection(rect1);

            expect(selectionManager.getSelectionCount()).toBe(1);
        });

        it('should remove object from selection', () => {
            selectionManager.addToSelection(rect1);
            selectionManager.addToSelection(rect2);
            selectionManager.removeFromSelection(rect1);

            expect(selectionManager.getSelectionCount()).toBe(1);
            expect(selectionManager.isSelected(rect1)).toBe(false);
            expect(selectionManager.isSelected(rect2)).toBe(true);
        });

        it('should toggle selection', () => {
            selectionManager.toggleSelection(rect1);
            expect(selectionManager.isSelected(rect1)).toBe(true);

            selectionManager.toggleSelection(rect1);
            expect(selectionManager.isSelected(rect1)).toBe(false);
        });

        it('should clear all selection', () => {
            selectionManager.addToSelection(rect1);
            selectionManager.addToSelection(rect2);
            selectionManager.clearSelection();

            expect(selectionManager.getSelectionCount()).toBe(0);
            expect(selectionManager.getSelectedObjects()).toEqual([]);
        });
    });

    describe('bounding box calculations', () => {
        it('should calculate rect bounding box', () => {
            const bounds = selectionManager.getObjectBounds(rect1);
            expect(bounds).toEqual({
                x: 10,
                y: 10,
                width: 50,
                height: 30
            });
        });

        it('should calculate circle bounding box', () => {
            const bounds = selectionManager.getObjectBounds(circle1);
            expect(bounds).toEqual({
                x: 175, // 200 - 25
                y: 75,  // 100 - 25
                width: 50,  // 25 * 2
                height: 50  // 25 * 2
            });
        });

        it('should return null for empty selection bounds', () => {
            const bounds = selectionManager.getSelectionBounds();
            expect(bounds).toBeNull();
        });

        it('should calculate single object selection bounds', () => {
            selectionManager.selectSingle(rect1);
            const bounds = selectionManager.getSelectionBounds();

            expect(bounds).toEqual({
                x: 10,
                y: 10,
                width: 50,
                height: 30
            });
        });

        it('should calculate multiple objects selection bounds', () => {
            selectionManager.addToSelection(rect1); // x:10-60, y:10-40
            selectionManager.addToSelection(circle1); // x:175-225, y:75-125

            const bounds = selectionManager.getSelectionBounds();
            expect(bounds).toEqual({
                x: 10,      // min x
                y: 10,      // min y
                width: 215, // 225 - 10
                height: 115 // 125 - 10
            });
        });
    });

    describe('event handling', () => {
        it('should notify listeners on selection change', () => {
            const listener = vi.fn();
            selectionManager.addEventListener(listener);

            selectionManager.selectSingle(rect1);

            expect(listener).toHaveBeenCalledWith({
                selected: [rect1],
                added: [rect1],
                removed: []
            });
        });

        it('should notify on selection removal', () => {
            const listener = vi.fn();
            selectionManager.addToSelection(rect1);
            selectionManager.addEventListener(listener);

            selectionManager.removeFromSelection(rect1);

            expect(listener).toHaveBeenCalledWith({
                selected: [],
                added: [],
                removed: [rect1]
            });
        });

        it('should notify on selection replacement', () => {
            const listener = vi.fn();
            selectionManager.addToSelection(rect1);
            selectionManager.addEventListener(listener);

            selectionManager.selectSingle(rect2);

            expect(listener).toHaveBeenCalledWith({
                selected: [rect2],
                added: [rect2],
                removed: [rect1]
            });
        });

        it('should remove event listeners', () => {
            const listener = vi.fn();
            selectionManager.addEventListener(listener);
            selectionManager.removeEventListener(listener);

            selectionManager.selectSingle(rect1);

            expect(listener).not.toHaveBeenCalled();
        });

        it('should handle listener errors gracefully', () => {
            const errorListener = vi.fn(() => { throw new Error('Test error'); });
            const goodListener = vi.fn();

            selectionManager.addEventListener(errorListener);
            selectionManager.addEventListener(goodListener);

            selectionManager.selectSingle(rect1);

            expect(goodListener).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle null/undefined objects gracefully', () => {
            expect(() => {
                selectionManager.addToSelection(null as any);
                selectionManager.removeFromSelection(undefined as any);
                selectionManager.toggleSelection(null as any);
            }).not.toThrow();

            expect(selectionManager.getSelectionCount()).toBe(0);
        });

        it('should dispose resources properly', () => {
            selectionManager.addToSelection(rect1);
            const listener = vi.fn();
            selectionManager.addEventListener(listener);

            selectionManager.dispose();

            expect(selectionManager.getSelectionCount()).toBe(0);
            selectionManager.selectSingle(rect2);
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
