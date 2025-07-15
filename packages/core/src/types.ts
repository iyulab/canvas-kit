export interface Shape {
  id?: string;
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
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

export interface Text extends Shape {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  type: 'text';
}

export interface Path extends Shape {
  points: number[]; // [x1, y1, x2, y2, ...]
  tension?: number; // for curve smoothing
  closed?: boolean;
  type: 'path';
}

export interface Line extends Shape {
  points: number[]; // [x1, y1, x2, y2, ...]
  type: 'line';
}

// 확장성을 고려한 객체 타입
export type DrawingObject =
  | Rect
  | Circle
  | Text
  | Path
  | Line
  // | Image
  ;