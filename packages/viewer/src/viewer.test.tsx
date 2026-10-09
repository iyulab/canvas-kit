import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Viewer } from './viewer';
import type { ViewerHandle } from './viewer';
import { CanvasKitRenderer, Scene } from '@canvas-kit/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock the CanvasKitRenderer
const mockRender = vi.fn();
const mockClear = vi.fn();

// 렌더러·Scene만 가짜로 — 좌표 변환 같은 순수 함수는 실제 구현을 그대로 쓴다.
vi.mock('@canvas-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@canvas-kit/core')>();
  const MockCanvasKitRenderer = vi.fn(function (this: Record<string, unknown>) {
    this.render = mockRender;
    this.clear = mockClear;
  });

  const MockScene = vi.fn(function (this: Record<string, unknown>) {
    this.add = vi.fn();
    this.remove = vi.fn();
    this.getObjects = vi.fn(() => []);
    this.clear = vi.fn();
  });

  return {
    ...actual,
    CanvasKitRenderer: MockCanvasKitRenderer,
    Scene: MockScene,
    IDENTITY_TRANSFORM: { x: 0, y: 0, scale: 1 },
  };
});

describe('Viewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a canvas element', () => {
    render(<Viewer width={100} height={100} />);
    const canvasElement = screen.getByTestId('canvas');
    expect(canvasElement).toBeInTheDocument();
    expect(canvasElement).toHaveAttribute('width', '100');
    expect(canvasElement).toHaveAttribute('height', '100');
  });

  it('creates renderer and calls render when scene is provided', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    expect(CanvasKitRenderer).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('does not create renderer when scene is not provided', () => {
    render(<Viewer width={100} height={100} />);

    expect(CanvasKitRenderer).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it('passes an onImageLoad callback that re-renders the scene when invoked', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    const options = (CanvasKitRenderer as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(typeof options.onImageLoad).toBe('function');

    mockRender.mockClear();
    options.onImageLoad();

    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('renders scene with the identity transform by default', () => {
    const scene = new Scene();
    render(<Viewer width={100} height={100} scene={scene} />);

    expect(mockRender).toHaveBeenCalledWith(scene, { x: 0, y: 0, scale: 1 });
  });

  it('passes a given transform through to the renderer', () => {
    const scene = new Scene();
    const transform = { x: 10, y: 20, scale: 2 };
    render(<Viewer width={100} height={100} scene={scene} transform={transform} />);

    expect(mockRender).toHaveBeenCalledWith(scene, transform);
  });

  it('renders no overlays by default', () => {
    render(<Viewer width={100} height={100} />);
    const overlayLayer = screen.getByTestId('overlay-layer');
    expect(overlayLayer.children.length).toBe(0);
  });

  it('renders overlay content positioned at its scene coordinates', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[
          { id: 'w1', x: 30, y: 40, width: 60, height: 20, content: <span>widget-1</span> },
        ]}
      />
    );

    const overlay = screen.getByTestId('overlay-w1');
    expect(overlay).toHaveTextContent('widget-1');
    expect(overlay.style.left).toBe('30px');
    expect(overlay.style.top).toBe('40px');
    expect(overlay.style.width).toBe('60px');
    expect(overlay.style.height).toBe('20px');
  });

  it('renders multiple overlays independently, keyed by id', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[
          { id: 'a', x: 0, y: 0, width: 10, height: 10, content: <span>A</span> },
          { id: 'b', x: 10, y: 10, width: 10, height: 10, content: <span>B</span> },
        ]}
      />
    );

    expect(screen.getByTestId('overlay-a')).toHaveTextContent('A');
    expect(screen.getByTestId('overlay-b')).toHaveTextContent('B');
  });

  it('applies the view transform to the overlay layer so DOM content pans/zooms with the canvas', () => {
    render(
      <Viewer width={100} height={100} transform={{ x: 15, y: 25, scale: 2 }} overlays={[]} />
    );

    const overlayLayer = screen.getByTestId('overlay-layer');
    expect(overlayLayer.style.transform).toBe('translate(15px, 25px) scale(2)');
    expect(overlayLayer.style.transformOrigin).toBe('0 0');
  });

  it('keeps the overlay layer non-interactive but individual overlays interactive', () => {
    render(
      <Viewer
        width={100}
        height={100}
        overlays={[{ id: 'w1', x: 0, y: 0, width: 10, height: 10, content: <span>w</span> }]}
      />
    );

    expect(screen.getByTestId('overlay-layer').style.pointerEvents).toBe('none');
    expect(screen.getByTestId('overlay-w1').style.pointerEvents).toBe('auto');
  });

  describe('pan/zoom interaction (uncontrolled)', () => {
    it('zooms in on wheel with a negative deltaY, anchored at the pointer', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      fireEvent.wheel(container, { deltaY: -100, clientX: 50, clientY: 50 });

      const [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeGreaterThan(1);
    });

    it('zooms out on wheel with a positive deltaY', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      fireEvent.wheel(container, { deltaY: 100, clientX: 50, clientY: 50 });

      const [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeLessThan(1);
    });

    it('clamps zoom to [minScale, maxScale]', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} minScale={0.5} maxScale={2} />);
      const container = screen.getByTestId('viewer-container');

      for (let i = 0; i < 50; i++) {
        fireEvent.wheel(container, { deltaY: -1000, clientX: 50, clientY: 50 });
      }
      let [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeLessThanOrEqual(2);

      for (let i = 0; i < 50; i++) {
        fireEvent.wheel(container, { deltaY: 1000, clientX: 50, clientY: 50 });
      }
      [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform.scale).toBeGreaterThanOrEqual(0.5);
    });

    it('pans by the pointer drag delta without changing scale', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      mockRender.mockClear();
      fireEvent.pointerMove(container, { clientX: 130, clientY: 115, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 130, clientY: 115, pointerId: 1 });

      const [, transform] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transform).toEqual({ x: 30, y: 15, scale: 1 });
    });

    it('does not pan while the pointer is not down', () => {
      render(<Viewer width={200} height={200} scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');

      mockRender.mockClear();
      fireEvent.pointerMove(container, { clientX: 130, clientY: 115, pointerId: 1 });

      expect(mockRender).not.toHaveBeenCalled();
    });
  });

  describe('pan/zoom interaction (controlled)', () => {
    it('reports the computed transform via onTransformChange instead of self-updating', () => {
      const onTransformChange = vi.fn();
      const scene = new Scene();
      const { rerender } = render(
        <Viewer
          width={200}
          height={200}
          scene={scene}
          transform={{ x: 0, y: 0, scale: 1 }}
          onTransformChange={onTransformChange}
        />
      );
      const container = screen.getByTestId('viewer-container');

      fireEvent.wheel(container, { deltaY: -100, clientX: 50, clientY: 50 });

      expect(onTransformChange).toHaveBeenCalledTimes(1);
      const reported = onTransformChange.mock.calls[0][0];
      expect(reported.scale).toBeGreaterThan(1);

      // controlled: until the parent feeds the new value back in, the rendered transform
      // stays exactly what was passed in as a prop.
      const [, transformUsed] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transformUsed).toEqual({ x: 0, y: 0, scale: 1 });

      // once the parent re-renders with the reported transform, the viewer reflects it.
      mockRender.mockClear();
      rerender(
        <Viewer
          width={200}
          height={200}
          scene={scene}
          transform={reported}
          onTransformChange={onTransformChange}
        />
      );
      const [, transformAfterRerender] = mockRender.mock.calls[mockRender.mock.calls.length - 1];
      expect(transformAfterRerender).toEqual(reported);
    });
  });
  describe('tap (press and release without dragging)', () => {
    // jsdom의 getBoundingClientRect는 (0,0)에 놓이므로 client 좌표 = 뷰 좌표.
    it('reports the tapped point in scene coordinates under the current transform', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} transform={{ x: 10, y: 20, scale: 2 }} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 50, clientY: 60, pointerId: 1, button: 0 });
      fireEvent.pointerUp(container, { clientX: 50, clientY: 60, pointerId: 1, button: 0 });

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onTap.mock.calls[0][0]).toMatchObject({
        scene: { x: 20, y: 20 },
        client: { x: 50, y: 60 },
        button: 0,
      });
    });

    it('carries modifier keys and pointer type', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 5, clientY: 5, pointerId: 1, shiftKey: true, pointerType: 'pen' });
      fireEvent.pointerUp(container, { clientX: 5, clientY: 5, pointerId: 1, shiftKey: true, pointerType: 'pen' });

      expect(onTap.mock.calls[0][0]).toMatchObject({ shiftKey: true, altKey: false, pointerType: 'pen' });
    });

    it('treats jitter within the threshold as a tap and does not pan', () => {
      const onTap = vi.fn();
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 102, clientY: 101, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 102, clientY: 101, pointerId: 1 });

      expect(onTransformChange).not.toHaveBeenCalled();
      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('pans instead of tapping once the pointer moves past the threshold', () => {
      const onTap = vi.fn();
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 110, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 100, clientY: 100, pointerId: 1 });

      expect(onTap).not.toHaveBeenCalled();
      // the pan follows the full pointer delta once started — no lag by the threshold distance
      expect(onTransformChange.mock.calls[0][0]).toEqual({ x: 10, y: 0, scale: 1 });
    });

    it('honors a custom tapThreshold', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} tapThreshold={20} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(container, { clientX: 110, clientY: 110, pointerId: 1 });
      fireEvent.pointerUp(container, { clientX: 110, clientY: 110, pointerId: 1 });

      expect(onTap).toHaveBeenCalledTimes(1);
    });

    it('leaves taps on overlay items to the items themselves', () => {
      const onTap = vi.fn();
      render(
        <Viewer
          width={200}
          height={200}
          onTap={onTap}
          overlays={[{ id: 'w1', x: 0, y: 0, width: 50, height: 50, content: <button>widget</button> }]}
        />
      );

      const button = screen.getByText('widget');
      fireEvent.pointerDown(button, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerUp(button, { clientX: 10, clientY: 10, pointerId: 1 });

      expect(onTap).not.toHaveBeenCalled();
    });

    it("reports taps on a display-only overlay (interactive: false) as the viewer's own, and lets the pointer through it", () => {
      const onTap = vi.fn();
      render(
        <Viewer
          width={200}
          height={200}
          onTap={onTap}
          overlays={[
            { id: 'drawing', x: 0, y: 0, width: 200, height: 200, interactive: false, content: <svg data-testid="drawing-svg" /> },
          ]}
        />
      );

      expect(screen.getByTestId('overlay-drawing').style.pointerEvents).toBe('none');
      const drawing = screen.getByTestId('drawing-svg');
      fireEvent.pointerDown(drawing, { clientX: 30, clientY: 40, pointerId: 1 });
      fireEvent.pointerUp(drawing, { clientX: 30, clientY: 40, pointerId: 1 });

      expect(onTap).toHaveBeenCalledTimes(1);
      expect(onTap.mock.calls[0][0]).toMatchObject({ scene: { x: 30, y: 40 } });
    });

    // 누르는 순간 캡처하면 브라우저가 click 대상을 컨테이너로 바꿔 오버레이 아이템의 click이 죽는다 —
    // 캡처는 팬이 실제로 시작될 때만.
    it('captures the pointer only once a pan starts, so presses on overlay items still click', () => {
      render(<Viewer width={200} height={200} />);
      const container = screen.getByTestId('viewer-container');
      const setPointerCapture = vi.fn();
      (container as unknown as { setPointerCapture: typeof setPointerCapture }).setPointerCapture = setPointerCapture;

      fireEvent.pointerDown(container, { clientX: 100, clientY: 100, pointerId: 7 });
      fireEvent.pointerMove(container, { clientX: 102, clientY: 100, pointerId: 7 });
      expect(setPointerCapture).not.toHaveBeenCalled();

      fireEvent.pointerMove(container, { clientX: 120, clientY: 100, pointerId: 7 });
      expect(setPointerCapture).toHaveBeenCalledTimes(1);
      expect(setPointerCapture).toHaveBeenCalledWith(7);
    });

    it('does not report a tap when the pointer is cancelled', () => {
      const onTap = vi.fn();
      render(<Viewer width={200} height={200} onTap={onTap} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.pointerDown(container, { clientX: 10, clientY: 10, pointerId: 1 });
      fireEvent.pointerCancel(container, { clientX: 10, clientY: 10, pointerId: 1 });

      expect(onTap).not.toHaveBeenCalled();
    });
  });

  describe('sizing', () => {
    let resizeCallback: ResizeObserverCallback | undefined;
    const originalResizeObserver = globalThis.ResizeObserver;

    beforeEach(() => {
      resizeCallback = undefined;
      globalThis.ResizeObserver = class {
        constructor(cb: ResizeObserverCallback) {
          resizeCallback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalResizeObserver;
    });

    function resizeTo(width: number, height: number) {
      act(() => {
        resizeCallback?.(
          [{ contentRect: { width, height } } as unknown as ResizeObserverEntry],
          {} as ResizeObserver
        );
      });
    }

    it('fills its container when width and height are omitted', () => {
      render(<Viewer scene={new Scene()} />);
      const container = screen.getByTestId('viewer-container');
      expect(container.style.width).toBe('100%');
      expect(container.style.height).toBe('100%');

      resizeTo(320, 180);

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('width', '320');
      expect(canvas).toHaveAttribute('height', '180');
    });

    it('keeps the transform across container resizes', () => {
      const scene = new Scene();
      render(<Viewer scene={scene} transform={{ x: 5, y: 6, scale: 3 }} />);

      resizeTo(320, 180);
      mockRender.mockClear();
      resizeTo(640, 360);

      expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 5, y: 6, scale: 3 });
    });

    it('defers a fitToRect requested before the container is measured until it is', () => {
      const ref = createRef<ViewerHandle>();
      const onTransformChange = vi.fn();
      render(<Viewer ref={ref} onTransformChange={onTransformChange} />);

      // jsdom lays nothing out, so the viewport is still 0×0 here — a fit now has nothing to fit into.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));
      expect(onTransformChange).not.toHaveBeenCalled();

      resizeTo(400, 200);
      expect(onTransformChange).toHaveBeenCalledTimes(1);
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 100, y: 0, scale: 2 });

      // Applied once — later resizes keep the transform as-is.
      resizeTo(800, 400);
      expect(onTransformChange).toHaveBeenCalledTimes(1);
    });

    it('fits correctly when asked from a parent mount effect, before the measured size has rendered', () => {
      const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
      const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 200 });
      try {
        const onTransformChange = vi.fn();
        function Parent() {
          const ref = React.useRef<ViewerHandle>(null);
          React.useEffect(() => {
            ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 });
          }, []);
          return <Viewer ref={ref} onTransformChange={onTransformChange} />;
        }
        render(<Parent />);

        expect(onTransformChange).toHaveBeenCalledTimes(1);
        expect(onTransformChange).toHaveBeenLastCalledWith({ x: 100, y: 0, scale: 2 });
      } finally {
        // clientWidth/clientHeight normally live on Element.prototype, so there is usually no own
        // descriptor to put back — removing the override is what restores them.
        if (widthDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', widthDescriptor);
        else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
        if (heightDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
        else delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
      }
    });

    it('reports the viewport size once measured and on every resize', () => {
      const onViewportResize = vi.fn();
      render(<Viewer scene={new Scene()} onViewportResize={onViewportResize} />);
      expect(onViewportResize).not.toHaveBeenCalled(); // jsdom measures 0×0 — no viewport yet

      resizeTo(320, 180);
      expect(onViewportResize).toHaveBeenLastCalledWith({ width: 320, height: 180 });
      resizeTo(640, 360);
      expect(onViewportResize).toHaveBeenLastCalledWith({ width: 640, height: 360 });
      expect(onViewportResize).toHaveBeenCalledTimes(2);
    });

    it('reports an explicit viewport size too', () => {
      const onViewportResize = vi.fn();
      render(<Viewer width={100} height={80} onViewportResize={onViewportResize} />);
      expect(onViewportResize).toHaveBeenCalledTimes(1);
      expect(onViewportResize).toHaveBeenLastCalledWith({ width: 100, height: 80 });
    });

    it('uses explicit width/height as-is and does not follow the container', () => {
      render(<Viewer width={100} height={80} />);
      resizeTo(999, 999);

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('width', '100');
      expect(canvas).toHaveAttribute('height', '80');
    });
  });

  describe('device pixel ratio', () => {
    const originalRatio = window.devicePixelRatio;

    afterEach(() => {
      Object.defineProperty(window, 'devicePixelRatio', { value: originalRatio, configurable: true });
    });

    it('sizes the canvas backing store by devicePixelRatio and scales rendering to match', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      const scene = new Scene();
      render(<Viewer width={100} height={50} scene={scene} transform={{ x: 10, y: 5, scale: 1.5 }} />);

      const canvas = screen.getByTestId('canvas');
      expect(canvas).toHaveAttribute('width', '200');
      expect(canvas).toHaveAttribute('height', '100');
      expect(canvas.style.width).toBe('100px');
      expect(canvas.style.height).toBe('50px');
      expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 20, y: 10, scale: 3 });
    });

    it('keeps overlays in CSS px, unaffected by the pixel ratio', () => {
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
      render(<Viewer width={100} height={50} transform={{ x: 10, y: 5, scale: 1.5 }} />);

      expect(screen.getByTestId('overlay-layer').style.transform).toBe('translate(10px, 5px) scale(1.5)');
    });
  });

  describe('fitToRect (imperative handle)', () => {
    it('reports the transform that fits a scene rect, honoring padding and the scale bounds', () => {
      const ref = createRef<ViewerHandle>();
      const onTransformChange = vi.fn();
      render(
        <Viewer ref={ref} width={200} height={100} maxScale={4} onTransformChange={onTransformChange} />
      );

      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 50, y: 0, scale: 1 });

      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 1, height: 1 }, { padding: 10 }));
      expect(onTransformChange.mock.calls[1][0].scale).toBe(4);
    });

    it("caps the fitted scale per call with options.maxScale, inside the viewer's own bounds", () => {
      const ref = createRef<ViewerHandle>();
      const onTransformChange = vi.fn();
      render(<Viewer ref={ref} width={400} height={200} maxScale={4} onTransformChange={onTransformChange} />);

      // A small rect would fit at 2× — capped at 1 it stays at natural size, centered.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }, { maxScale: 1 }));
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 150, y: 50, scale: 1 });

      // A large rect still shrinks to fit — the cap only bounds magnification.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 800, height: 400 }, { maxScale: 1 }));
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 0, y: 0, scale: 0.5 });

      // A cap above the viewer's own maxScale cannot lift it.
      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 10, height: 10 }, { maxScale: 100 }));
      expect(onTransformChange.mock.lastCall![0].scale).toBe(4);
    });

    it('updates the rendered transform in uncontrolled mode', () => {
      const ref = createRef<ViewerHandle>();
      const scene = new Scene();
      render(<Viewer ref={ref} width={200} height={100} scene={scene} />);

      act(() => ref.current!.fitToRect({ x: 0, y: 0, width: 100, height: 100 }));

      expect(mockRender).toHaveBeenLastCalledWith(scene, { x: 50, y: 0, scale: 1 });
    });
  });

  describe('keyboard', () => {
    it('is focusable and named, and announces its keys', () => {
      render(<Viewer width={200} height={100} ariaLabel="Floor plan" />);
      const container = screen.getByTestId('viewer-container');
      expect(container).toHaveAttribute('tabindex', '0');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Floor plan');
      expect(container.getAttribute('aria-keyshortcuts')).toContain('ArrowLeft');
      expect(container.getAttribute('aria-keyshortcuts')!.split(' ')).toEqual(expect.arrayContaining(['Plus', '=', '-']));
    });

    it('pans with the arrow keys — the view moves toward the arrow — and further with Shift', () => {
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={100} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: 'ArrowRight' });
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: -40, y: 0, scale: 1 });
      fireEvent.keyDown(container, { key: 'ArrowDown', shiftKey: true });
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: -40, y: -160, scale: 1 });
      fireEvent.keyDown(container, { key: 'ArrowLeft' });
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      expect(onTransformChange).toHaveBeenLastCalledWith({ x: 0, y: -120, scale: 1 });
    });

    it('zooms around the middle with + and -, within minScale/maxScale', () => {
      const onTransformChange = vi.fn();
      render(<Viewer width={200} height={100} maxScale={1.5} onTransformChange={onTransformChange} />);
      const container = screen.getByTestId('viewer-container');

      fireEvent.keyDown(container, { key: '+' });
      expect(onTransformChange.mock.lastCall![0].scale).toBeCloseTo(1.25);
      // the middle (100, 50) stays put
      const t = onTransformChange.mock.lastCall![0];
      expect(100 * t.scale + t.x).toBeCloseTo(100 * 1.25 - 25);
      fireEvent.keyDown(container, { key: '=' });
      expect(onTransformChange.mock.lastCall![0].scale).toBe(1.5);
      fireEvent.keyDown(container, { key: '-' });
      expect(onTransformChange.mock.lastCall![0].scale).toBeCloseTo(1.2);
    });

    it('keeps the page from scrolling for a key it handles, and leaves other keys alone', () => {
      render(<Viewer width={200} height={100} />);
      const container = screen.getByTestId('viewer-container');
      expect(fireEvent.keyDown(container, { key: 'ArrowDown' })).toBe(false); // default prevented
      expect(fireEvent.keyDown(container, { key: 'a' })).toBe(true);
    });

    it('ignores keys typed inside an overlay item', () => {
      const onTransformChange = vi.fn();
      render(
        <Viewer
          width={200}
          height={100}
          onTransformChange={onTransformChange}
          overlays={[{ id: 'w', x: 0, y: 0, width: 50, height: 20, content: <input aria-label="field" /> }]}
        />
      );
      fireEvent.keyDown(screen.getByLabelText('field'), { key: 'ArrowRight' });
      expect(onTransformChange).not.toHaveBeenCalled();
    });
  });

  describe('chrome', () => {
    it('does not put a border on the canvas itself (it would grow the canvas past its box)', () => {
      render(<Viewer width={100} height={100} />);
      expect(screen.getByTestId('canvas').style.border).toBe('');
    });

    it('draws the border from a CSS custom property with the previous look as fallback', () => {
      render(<Viewer width={100} height={100} />);
      const chrome = screen.getByTestId('viewer-chrome');
      expect(chrome.getAttribute('style')).toContain('var(--ck-viewer-border, 1px solid #ccc)');
      expect(chrome.style.pointerEvents).toBe('none');
      expect(screen.getByTestId('viewer-container').getAttribute('style')).toContain(
        'var(--ck-viewer-background, transparent)'
      );
    });

    it('passes className and style through to the container', () => {
      render(<Viewer width={100} height={100} className="dark-board" style={{ borderRadius: 8 }} />);
      const container = screen.getByTestId('viewer-container');
      expect(container).toHaveClass('dark-board');
      expect(container.style.borderRadius).toBe('8px');
    });
  });
});
