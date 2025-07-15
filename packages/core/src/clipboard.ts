import type { DrawingObject } from './types';
import { Scene } from './scene';
import type { ICommand } from './commands';

/**
 * 클립보드 관리 클래스
 * 객체 복사/붙여넣기 기능을 제공
 */
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

    /**
     * 객체들을 클립보드에 복사
     */
    copy(objects: DrawingObject[]): void {
        this.clipboardData = objects.map(obj => ({ ...obj })); // 깊은 복사
    }

    /**
     * 클립보드의 객체들을 가져옴
     */
    paste(): DrawingObject[] {
        return this.clipboardData.map(obj => ({
            ...obj,
            id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 새 ID 생성
            x: obj.x + 20, // 약간 오프셋
            y: obj.y + 20
        }));
    }

    /**
     * 클립보드가 비어있는지 확인
     */
    isEmpty(): boolean {
        return this.clipboardData.length === 0;
    }

    /**
     * 클립보드 내용 개수
     */
    getCount(): number {
        return this.clipboardData.length;
    }

    /**
     * 클립보드 클리어
     */
    clear(): void {
        this.clipboardData = [];
    }
}

/**
 * 복사 명령
 */
export class CopyCommand implements ICommand {
    private objects: DrawingObject[];
    private clipboard: Clipboard;

    constructor(objects: DrawingObject[]) {
        this.objects = objects;
        this.clipboard = Clipboard.getInstance();
    }

    execute(): void {
        this.clipboard.copy(this.objects);
    }

    undo(): void {
        // 복사는 되돌릴 수 없음 (실제로는 이전 클립보드 상태를 저장할 수 있음)
    }

    getDescription(): string {
        return `Copy ${this.objects.length} object(s)`;
    }
}

/**
 * 잘라내기 명령
 */
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
        // 클립보드에 복사 후 Scene에서 제거
        this.clipboard.copy(this.objects);
        this.objects.forEach(obj => this.scene.remove(obj));
    }

    undo(): void {
        // 잘라낸 객체들을 다시 Scene에 추가
        this.objects.forEach(obj => this.scene.add(obj));
    }

    getDescription(): string {
        return `Cut ${this.objects.length} object(s)`;
    }
}

/**
 * 붙여넣기 명령
 */
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

        // 클립보드에서 객체들을 가져와서 Scene에 추가
        this.pastedObjects = this.clipboard.paste();
        this.pastedObjects.forEach(obj => this.scene.add(obj));
    }

    undo(): void {
        // 붙여넣은 객체들을 Scene에서 제거
        this.pastedObjects.forEach(obj => this.scene.remove(obj));
        this.pastedObjects = [];
    }

    getDescription(): string {
        return `Paste ${this.pastedObjects.length} object(s)`;
    }
}

/**
 * 중복 생성 명령 (Duplicate)
 * 선택된 객체들을 복사하여 바로 붙여넣기
 */
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
            ...obj,
            id: `${obj.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
