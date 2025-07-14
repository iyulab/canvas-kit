export interface Shape {
  x: number;
  y: number;
  color?: string;
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

export type DrawingObject = Rect | Circle;