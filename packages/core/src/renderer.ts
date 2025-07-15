import type { Scene } from './scene';
import type { Rect, Circle, Text, Path, Line, DrawingObject } from './types';

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

        console.log('Renderer: Starting render');
        this.clear();
        const objects = scene.getObjects();
        console.log('Renderer: Objects to render:', objects.length, objects);

        for (const obj of objects) {
            try {
                console.log('Renderer: Rendering object:', obj);
                this.renderObject(obj);
                console.log('Renderer: Successfully rendered:', obj.type);
            } catch (error) {
                console.warn(`Failed to render object of type "${obj.type}":`, error);
            }
        }

        console.log('Renderer: Render complete');
    }

    private renderObject(obj: DrawingObject) {
        switch (obj.type) {
            case 'rect':
                this.drawRect(obj as Rect);
                break;
            case 'circle':
                this.drawCircle(obj as Circle);
                break;
            case 'text':
                this.drawText(obj as Text);
                break;
            case 'path':
                this.drawPath(obj as Path);
                break;
            case 'line':
                this.drawLine(obj as Line);
                break;
            default:
                // 확장성을 위해 기본 처리
                break;
        }
    }

    private drawRect(rect: Rect) {
        console.log('Drawing rect:', rect);
        if (rect.fill) {
            this.ctx.fillStyle = rect.fill;
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            console.log('Filled rect with color:', rect.fill);
        }

        if (rect.stroke && rect.strokeWidth) {
            this.ctx.strokeStyle = rect.stroke;
            this.ctx.lineWidth = rect.strokeWidth;
            this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            console.log('Stroked rect with color:', rect.stroke);
        }
    }

    private drawCircle(circle: Circle) {
        console.log('Drawing circle:', circle);
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);

        if (circle.fill) {
            this.ctx.fillStyle = circle.fill;
            this.ctx.fill();
            console.log('Filled circle with color:', circle.fill);
        }

        if (circle.stroke && circle.strokeWidth) {
            this.ctx.strokeStyle = circle.stroke;
            this.ctx.lineWidth = circle.strokeWidth;
            this.ctx.stroke();
            console.log('Stroked circle with color:', circle.stroke);
        }
    }

    private drawText(text: Text) {
        const fontSize = text.fontSize || 16;
        const fontFamily = text.fontFamily || 'Arial';

        this.ctx.font = `${fontSize}px ${fontFamily}`;

        if (text.fill) {
            this.ctx.fillStyle = text.fill;
            this.ctx.fillText(text.text, text.x, text.y);
        }

        if (text.stroke && text.strokeWidth) {
            this.ctx.strokeStyle = text.stroke;
            this.ctx.lineWidth = text.strokeWidth;
            this.ctx.strokeText(text.text, text.x, text.y);
        }
    }

    private drawPath(path: Path) {
        console.log('Drawing path:', path);
        if (path.points.length < 4) return; // Need at least 2 points

        this.ctx.beginPath();

        // Move to first point
        this.ctx.moveTo(path.points[0], path.points[1]);

        if (path.tension && path.tension > 0) {
            // Draw smooth curve using quadratic curves
            for (let i = 2; i < path.points.length - 2; i += 2) {
                const xc = (path.points[i] + path.points[i + 2]) / 2;
                const yc = (path.points[i + 1] + path.points[i + 3]) / 2;
                this.ctx.quadraticCurveTo(path.points[i], path.points[i + 1], xc, yc);
            }
            // Draw last segment
            if (path.points.length >= 4) {
                const lastIndex = path.points.length - 2;
                this.ctx.quadraticCurveTo(
                    path.points[lastIndex - 2],
                    path.points[lastIndex - 1],
                    path.points[lastIndex],
                    path.points[lastIndex + 1]
                );
            }
        } else {
            // Draw straight lines
            for (let i = 2; i < path.points.length; i += 2) {
                this.ctx.lineTo(path.points[i], path.points[i + 1]);
            }
        }

        if (path.closed) {
            this.ctx.closePath();
        }

        if (path.fill && path.closed) {
            this.ctx.fillStyle = path.fill;
            this.ctx.fill();
        }

        if (path.stroke && path.strokeWidth) {
            this.ctx.strokeStyle = path.stroke;
            this.ctx.lineWidth = path.strokeWidth;
            this.ctx.stroke();
            console.log('Stroked path with color:', path.stroke);
        }
    }

    private drawLine(line: Line) {
        console.log('Drawing line:', line);
        if (line.points.length < 4) return; // Need at least 2 points

        this.ctx.beginPath();
        this.ctx.moveTo(line.points[0], line.points[1]);

        for (let i = 2; i < line.points.length; i += 2) {
            this.ctx.lineTo(line.points[i], line.points[i + 1]);
        }

        if (line.stroke && line.strokeWidth) {
            this.ctx.strokeStyle = line.stroke;
            this.ctx.lineWidth = line.strokeWidth;
            this.ctx.stroke();
            console.log('Stroked line with color:', line.stroke);
        }
    }
}
