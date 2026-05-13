import type { DrawingObject } from './types';
import { Scene } from './scene';

export interface ICommand {
    execute(): void;
    undo(): void;
    getDescription(): string;
}

export interface CommandHistoryEvent {
    type: 'execute' | 'undo' | 'redo' | 'clear';
    canUndo: boolean;
    canRedo: boolean;
}

export class MoveCommand implements ICommand {
    private objectId: string;
    private oldPosition: { x: number; y: number };
    private newPosition: { x: number; y: number };
    private scene: Scene;

    constructor(
        object: DrawingObject,
        oldPosition: { x: number; y: number },
        newPosition: { x: number; y: number },
        scene: Scene
    ) {
        this.objectId = object.id || `${object.type}-${Date.now()}`;
        this.oldPosition = { ...oldPosition };
        this.newPosition = { ...newPosition };
        this.scene = scene;
    }

    execute(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (obj) {
            obj.x = this.newPosition.x;
            obj.y = this.newPosition.y;
        }
    }

    undo(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (obj) {
            obj.x = this.oldPosition.x;
            obj.y = this.oldPosition.y;
        }
    }

    getDescription(): string {
        return `Move object`;
    }
}

export class ResizeCommand implements ICommand {
    private objectId: string;
    private oldSize: any;
    private newSize: any;
    private scene: Scene;

    constructor(object: DrawingObject, oldSize: any, newSize: any, scene: Scene) {
        this.objectId = object.id || `${object.type}-${Date.now()}`;
        this.oldSize = { ...oldSize };
        this.newSize = { ...newSize };
        this.scene = scene;
    }

    execute(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (!obj) return;

        if (obj.type === 'rect') {
            (obj as any).width = this.newSize.width;
            (obj as any).height = this.newSize.height;
        } else if (obj.type === 'circle') {
            (obj as any).radius = this.newSize.radius;
        }
        obj.x = this.newSize.x;
        obj.y = this.newSize.y;
    }

    undo(): void {
        const obj = this.scene.getObjects().find(o => o.id === this.objectId);
        if (!obj) return;

        if (obj.type === 'rect') {
            (obj as any).width = this.oldSize.width;
            (obj as any).height = this.oldSize.height;
        } else if (obj.type === 'circle') {
            (obj as any).radius = this.oldSize.radius;
        }
        obj.x = this.oldSize.x;
        obj.y = this.oldSize.y;
    }

    getDescription(): string {
        return `Resize object`;
    }
}

export class AddCommand implements ICommand {
    private object: DrawingObject;
    private scene: Scene;

    constructor(object: DrawingObject, scene: Scene) {
        this.object = object;
        this.scene = scene;
    }

    execute(): void {
        this.scene.add(this.object);
    }

    undo(): void {
        this.scene.remove(this.object);
    }

    getDescription(): string {
        return `Add ${this.object.type} object`;
    }
}

export class DeleteCommand implements ICommand {
    private object: DrawingObject;
    private scene: Scene;

    constructor(object: DrawingObject, scene: Scene) {
        this.object = object;
        this.scene = scene;
    }

    execute(): void {
        this.scene.remove(this.object);
    }

    undo(): void {
        this.scene.add(this.object);
    }

    getDescription(): string {
        return `Delete ${this.object.type} object`;
    }
}

export class CommandHistory {
    private undoStack: ICommand[] = [];
    private redoStack: ICommand[] = [];
    private maxHistorySize: number;
    private listeners: ((event: CommandHistoryEvent) => void)[] = [];

    constructor(maxHistorySize: number = 50) {
        this.maxHistorySize = maxHistorySize;
    }

    addEventListener(listener: (event: CommandHistoryEvent) => void): void {
        this.listeners.push(listener);
    }

    removeEventListener(listener: (event: CommandHistoryEvent) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notify(type: CommandHistoryEvent['type']): void {
        const event: CommandHistoryEvent = {
            type,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
        this.listeners.forEach(l => l(event));
    }

    execute(command: ICommand): void {
        command.execute();
        this.redoStack = [];
        this.undoStack.push(command);

        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        this.notify('execute');
    }

    undo(): boolean {
        if (this.undoStack.length === 0) {
            return false;
        }

        const command = this.undoStack.pop()!;
        command.undo();
        this.redoStack.push(command);
        this.notify('undo');
        return true;
    }

    redo(): boolean {
        if (this.redoStack.length === 0) {
            return false;
        }

        const command = this.redoStack.pop()!;
        command.execute();
        this.undoStack.push(command);
        this.notify('redo');
        return true;
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.notify('clear');
    }

    getStatus() {
        return {
            undoCount: this.undoStack.length,
            redoCount: this.redoStack.length,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            lastCommand: this.undoStack[this.undoStack.length - 1]?.getDescription()
        };
    }
}
