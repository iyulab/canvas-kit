# Canvas-Kit Konva.js 전면 전환 로드맵

## 🚨 **BREAKING CHANGE: 과감한 리팩토링 전략**

### **전환 목표**
- **Designer 패키지**: Konva.js 기반 완전한 편집 환경 구축
- **Core/Viewer 패키지**: 가벼운 Native Canvas 유지
- **레거시 코드**: 과감한 폐기로 기술 부채 제거

---

## ✅ **보존할 기반** (재사용 가능한 자산)

### **Phase 1-2A 성과물 (유지)**
- ✅ **Core 타입 시스템**: Scene, DrawingObject 인터페이스
- ✅ **테스트 인프라**: Vitest + 44개 검증된 테스트 케이스
- ✅ **워크스페이스 구조**: PNPM monorepo 구성
- ✅ **샘플 환경**: Next.js 기반 테스트 사이트

### **Phase 2B 선택적 보존/폐기**
- ✅ **SelectionManager 인터페이스**: API 설계는 유지
- 🔄 **구현체**: Konva.js Transformer로 완전 대체
- 🗑️ **SVGOverlay**: Konva 내장 기능으로 대체 (14개 테스트 폐기)
- 🗑️ **Native SelectableViewer**: Konva 기반으로 완전 재구현

---

## 🎯 **Phase 3: Konva.js 전면 전환** (최우선 - 1주)

### **새로운 아키텍처 정의**
```typescript
@canvas-kit/core        // Scene, 타입, 유틸리티만 (50KB 이하)
@canvas-kit/viewer      // Native Canvas 렌더러 (가벼운 뷰어)
@canvas-kit/designer    // Konva.js + 완전한 편집 기능 (200KB)
```

### **Step 1: Konva Designer 기반 구조 (Day 1-2)**
- [ ] **konva, konva-react 의존성 추가** (`@canvas-kit/designer`만)
- [ ] **KonvaStage 컴포넌트** 기본 구현
- [ ] **Scene → Konva Objects 변환 로직**
- [ ] **기존 Designer API 호환성** 유지

### **Step 2: Konva 기반 Selection System (Day 3-4)**
- [ ] **Konva Transformer** 활용한 선택 시스템
- [ ] **기존 SelectionManager API** Konva로 재구현
- [ ] **KonvaSelectableStage** 컴포넌트
- [ ] **멀티 셀렉션, 드래그 기본 지원**

### **Step 3: 통합 및 검증 (Day 5-7)**
- [ ] **Designer 샘플** Konva 전환
- [ ] **Selection 샘플** Konva 버전으로 대체
- [ ] **성능 벤치마크** 및 기능 검증
- [ ] **기존 테스트** Konva 버전으로 재작성

---

## 🗑️ **과감한 폐기 대상** (기술 부채 정리)

### **즉시 제거 (Day 1)**
- 🗑️ `SVGOverlay` 클래스 및 관련 14개 테스트
- 🗑️ Native `SelectableViewer` 구현체
- 🗑️ `SelectionManager` 구현체 (인터페이스는 유지)
- 🗑️ Custom selection rendering 로직

### **단계적 제거 (Week 1)**
- 🔄 Manual hit-test → Konva 이벤트 시스템
- 🔄 Custom drag logic → Konva draggable
- 🔄 SVG overlay → Konva visual feedback
- 🔄 Transform calculations → Konva Transformer

---

## 🎯 **Phase 4: 고급 Konva 기능 구현** (1주)

### **Day 1-3: 기본 편집 도구**
- [ ] **드래그 & 드롭**: Konva draggable 속성 활용
- [ ] **크기 조정**: Transformer resize 핸들
- [ ] **회전**: Transformer rotation 핸들
- [ ] **다중 선택**: Transformer 멀티 객체 지원

### **Day 4-5: 고급 편집 기능**
- [ ] **레이어 관리**: Konva Layer 시스템 활용
- [ ] **그룹화**: Konva Group으로 객체 그룹화
- [ ] **애니메이션**: Konva Tween을 활용한 부드러운 애니메이션

### **Day 6-7: 편집 인터페이스**
- [ ] **속성 패널**: 선택된 객체 실시간 속성 편집
- [ ] **툴바**: 선택, 삭제, 복사/붙여넣기 도구
- [ ] **Undo/Redo**: Konva 상태 기반 히스토리 관리

---

## 💡 **패키지별 역할 재정의**

### **@canvas-kit/core** (최대한 가벼움 유지)
```typescript
// 순수 데이터 모델과 유틸리티만
export interface Scene {
  objects: DrawingObject[];
  add(obj: DrawingObject): void;
  remove(obj: DrawingObject): void;
  getObjects(): readonly DrawingObject[];
}

export type DrawingObject = Rect | Circle | Text | Image;

// 렌더링 로직 제거, 순수 데이터 구조만 유지
// 번들 크기: ~30KB 목표
```

### **@canvas-kit/viewer** (Native Canvas 유지)
```typescript
// 가벼운 읽기 전용 렌더러
export class Viewer extends React.Component {
  // CanvasKitRenderer 계속 사용
  // 단순 표시 용도, 편집 기능 없음
  // 번들 크기: ~80KB 유지
}
```

### **@canvas-kit/designer** (Konva.js 전용)
```typescript
// Konva.js 전용 의존성 및 기능
import Konva from 'konva';
import { Stage, Layer } from 'react-konva';

export class KonvaDesigner extends React.Component {
  // 완전한 편집 기능
  // Transformer, 애니메이션, 고급 조작
  // 번들 크기: ~200KB (Konva 포함)
}
```

---

## 🎯 **구현 우선순위**

### **Week 1: 핵심 전환 (파괴적 변경)**
1. **Day 1-2**: Designer 패키지에 Konva 도입, 기본 Stage 구성
2. **Day 3-4**: Selection system을 Konva Transformer로 대체
3. **Day 5**: SVGOverlay, SelectableViewer 완전 제거
4. **Day 6-7**: 샘플 업데이트, 테스트 수정, 검증

### **Week 2: 고급 기능 구현**
1. **Day 1-3**: 드래그, 크기조정, 회전 완구현
2. **Day 4-5**: 레이어 관리, 그룹화 기능
3. **Day 6-7**: 속성 패널, 히스토리 관리

---

## 📊 **성과 목표 및 KPI**

### **기술적 목표**
- ✅ **Designer 기능**: Konva 기반 완전한 편집 환경
- ✅ **성능**: Native Canvas 대비 동등 이상 성능
- ✅ **번들 크기**: Core/Viewer 가벼움 유지
- ✅ **신뢰성**: 검증된 Konva.js 기술 스택

### **사용자 경험 목표**
- 🎯 **편집 도구**: 드래그, 크기조정, 회전 모두 지원
- 🎯 **시각적 피드백**: 부드러운 애니메이션과 변환
- 🎯 **전문 기능**: 레이어, 그룹화, Undo/Redo
- 🎯 **반응성**: 60FPS 부드러운 인터랙션

---

## 🚀 **즉시 실행 계획**

### **오늘 착수할 작업**
1. **konva, react-konva 패키지 설치** (designer만)
2. **기본 KonvaStage 컴포넌트 구현**
3. **Scene → Konva Objects 변환 로직**
4. **SVGOverlay 제거 준비**

### **이번 주 완료 목표**
- ✅ Konva 기반 Designer 동작 확인
- ✅ 기존 Selection 기능 Konva로 완전 대체
- ✅ 레거시 코드 제거 완료
- ✅ 새로운 아키텍처 안정화

---

## 🎯 **핵심 원칙: 과감한 리팩토링**

1. **레거시 유지 비용 포기**: 하위 호환성보다 미래 확장성 우선
2. **검증된 기술 도입**: Konva.js의 성숙한 생태계 활용
3. **명확한 책임 분리**: 각 패키지의 역할을 명확히 구분
4. **점진적 개선 거부**: 전면적 재구성으로 근본적 해결

**→ 2주 후: 현대적이고 확장 가능한 Konva 기반 Canvas-Kit 완성** 🎯
