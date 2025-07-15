export interface Shape {
  x: number;
  y: number;
  color?: string;
  type: string;
}

export interface Rect extends Shape {
  width: number;
  height: number;
  type: 'rect';
}

export interface Circle extends Shape {
  radius: number;
  type: 'circle';
}

// 확장성을 고려한 객체 타입
export type DrawingObject =
  | Rect
  | Circle
  // | Text
  // | Image
  // | Path
  ;