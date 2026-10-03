import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { CanvasKitRenderer, Scene, IDENTITY_TRANSFORM, viewToScene, fitTransform } from '@canvas-kit/core';
import type { Transform, OverlayItem, Point, Rect } from '@canvas-kit/core';

const DEFAULT_MIN_SCALE = 0.1;
const DEFAULT_MAX_SCALE = 10;
// wheel deltaY -> zoom factor. Negative deltaY (scroll up) zooms in.
const ZOOM_SENSITIVITY = 0.001;
// 이 거리(CSS px) 안에서 눌렀다 떼면 탭, 넘으면 팬.
const DEFAULT_TAP_THRESHOLD = 4;
// 오버레이 아이템 DOM 표식 — 그 위에서 시작한 포인터는 탭으로 보고하지 않는다(아이템 몫).
const OVERLAY_ATTRIBUTE = 'data-ck-overlay';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// OverlayItem은 위치/크기만 core에서 정의한다 — 실제로 무엇을 그릴지(content)는
// UI 프레임워크에 의존하므로 여기(viewer)에서 React 노드로 확장한다.
export interface ViewerOverlayItem extends OverlayItem {
  content: React.ReactNode;
}

export type { Transform };

/** A press and release that stayed within `tapThreshold` — i.e. not a pan. */
export interface ViewerTapEvent {
  /** The tapped point in scene coordinates, under the transform at the time of the tap. */
  scene: Point;
  /** The tapped point in client (viewport) coordinates, as on the DOM event. */
  client: Point;
  button: number;
  pointerType: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface FitToRectOptions {
  /** Space (CSS px) kept clear on every side of the rect. Default 0. */
  padding?: number;
}

export interface ViewerHandle {
  /**
   * Fits a scene rect into the current viewport (centered, `minScale`/`maxScale` respected) and
   * reports the result through `onTransformChange` — in uncontrolled mode the viewer also adopts it.
   * Called while a container-sized viewer is still unmeasured, the fit is held and applied once the
   * viewport has a size.
   */
  fitToRect(rect: Rect, options?: FitToRectOptions): void;
}

export interface ViewerProps {
  /**
   * Viewport size in CSS px. Omit either to follow the container's size along that axis — the
   * viewer then fills its parent (`100%`) and tracks resizes, keeping the transform as-is.
   */
  width?: number;
  height?: number;
  scene?: Scene;
  /**
   * 뷰의 pan/zoom 상태를 지정하면 controlled 모드로 동작한다 — Viewer는 자체적으로 이 값을
   * 바꾸지 않고, 상호작용으로 계산된 다음 값을 `onTransformChange`로만 보고한다. 생략하면
   * uncontrolled 모드로 동작해 Viewer가 내부 상태(초기값 identity)를 직접 소유·갱신한다.
   */
  transform?: Transform;
  /** transform이 바뀔 때(휠/드래그 상호작용 결과) 호출된다. controlled/uncontrolled 모두에서 호출됨. */
  onTransformChange?: (transform: Transform) => void;
  /** 휠 줌의 최소/최대 배율. 기본 0.1~10. `fitToRect`도 이 범위를 따른다. */
  minScale?: number;
  maxScale?: number;
  /**
   * 씬 좌표에 위치를 가진 DOM 콘텐츠(예: 데이터 바인딩 위젯) 목록. 각 아이템은
   * `transform`에 맞춰 캔버스와 동일한 좌표계로 pan/zoom된다.
   */
  overlays?: ViewerOverlayItem[];
  /**
   * Called when the pointer is pressed and released without moving past `tapThreshold`.
   * Presses that start on an overlay item are left to that item and not reported here.
   */
  onTap?: (event: ViewerTapEvent) => void;
  /** Movement (CSS px) below which a press counts as a tap rather than a pan. Default 4. */
  tapThreshold?: number;
  /**
   * Applied to the container. The viewer's chrome reads `--ck-viewer-border` (default
   * `1px solid #ccc`) and `--ck-viewer-background` (default `transparent`), so a theme can
   * restyle it through those custom properties.
   */
  className?: string;
  style?: React.CSSProperties;
}

// 서버 렌더링에서는 layout effect가 돌지 않고 React 18이 경고한다 — 브라우저에서만 layout effect.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function readPixelRatio(): number {
  return typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
}

// 창이 다른 배율의 모니터로 옮겨지거나 브라우저 줌이 바뀌면 devicePixelRatio가 달라진다 —
// 현재 값에 대한 resolution 미디어 쿼리가 깨지는 순간을 듣고 다시 구독한다.
function useDevicePixelRatio(): number {
  const [ratio, setRatio] = useState(readPixelRatio);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(`(resolution: ${ratio}dppx)`);
    const update = () => setRatio(readPixelRatio());
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, [ratio]);
  return ratio;
}

// width/height 중 생략된 축은 컨테이너 크기를 따른다.
function useViewportSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  width: number | undefined,
  height: number | undefined
): { width: number; height: number } {
  const followsContainer = width === undefined || height === undefined;
  const [measured, setMeasured] = useState({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const element = containerRef.current;
    if (!followsContainer || !element) return;
    setMeasured({ width: element.clientWidth, height: element.clientHeight });
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const box = entries[entries.length - 1]?.contentRect;
      if (box) setMeasured({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, followsContainer]);

  return { width: width ?? measured.width, height: height ?? measured.height };
}

interface PointerState {
  pointerId: number;
  startX: number;
  startY: number;
  startTransform: Transform;
  panning: boolean;
  startedOnOverlay: boolean;
}

export const Viewer = forwardRef<ViewerHandle, ViewerProps>(function Viewer(
  {
    width: widthProp,
    height: heightProp,
    scene,
    transform: controlledTransform,
    onTransformChange,
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    overlays = [],
    onTap,
    tapThreshold = DEFAULT_TAP_THRESHOLD,
    className,
    style,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledTransform !== undefined;
  const [internalTransform, setInternalTransform] = useState<Transform>(
    controlledTransform ?? IDENTITY_TRANSFORM
  );
  const transform = isControlled ? controlledTransform! : internalTransform;
  const { width, height } = useViewportSize(containerRef, widthProp, heightProp);
  const pixelRatio = useDevicePixelRatio();

  // 누른 시점의 포인터 위치·transform과 팬 진입 여부 (렌더를 유발하지 않아야 함)
  const pointerStateRef = useRef<PointerState | null>(null);

  useEffect(() => {
    if (canvasRef.current && scene) {
      // 캔버스 백킹 스토어는 장치 픽셀 단위 — 뷰 transform(CSS px)을 같은 비율로 키워 그린다.
      const renderTransform =
        pixelRatio === 1
          ? transform
          : { x: transform.x * pixelRatio, y: transform.y * pixelRatio, scale: transform.scale * pixelRatio };
      // 이미지가 아직 로딩 중이면 이번 프레임엔 그려지지 않는다 — 로딩이 끝나면 같은 renderer
      // 인스턴스로 다시 한번 그려서 반영한다(별도 React 상태 없이, canvas만 갱신).
      const renderer: CanvasKitRenderer = new CanvasKitRenderer(canvasRef.current, {
        onImageLoad: () => renderer.render(scene, renderTransform),
      });
      renderer.render(scene, renderTransform);
    }
  }, [scene, width, height, pixelRatio, transform]);

  const applyTransform = useCallback(
    (next: Transform) => {
      if (!isControlled) {
        setInternalTransform(next);
      }
      onTransformChange?.(next);
    },
    [isControlled, onTransformChange]
  );

  // A fit asked for before the container has been measured (0 on either axis — e.g. from a parent's
  // mount effect, which runs before the measured size has rendered) has nothing to fit into yet; it
  // waits here and is applied once, as soon as the viewport has a size.
  const pendingFitRef = useRef<{ rect: Rect; options: FitToRectOptions } | null>(null);

  const fit = useCallback(
    (rect: Rect, options: FitToRectOptions) => {
      applyTransform(fitTransform({ width, height }, rect, { padding: options.padding, minScale, maxScale }));
    },
    [width, height, minScale, maxScale, applyTransform]
  );

  useIsomorphicLayoutEffect(() => {
    const pending = pendingFitRef.current;
    if (!pending || width <= 0 || height <= 0) return;
    pendingFitRef.current = null;
    fit(pending.rect, pending.options);
  }, [width, height, fit]);

  useImperativeHandle(
    ref,
    () => ({
      fitToRect(rect, options = {}) {
        if (width <= 0 || height <= 0) {
          pendingFitRef.current = { rect, options };
          return;
        }
        pendingFitRef.current = null;
        fit(rect, options);
      },
    }),
    [width, height, fit]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const px = e.clientX - (rect?.left ?? 0);
      const py = e.clientY - (rect?.top ?? 0);

      const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY);
      const newScale = clamp(transform.scale * factor, minScale, maxScale);

      // 포인터 아래의 씬 좌표가 줌 전후로 화면상 같은 위치에 남도록 x/y를 함께 보정
      const scenePoint = viewToScene(transform, { x: px, y: py });

      applyTransform({
        x: px - scenePoint.x * newScale,
        y: py - scenePoint.y * newScale,
        scale: newScale,
      });
    },
    [transform, minScale, maxScale, applyTransform]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as Element | null;
      pointerStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTransform: transform,
        panning: false,
        startedOnOverlay: !!target?.closest?.(`[${OVERLAY_ATTRIBUTE}]`),
      };
    },
    [transform]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = pointerStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;

      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (!state.panning) {
        if (Math.hypot(dx, dy) <= tapThreshold) return;
        state.panning = true;
        // 캡처는 팬이 시작된 뒤에만 — 누르는 순간 캡처하면 브라우저가 click 대상을 컨테이너로
        // 바꿔 오버레이 아이템(버튼 등)의 click이 발화하지 않는다. 팬 중엔 캡처 덕에 포인터가
        // 컨테이너 밖으로 나가도 계속 따라가고, 끝난 드래그는 아이템 click으로 이어지지 않는다.
        const container = e.currentTarget as { setPointerCapture?: (id: number) => void };
        container.setPointerCapture?.(e.pointerId);
      }

      // 문턱을 넘은 뒤에는 누른 지점부터의 전체 이동량을 따른다 — 문턱만큼 뒤처지지 않게.
      applyTransform({
        x: state.startTransform.x + dx,
        y: state.startTransform.y + dy,
        scale: state.startTransform.scale,
      });
    },
    [applyTransform, tapThreshold]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = pointerStateRef.current;
      if (state?.pointerId !== e.pointerId) return;
      pointerStateRef.current = null;
      if (state.panning || state.startedOnOverlay || !onTap) return;

      const rect = containerRef.current?.getBoundingClientRect();
      const view = { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
      onTap({
        scene: viewToScene(state.startTransform, view),
        client: { x: e.clientX, y: e.clientY },
        button: e.button,
        pointerType: e.pointerType,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      });
    },
    [onTap]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStateRef.current?.pointerId === e.pointerId) {
      pointerStateRef.current = null;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="viewer-container"
      className={className}
      style={{
        position: 'relative',
        width: widthProp ?? '100%',
        height: heightProp ?? '100%',
        overflow: 'hidden',
        touchAction: 'none',
        background: 'var(--ck-viewer-background, transparent)',
        ...style,
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <canvas
        ref={canvasRef}
        width={Math.round(width * pixelRatio)}
        height={Math.round(height * pixelRatio)}
        data-testid="canvas"
        style={{ position: 'absolute', top: 0, left: 0, width, height }}
      />
      <div
        data-testid="overlay-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          // 캔버스 렌더러(ctx.translate + ctx.scale)와 동일한 순서로 합성되도록
          // transform-origin을 원점(0,0)에 고정 — canvas와 DOM 오버레이가 항상 같은
          // 화면 좌표에 그려지도록 하는 핵심 불변식.
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      >
        {overlays.map(overlay => (
          <div
            key={overlay.id}
            data-testid={`overlay-${overlay.id}`}
            {...{ [OVERLAY_ATTRIBUTE]: '' }}
            style={{
              position: 'absolute',
              left: overlay.x,
              top: overlay.y,
              width: overlay.width,
              height: overlay.height,
              pointerEvents: 'auto',
            }}
          >
            {overlay.content}
          </div>
        ))}
      </div>
      {/* 크롬(테두리)은 레이아웃에 끼지 않는 맨 위 레이어 — 캔버스 크기를 바꾸지 않고 포인터도 통과시킨다. */}
      <div
        data-testid="viewer-chrome"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          border: 'var(--ck-viewer-border, 1px solid #ccc)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});
