import type { DrawingObject } from './types';
import { Scene } from './scene';
import type { ICommand } from './commands';

export class Clipboard {
    private static instance: Clipboard;
    private clipboardData: DrawingObject[] = [];

    private constructor() { }

    static getInstance(): Clipboard {
        if (!Clipboard.instance) {
            Clipboard.instance = new Clipboard();
        }
        return Clipboard.instance;
    }

    copy(objects: DrawingObject[]): void {
        this.clipboardData = objects.map(obj => structuredClone(obj));
    }

    paste(): DrawingObject[] {
        return this.clipboardData.map(obj => ({
            ...structuredClone(obj),
            id: `${obj.type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            x: obj.x + 20,
            y: obj.y + 20
        }));
    }

    getClipboardData(): DrawingObject[] {
        return this.clipboardData.map(obj => structuredClone(obj));
    }

    isEmpty(): boolean {
        return this.clipboardData.length === 0;
    }

    getCount(): number {
        return this.clipboardData.length;
    }

    clear(): void {
        this.clipboardData = [];
    }
}

export class CopyCommand implements ICommand {
    private objects: DrawingObject[];
    private clipboard: Clipboard;
    private previousClipboardData: DrawingObject[] = [];

    constructor(objects: DrawingObject[]) {
        this.objects = objects;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        this.previousClipboardData = this.clipboard.getClipboardData();
        this.clipboard.copy(this.objects);
    }

    undo(): void {
        this.clipboard.copy(this.previousClipboardData);
    }

    getDescription(): string {
        return `Copy ${this.objects.length} object(s)`;
    }
}

export class CutCommand implements ICommand {
    private objects: DrawingObject[];
    private scene: Scene;
    private clipboard: Clipboard;

    constructor(objects: DrawingObject[], scene: Scene) {
        this.objects = objects;
        this.scene = scene;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        this.clipboard.copy(this.objects);
        this.objects.forEach(obj => this.scene.remove(obj));
    }

    undo(): void {
        this.objects.forEach(obj => this.scene.add(obj));
    }

    getDescription(): string {
        return `Cut ${this.objects.length} object(s)`;
    }
}

export class PasteCommand implements ICommand {
    private pastedObjects: DrawingObject[] = [];
    private scene: Scene;
    private clipboard: Clipboard;

    constructor(scene: Scene) {
        this.scene = scene;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        if (this.clipboard.isEmpty()) {
            return;
        }

        this.pastedObjects = this.clipboard.paste();
        this.pastedObjects.forEach(obj => this.scene.add(obj));
    }

    undo(): void {
        this.pastedObjects.forEach(obj => this.scene.remove(obj));
        this.pastedObjects = [];
    }

    getDescription(): string {
        return `Paste ${this.pastedObjects.length} object(s)`;
    }
}

export class DuplicateCommand implements ICommand {
    private originalObjects: DrawingObject[];
    private duplicatedObjects: DrawingObject[] = [];
    private scene: Scene;

    constructor(objects: DrawingObject[], scene: Scene) {
        this.originalObjects = objects;
        this.scene = scene;
    }

    execute(): void {
        this.duplicatedObjects = this.originalObjects.map(obj => ({
            ...structuredClone(obj),
            id: `${obj.type}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            x: obj.x + 20,
            y: obj.y + 20
        }));

        this.duplicatedObjects.forEach(obj => this.scene.add(obj));
    }

    undo(): void {
        this.duplicatedObjects.forEach(obj => this.scene.remove(obj));
        this.duplicatedObjects = [];
    }

    getDescription(): string {
        return `Duplicate ${this.originalObjects.length} object(s)`;
    }
}
