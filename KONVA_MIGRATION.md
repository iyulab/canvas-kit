# Konva.js 도입 계획 및 마이그레이션 전략

## 📋 현재 상황 분석

### ✅ 자체 구현 현황
- **렌더링**: Native Canvas 2D API 기반 CanvasKitRenderer
- **히트 테스트**: 직접 구현한 HitTest 클래스 (point-in-rect, point-in-circle)
- **선택 시스템**: SVG 오버레이 기반 SelectionManager + SVGOverlay
- **상태 관리**: Scene 클래스로 객체 관리

### 🔍 자체 구현의 한계점
1. **복잡한 도형 지원 부족**: Path, 복잡한 변형 처리 어려움
2. **성능 최적화 부족**: 대량 객체 렌더링 시 성능 저하
3. **이벤트 처리 복잡성**: 마우스/터치 이벤트 직접 관리의 복잡성
4. **크로스 브라우저 호환성**: Canvas API 세부 동작 차이
5. **고급 기능 부족**: 필터, 애니메이션, 복잡한 합성 모드

### 🎯 Konva.js 도입 이점
1. **검증된 안정성**: 5년+ 개발, 수많은 프로덕션 사용 사례
2. **고성능 렌더링**: WebGL 백엔드, 효율적인 레이어 관리
3. **풍부한 기능**: 애니메이션, 필터, 복잡한 도형, 드래그앤드롭
4. **완전한 이벤트 시스템**: 버블링, 캡처링, 계층적 이벤트 처리
5. **크로스 플랫폼**: 브라우저, Node.js, React Native 지원

---

## 🚀 마이그레이션 전략

### Phase 1: Konva.js 기반 렌더러 도입 (2-3일)
```typescript
// packages/core/src/konva-renderer.ts
import Konva from 'konva';
import { Scene, DrawingObject } from './types';

export class KonvaRenderer {
  private stage: Konva.Stage;
  private layer: Konva.Layer;
  
  constructor(container: HTMLDivElement, width: number, height: number) {
    this.stage = new Konva.Stage({
      container,
      width,
      height
    });
    
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }
  
  render(scene: Scene) {
    this.layer.destroyChildren();
    
    scene.getObjects().forEach(obj => {
      const konvaNode = this.createKonvaNode(obj);
      this.layer.add(konvaNode);
    });
    
    this.layer.draw();
  }
  
  private createKonvaNode(obj: DrawingObject): Konva.Node {
    switch (obj.type) {
      case 'rectangle':
        return new Konva.Rect({
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth
        });
      case 'circle':
        return new Konva.Circle({
          x: obj.x,
          y: obj.y,
          radius: obj.radius,
          fill: obj.fill,
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth
        });
      case 'text':
        return new Konva.Text({
          x: obj.x,
          y: obj.y,
          text: obj.text,
          fontSize: obj.fontSize,
          fill: obj.fill
        });
      default:
        throw new Error(`Unsupported object type: ${obj.type}`);
    }
  }
}
```

### Phase 2: Konva 기반 선택 시스템 (1-2일)
```typescript
// packages/core/src/konva-selection.ts
import Konva from 'konva';

export class KonvaSelectionManager {
  private transformer: Konva.Transformer;
  private layer: Konva.Layer;
  
  constructor(layer: Konva.Layer) {
    this.layer = layer;
    this.transformer = new Konva.Transformer({
      nodes: [],
      keepRatio: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    });
    
    layer.add(this.transformer);
  }
  
  selectNode(node: Konva.Node) {
    this.transformer.nodes([node]);
    this.layer.draw();
  }
  
  selectMultiple(nodes: Konva.Node[]) {
    this.transformer.nodes(nodes);
    this.layer.draw();
  }
  
  clearSelection() {
    this.transformer.nodes([]);
    this.layer.draw();
  }
}
```

### Phase 3: 통합 및 마이그레이션 (2-3일)
1. **KonvaViewer 컴포넌트** 구현
2. **기존 SelectableViewer와 API 호환성** 유지
3. **점진적 마이그레이션** - 기존 코드와 병행 운영
4. **성능 벤치마크** 및 테스트

---

## 📦 패키지 구조 개선안

### 현재 구조
```
@canvas-kit/core (Native Canvas)
@canvas-kit/viewer (React + Native Canvas)  
@canvas-kit/designer (React + SelectableViewer)
```

### 제안 구조
```
@canvas-kit/core (타입, 유틸리티, Scene)
@canvas-kit/canvas-renderer (Native Canvas 구현)
@canvas-kit/konva-renderer (Konva.js 구현) ⭐️ NEW
@canvas-kit/viewer (React + 렌더러 선택 가능)
@canvas-kit/designer (React + 고급 편집 기능)
```

---

## 🎯 도입 일정 및 우선순위

### 즉시 시작 (1주차)
1. **Konva.js 패키지 추가**
2. **KonvaRenderer 기본 구현**
3. **기존 기능과 1:1 호환성 확보**

### 단기 목표 (2-3주차)  
1. **Konva 기반 SelectionManager**
2. **드래그앤드롭 구현**
3. **성능 최적화**

### 중장기 목표 (1-2개월)
1. **애니메이션 시스템**
2. **고급 편집 도구**
3. **내보내기 기능 강화**

---

## 💡 호환성 전략

### 점진적 마이그레이션
```typescript
// 사용자가 렌더러를 선택할 수 있도록
<Viewer 
  scene={scene} 
  renderer="konva" // 또는 "canvas"
  width={800} 
  height={600} 
/>
```

### 기존 API 유지
- Scene, DrawingObject 타입은 그대로 유지
- SelectionManager 인터페이스 호환성 보장
- 기존 테스트는 그대로 동작

이렇게 하면 **신뢰성 있는 Konva.js 기반 시스템**으로 전환하면서도 **기존 개발 성과를 보존**할 수 있습니다.
