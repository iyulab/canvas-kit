import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    MoveCommand,
    ResizeCommand,
    AddCommand,
    DeleteCommand,
    CommandHistory
} from './commands';
import { Scene } from './scene';

describe('MoveCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: moves object to new position', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 100, y: 200 }, scene);
        cmd.execute();
        expect(obj.x).toBe(100);
        expect(obj.y).toBe(200);
    });

    it('undo: restores original position', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 10, y: 20, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 10, y: 20 }, { x: 100, y: 200 }, scene);
        cmd.execute();
        cmd.undo();
        expect(obj.x).toBe(10);
        expect(obj.y).toBe(20);
    });

    it('getDescription: returns descriptive string', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        expect(cmd.getDescription()).toBe('Move object');
    });

    it('execute: does nothing if object not found in scene', () => {
        const obj = { id: 'missing', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        expect(() => cmd.execute()).not.toThrow();
    });
});

describe('ResizeCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: resizes rect to new dimensions', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 0, y: 0, width: 50, height: 50 },
            { x: 10, y: 10, width: 100, height: 200 },
            scene
        );
        cmd.execute();
        expect(obj.width).toBe(100);
        expect(obj.height).toBe(200);
        expect(obj.x).toBe(10);
        expect(obj.y).toBe(10);
    });

    it('undo: restores original rect dimensions', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 0, y: 0, width: 50, height: 50 },
            { x: 10, y: 10, width: 100, height: 200 },
            scene
        );
        cmd.execute();
        cmd.undo();
        expect(obj.width).toBe(50);
        expect(obj.height).toBe(50);
        expect(obj.x).toBe(0);
        expect(obj.y).toBe(0);
    });

    it('execute: resizes circle radius', () => {
        const obj = { id: 'c1', type: 'circle' as const, x: 50, y: 50, radius: 25 };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 50, y: 50, radius: 25 },
            { x: 60, y: 60, radius: 50 },
            scene
        );
        cmd.execute();
        expect(obj.radius).toBe(50);
    });

    it('execute: resizes image to new dimensions, same as rect', () => {
        const obj = { id: 'i1', type: 'image' as const, x: 0, y: 0, width: 50, height: 50, src: 'a.png' };
        scene.add(obj);
        const cmd = new ResizeCommand(
            obj,
            { x: 0, y: 0, width: 50, height: 50 },
            { x: 10, y: 10, width: 100, height: 200 },
            scene
        );
        cmd.execute();
        expect(obj.width).toBe(100);
        expect(obj.height).toBe(200);
        expect(obj.x).toBe(10);
        expect(obj.y).toBe(10);
    });
});

describe('AddCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: adds object to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new AddCommand(obj, scene);
        cmd.execute();
        expect(scene.getObjects()).toContain(obj);
    });

    it('undo: removes object from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new AddCommand(obj, scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects()).not.toContain(obj);
    });

    it('getDescription: includes object type', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        const cmd = new AddCommand(obj, scene);
        expect(cmd.getDescription()).toBe('Add rect object');
    });
});

describe('DeleteCommand', () => {
    let scene: Scene;

    beforeEach(() => {
        scene = new Scene();
    });

    it('execute: removes object from scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DeleteCommand(obj, scene);
        cmd.execute();
        expect(scene.getObjects()).not.toContain(obj);
    });

    it('undo: re-adds object to scene', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new DeleteCommand(obj, scene);
        cmd.execute();
        cmd.undo();
        expect(scene.getObjects()).toContain(obj);
    });
});

describe('CommandHistory', () => {
    let scene: Scene;
    let history: CommandHistory;

    beforeEach(() => {
        scene = new Scene();
        history = new CommandHistory();
    });

    it('execute: runs command and adds to undo stack', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        history.execute(cmd);
        expect(obj.x).toBe(10);
        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
    });

    it('undo: undoes last command and moves to redo stack', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        const result = history.undo();
        expect(result).toBe(true);
        expect(obj.x).toBe(0);
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(true);
    });

    it('redo: re-executes undone command', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        history.undo();
        const result = history.redo();
        expect(result).toBe(true);
        expect(obj.x).toBe(10);
        expect(history.canRedo()).toBe(false);
    });

    it('execute: clears redo stack on new command', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        history.undo();
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 20, y: 20 }, scene));
        expect(history.canRedo()).toBe(false);
    });

    it('undo: returns false when stack is empty', () => {
        expect(history.undo()).toBe(false);
    });

    it('redo: returns false when stack is empty', () => {
        expect(history.redo()).toBe(false);
    });

    it('clear: empties both stacks', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
        history.clear();
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(false);
    });

    it('maxHistorySize: removes oldest command when exceeded', () => {
        const smallHistory = new CommandHistory(2);
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        smallHistory.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 1, y: 0 }, scene));
        smallHistory.execute(new MoveCommand(obj, { x: 1, y: 0 }, { x: 2, y: 0 }, scene));
        smallHistory.execute(new MoveCommand(obj, { x: 2, y: 0 }, { x: 3, y: 0 }, scene));
        expect(smallHistory.getStatus().undoCount).toBe(2);
    });

    it('getStatus: returns correct status object', () => {
        const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
        scene.add(obj);
        const cmd = new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene);
        history.execute(cmd);
        const status = history.getStatus();
        expect(status.undoCount).toBe(1);
        expect(status.redoCount).toBe(0);
        expect(status.canUndo).toBe(true);
        expect(status.canRedo).toBe(false);
        expect(status.lastCommand).toBe('Move object');
    });

    describe('EventEmitter', () => {
        it('addEventListener: fires on execute with correct event', () => {
            const listener = vi.fn();
            history.addEventListener(listener);
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith({
                type: 'execute',
                canUndo: true,
                canRedo: false
            });
        });

        it('addEventListener: fires on undo', () => {
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            const listener = vi.fn();
            history.addEventListener(listener);
            history.undo();
            expect(listener).toHaveBeenCalledWith({
                type: 'undo',
                canUndo: false,
                canRedo: true
            });
        });

        it('addEventListener: fires on redo', () => {
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            history.undo();
            const listener = vi.fn();
            history.addEventListener(listener);
            history.redo();
            expect(listener).toHaveBeenCalledWith({
                type: 'redo',
                canUndo: true,
                canRedo: false
            });
        });

        it('addEventListener: fires on clear', () => {
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            const listener = vi.fn();
            history.addEventListener(listener);
            history.clear();
            expect(listener).toHaveBeenCalledWith({
                type: 'clear',
                canUndo: false,
                canRedo: false
            });
        });

        it('removeEventListener: stops firing after removal', () => {
            const listener = vi.fn();
            history.addEventListener(listener);
            history.removeEventListener(listener);
            const obj = { id: 'r1', type: 'rect' as const, x: 0, y: 0, width: 50, height: 50 };
            scene.add(obj);
            history.execute(new MoveCommand(obj, { x: 0, y: 0 }, { x: 10, y: 10 }, scene));
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
