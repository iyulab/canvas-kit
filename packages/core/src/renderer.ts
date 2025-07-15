import type { Scene } from './scene';
import type { Rect, Circle, DrawingObject } from './types';

/**
 * 캔버스에 드로잉을 관리하는 기본 클래스
 */
export class CanvasKitRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }

        this.canvas = canvas;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context. Canvas 2D is not supported.');
        }
        this.ctx = ctx;
    }

    public clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public render(scene: Scene) {
        if (!scene) {
            console.warn('Scene is required for rendering');
            return;
        }

        this.clear();
        const objects = scene.getObjects();

        for (const obj of objects) {
            try {
                this.renderObject(obj);
            } catch (error) {
                console.warn(`Failed to render object of type "${obj.type}":`, error);
            }
        }
    }

    private renderObject(obj: DrawingObject) {
        switch (obj.type) {
            case 'rect':
                this.drawRect(obj as Rect);
                break;
            case 'circle':
                this.drawCircle(obj as Circle);
                break;
            // case 'text':
            //   this.drawText(obj as Text);
            //   break;
            // case 'image':
            //   this.drawImage(obj as Image);
            //   break;
            default:
                // 확장성을 위해 기본 처리
                break;
        }
    }

    private drawRect(rect: Rect) {
        this.ctx.fillStyle = rect.color || 'black';
        this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    private drawCircle(circle: Circle) {
        this.ctx.fillStyle = circle.color || 'black';
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }
}
