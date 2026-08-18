import type { Scene } from './scene';
import type { Rect, Circle, Text, Path, Line, Image as ImageShape, DrawingObject, Transform } from './types';
import { IDENTITY_TRANSFORM } from './types';
import type { ImageLoader } from './image-loader';
import { defaultImageLoader } from './image-loader';

export interface CanvasKitRendererOptions {
    /** Image loads are async; called once an image referenced by a rendered scene finishes
     * loading, so the consumer knows to re-render (the frame that requested it may have skipped
     * drawing it). */
    onImageLoad?: () => void;
    /** Defaults to a shared module-level cache so repeated renders (and multiple renderers)
     * don't re-fetch the same image. Override mainly for testing. */
    imageLoader?: ImageLoader;
}

export class CanvasKitRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private onImageLoad?: () => void;
    private imageLoader: ImageLoader;

    constructor(canvas: HTMLCanvasElement, options: CanvasKitRendererOptions = {}) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }

        this.canvas = canvas;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context. Canvas 2D is not supported.');
        }
        this.ctx = ctx;
        this.onImageLoad = options.onImageLoad;
        this.imageLoader = options.imageLoader ?? defaultImageLoader;
    }

    public clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public render(scene: Scene, transform: Transform = IDENTITY_TRANSFORM) {
        if (!scene) {
            console.warn('Scene is required for rendering');
            return;
        }

        // clear는 뷰 transform과 무관하게 캔버스 전체(raw pixel 영역)를 대상으로 해야 하므로
        // transform을 적용하기 전에 실행한다.
        this.clear();
        const objects = scene.getObjects();

        this.ctx.save();
        this.ctx.translate(transform.x, transform.y);
        this.ctx.scale(transform.scale, transform.scale);

        for (const obj of objects) {
            try {
                this.renderObject(obj);
            } catch (error) {
                console.warn(`Failed to render object of type "${obj.type}":`, error);
            }
        }

        this.ctx.restore();
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
            case 'image':
                this.drawImage(obj as ImageShape);
                break;
            default:
                break;
        }
    }

    private drawRect(rect: Rect) {
        if (rect.fill) {
            this.ctx.fillStyle = rect.fill;
            this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }

        if (rect.stroke && rect.strokeWidth) {
            this.ctx.strokeStyle = rect.stroke;
            this.ctx.lineWidth = rect.strokeWidth;
            this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
    }

    private drawCircle(circle: Circle) {
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);

        if (circle.fill) {
            this.ctx.fillStyle = circle.fill;
            this.ctx.fill();
        }

        if (circle.stroke && circle.strokeWidth) {
            this.ctx.strokeStyle = circle.stroke;
            this.ctx.lineWidth = circle.strokeWidth;
            this.ctx.stroke();
        }
    }

    private drawText(text: Text) {
        const fontSize = text.fontSize || 16;
        const fontFamily = text.fontFamily || 'Arial';
        const align = text.align || 'left';

        this.ctx.font = `${fontSize}px ${fontFamily}`;
        this.ctx.textAlign = align;

        if (text.fill) {
            this.ctx.fillStyle = text.fill;
            this.ctx.fillText(text.text, text.x, text.y);
        }

        if (text.stroke && text.strokeWidth) {
            this.ctx.strokeStyle = text.stroke;
            this.ctx.lineWidth = text.strokeWidth;
            this.ctx.strokeText(text.text, text.x, text.y);
        }

        this.ctx.textAlign = 'left';
    }

    private drawPath(path: Path) {
        if (path.points.length < 4) return;

        this.ctx.beginPath();
        this.ctx.moveTo(path.points[0], path.points[1]);

        if (path.tension && path.tension > 0) {
            for (let i = 2; i < path.points.length - 2; i += 2) {
                const xc = (path.points[i] + path.points[i + 2]) / 2;
                const yc = (path.points[i + 1] + path.points[i + 3]) / 2;
                this.ctx.quadraticCurveTo(path.points[i], path.points[i + 1], xc, yc);
            }
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
        }
    }

    private drawLine(line: Line) {
        if (line.points.length < 4) return;

        this.ctx.beginPath();
        this.ctx.moveTo(line.points[0], line.points[1]);

        for (let i = 2; i < line.points.length; i += 2) {
            this.ctx.lineTo(line.points[i], line.points[i + 1]);
        }

        if (line.stroke && line.strokeWidth) {
            this.ctx.strokeStyle = line.stroke;
            this.ctx.lineWidth = line.strokeWidth;
            this.ctx.stroke();
        }
    }

    private drawImage(image: ImageShape) {
        const htmlImage = this.imageLoader.getOrLoadImage(image.src, () => this.onImageLoad?.());
        if (!htmlImage) {
            // Not loaded yet (or failed) — nothing to draw this frame. onImageLoad (if given)
            // will fire once it resolves so the consumer can trigger another render.
            return;
        }
        this.ctx.drawImage(htmlImage, image.x, image.y, image.width, image.height);
    }
}
