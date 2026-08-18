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

// 뷰의 pan/zoom 상태 — 캔버스 렌더링과 DOM 오버레이가 동일한 값을 공유해 좌표계를 동기화한다
export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 };

// 씬 좌표계에 위치한 DOM 콘텐츠 하나의 배치 정보. 콘텐츠 자체(React 노드 등)는
// UI 프레임워크에 의존하므로 core가 아니라 각 렌더러 패키지(viewer/designer)가 정의한다.
export interface OverlayItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Canvas 선택을 위한 특별한 타입
export interface CanvasSelection {
  type: 'canvas';
  id: 'canvas';
  x: 0;
  y: 0;
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

// 선택 가능한 모든 요소 타입 (DrawingObject + Canvas)
export type SelectableElement = DrawingObject | CanvasSelection;