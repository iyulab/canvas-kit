/**
 * @module @canvas-kit/core
 * @author Yeongbeom Ki <iam@yeongbeom.com>
 */

interface Shape {
  x: number;
  y: number;
  color?: string;
}

export interface Rect extends Shape {
  width: number;
  height: number;
}

export interface Circle extends Shape {
  radius: number;
}

/**
 * 캔버스에 드로잉을 관리하는 기본 클래스
 */
export class CanvasKitRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  /**
   * @param canvas 렌더링을 수행할 HTMLCanvasElement
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context");
    }
    this.ctx = ctx;
  }

  /**
   * 캔버스를 지웁니다.
   */
  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 사각형을 그립니다.
   * @param rect 그릴 사각형의 정보
   */
  public drawRect(rect: Rect) {
    this.ctx.fillStyle = rect.color || "black";
    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  /**
   * 원을 그립니다.
   * @param circle 그릴 원의 정보
   */
  public drawCircle(circle: Circle) {
    this.ctx.fillStyle = circle.color || "black";
    this.ctx.beginPath();
    this.ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }
}
