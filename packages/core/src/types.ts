export interface Shape {
  id?: string;
  x: number;
  y: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  type: string;
  /** Drawn, but not edited: a designer never selects, drags, transforms or steps to it — the picture
   * the editable shapes sit on (a floor plan, a map) or a mark derived from them. Viewers ignore it. */
  locked?: boolean;
  /** Selected, but never moved or reshaped: a mark whose place follows other shapes (a line joining two boxes, its
   * label). A designer selects it — a click, Tab, a marquee — so a host can edit what it stands for, and never drags,
   * nudges or transforms it. Viewers draw it as any other shape. */
  fixed?: boolean;
  /** Moved, but never resized or rotated: a mark that sets only where something goes (a stamp, an icon of a fixed size,
   * a box standing for a group of other shapes). A designer selects and drags it — and nudges it with the arrows — but
   * gives it no resize or rotate handles. Viewers draw it as any other shape. */
  fixedSize?: boolean;
  /** A dash pattern for the stroke — dash and gap lengths in scene units, as `setLineDash` takes them (`[6, 4]`).
   * Absent or empty: solid. */
  dash?: number[];
}

export interface Rect extends Shape {
  width: number;
  height: number;
  type: 'rect';
  /** Rounds the corners — the radius in scene units, at most half the shorter side. Absent or 0: square corners. */
  cornerRadius?: number;
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
  /** Which part of the text box `y` stands for: its top (the default), middle or bottom — as `align` does for `x`. */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Fills the text's box behind it — a label that reads over whatever lies under it. */
  background?: string;
  /** Space around the text inside its box, on every side, in scene units: the box — its background, its bounds,
   * where a press hits it — grows by it, while the text stays where `x`/`y` put it. Default 0. */
  padding?: number;
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

export interface Image extends Shape {
  src: string;
  width: number;
  height: number;
  type: 'image';
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
  | Image
  ;

// 선택 가능한 모든 요소 타입 (DrawingObject + Canvas)
export type SelectableElement = DrawingObject | CanvasSelection;