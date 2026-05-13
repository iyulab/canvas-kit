import { describe, it, expect, beforeEach } from 'vitest';
import { Clipboard, CopyCommand, CutCommand, PasteCommand, DuplicateCommand } from './clipboard';
import { Scene } from './scene';

beforeEach(() => {
    Clipboard.getInstance().clear();
});

describe('Clipboard', () => {
    it('copy: stores deep copies of objects', () => {
        const obj = { id: 'p1', type: 'path' as const, x: 0, y: 0, points: [0, 0, 10, 10] };
        const clipboard = Clipboard.getInstance();
        clipboard.copy([obj]);
        obj.points[0] = 999;
        const data = clipboard.getClipboardData();
        expect(data[0].points[0]).toBe(0);
    });

    it('paste: returns new objects with offset position and new id', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 20, width: 50, height: 50 };
        const clipboard = Clipboard.getInstance();
        clipboard.copy([obj]);
        const pasted = clipboard.paste();
        expect(pasted[0].id).not.toBe('r1');
        expect(pasted[0].x).toBe(30);
        expect(pasted[0].y).toBe(40);
    });

    it('paste: does not mutate clipboard data', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 20, width: 50, height: 50 };
        const clipboard = Clipboard.getInstance();
        clipboard.copy([obj]);
        clipboard.paste();
        clipboard.paste();
        expect(clipboard.getCount()).toBe(1);
    });

    it('isEmpty: returns true when empty', () => {
        expect(Clipboard.getInstance().isEmpty()).toBe(true);
    });

    it('isEmpty: returns false after copy', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        expect(Clipboard.getInstance().isEmpty()).toBe(false);
    });

    it('getCount: returns number of copied objects', () => {
        const objs = [
            { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 },
            { id: 'c1', type: 'circle' as const, x: 50, y: 50, radius: 25 }
        ];
        Clipboard.getInstance().copy(objs);
        expect(Clipboard.getInstance().getCount()).toBe(2);
    });

    it('clear: empties clipboard', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        Clipboard.getInstance().clear();
        expect(Clipboard.getInstance().isEmpty()).toBe(true);
    });

    it('getClipboardData: returns deep copies', () => {
        const obj = { id: 'p1', type: 'path' as const, x: 0, y: 0, points: [1, 2, 3, 4] };
        Clipboard.getInstance().copy([obj]);
        const data = Clipboard.getInstance().getClipboardData();
        data[0].points[0] = 999;
        const data2 = Clipboard.getInstance().getClipboardData();
        expect(data2[0].points[0]).toBe(1);
    });
});

describe('CopyCommand', () => {
    it('execute: copies objects to clipboard', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new CopyCommand([obj]);
        cmd.execute();
        expect(Clipboard.getInstance().isEmpty()).toBe(false);
    });

    it('undo: restores previous clipboard state', () => {
        const obj1 = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const obj2 = { id: 'c1', type: 'circle' as const, x: 50, y: 50, radius: 25 };
        new CopyCommand([obj1]).execute();
        const cmd2 = new CopyCommand([obj2]);
        cmd2.execute();
        expect(Clipboard.getInstance().getCount()).toBe(1);
        cmd2.undo();
        const data = Clipboard.getInstance().getClipboardData();
        expect(data[0].id).toBe('r1');
    });

    it('getDescription: includes count', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        expect(new CopyCommand([obj]).getDescription()).toBe('Copy 1 object(s)');
    });
});

describe('CutCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: removes objects from scene and copies to clipboard', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new CutCommand([obj], scene);
        cmd.execute();
        expect(scene.getObjects()).not.toContain(obj);
        expect(Clipboard.getInstance().isEmpty()).toBe(false);
    });

    it('undo: re-adds objects to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new CutCommand([obj], scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects()).toContain(obj);
    });
});

describe('PasteCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: adds pasted objects to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        const cmd = new PasteCommand(scene);
        cmd.execute();
        expect(scene.getObjects().length).toBe(1);
        expect(scene.getObjects()[0].id).not.toBe('r1');
    });

    it('execute: does nothing when clipboard is empty', () => {
        const cmd = new PasteCommand(scene);
        cmd.execute();
        expect(scene.getObjects().length).toBe(0);
    });

    it('undo: removes pasted objects from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        Clipboard.getInstance().copy([obj]);
        const cmd = new PasteCommand(scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects().length).toBe(0);
    });
});

describe('DuplicateCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: adds duplicated objects with offset to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 10, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DuplicateCommand([obj], scene);
        cmd.execute();
        expect(scene.getObjects().length).toBe(2);
        const dup = scene.getObjects()[1];
        expect(dup.x).toBe(30);
        expect(dup.y).toBe(30);
        expect(dup.id).not.toBe('r1');
    });

    it('execute: deep copies points array for path objects', () => {
        const obj = { id: 'p1', type: 'path' as const, x: 0, y: 0, points: [0, 0, 10, 10] };
        scene.add(obj);
        const cmd = new DuplicateCommand([obj], scene);
        cmd.execute();
        const dup = scene.getObjects()[1] as any;
        dup.points[0] = 999;
        expect(obj.points[0]).toBe(0);
    });

    it('undo: removes duplicated objects from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DuplicateCommand([obj], scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects().length).toBe(1);
        expect(scene.getObjects()[0]).toBe(obj);
    });
});
