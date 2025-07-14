import { Scene } from './scene';
import type { Rect, Circle } from './types';

/**
 * @module @canvas-kit/core
 * @author Yeongbeom Ki <iam@yeongbeom.com>
 */

export * from './scene';
export * from './types';

/**
 * 캔버스에 드로잉을 관리하는 기본 클래스
 */
export class CanvasKitRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context');
    }
    this.ctx = ctx;
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public render(scene: Scene) {
    this.clear();
    for (const obj of scene.getObjects()) {
      if (obj.type === 'rect') {
        this.drawRect(obj as Rect);
      } else if (obj.type === 'circle') {
        this.drawCircle(obj as Circle);
      }
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
