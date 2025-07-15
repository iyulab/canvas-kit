# Canvas-Kit 작업 현황 및 계획

## 📋 **작성 지침**
- 각 작업 수행 전후 체크박스로 진행 상황 관리
- 페이즈 완료 시 성과를 묶어 정리하고 다음 페이즈 상세 도출
- 각 페이즈 마지막에 `/docs` 문서 업데이트 및 `/samples` 앱 통합

## ✅ **Phase 1-2: 기반 구축 완료** (2025-07-15)

<details>
<summary><strong>완료된 핵심 작업들</strong></summary>

### **🏗️ 인프라 구축**
- [x] **모노레포 설정**: PNPM workspace 기반 멀티 패키지
- [x] **개발 환경**: TypeScript, ESLint, Prettier, Vitest
- [x] **빌드 시스템**: tsup 기반 ESM/CJS 듀얼 빌드
- [x] **테스트 환경**: 30개 테스트 케이스 (모두 통과)

### **📦 Core 패키지 (8.6KB)**
- [x] **Scene 클래스**: 객체 관리 (add, remove, getObjects)
- [x] **타입 시스템**: DrawingObject (rect, circle, text)
- [x] **CanvasKitRenderer**: Native Canvas 2D 렌더링 엔진
- [x] **HitTest**: 좌표 기반 객체 감지 시스템
- [x] **SelectionManager**: 선택 상태 관리

### **🖼️ Viewer 패키지**
- [x] **Viewer 컴포넌트**: Scene → Canvas 렌더링
- [x] **React 통합**: 완전한 TypeScript 지원
- [x] **성능 최적화**: 경량화된 읽기 전용 렌더러

### **🎨 Designer 패키지 (200KB with Konva)**
- [x] **KonvaDesigner**: Konva.js 기반 완전한 편집 환경
- [x] **기본 편집**: 드래그, 리사이즈, 회전, 선택
- [x] **Rectangle Selection**: 드래그 영역 선택 (NEW!)
- [x] **멀티 선택**: Ctrl+Click 및 영역 선택
- [x] **Transform**: Konva Transformer 통합

### **🌐 Site & Samples**
- [x] **Next.js 사이트**: http://localhost:3000
- [x] **Samples 통합**: `/samples/*` 구조로 통일
- [x] **실시간 데모**: Designer, Basic Rendering, Hit Test 등
- [x] **Konva SSR 해결**: 웹팩 설정 최적화

### **🧹 레거시 제거**
- [x] **SVGOverlay 완전 제거**: 14개 테스트 삭제
- [x] **SelectableViewer 제거**: Konva로 완전 대체
- [x] **타입 통일**: 'rectangle' → 'rect'
- [x] **기술 부채 정리**: 과감한 리팩토링 완료

</details>

---

## 🚀 **Phase 3: 사용자 경험 고도화** (진행중 - 2025-07-15~18)

### **🥇 우선순위 1: 핵심 UX 기능 (Day 1) - 25% 완료**

**3A-1. Rectangle Selection** ✅ **완료** (2025-07-15)
- [x] SelectionBox 컴포넌트 구현
- [x] 드래그 영역 선택 (파란색 점선 테두리)
- [x] 스마트 객체 감지 (타입별 최적화)
- [x] 기존 기능과 완벽 호환

**3A-2. Undo/Redo 시스템** ⚡ **다음 작업**
- [ ] **Command 패턴 구현**
  - [ ] ICommand 인터페이스 정의
  - [ ] MoveCommand, ResizeCommand, AddCommand, DeleteCommand
  - [ ] CommandHistory 클래스 (스택 관리)
- [ ] **키보드 단축키**
  - [ ] Ctrl+Z (Undo) 이벤트 핸들러
  - [ ] Ctrl+Y (Redo) 이벤트 핸들러
  - [ ] 브라우저 기본 동작 방지
- [ ] **메모리 관리**
  - [ ] 최대 50단계 히스토리
  - [ ] 메모리 사용량 제한 (100MB)
  - [ ] 자동 가비지 컬렉션

**3A-3. Copy/Paste 기능**
- [ ] **클립보드 관리**
  - [ ] 내부 클립보드 시스템
  - [ ] 다중 객체 복사 지원
  - [ ] JSON 직렬화/역직렬화
- [ ] **키보드 단축키**
  - [ ] Ctrl+C (Copy) 구현
  - [ ] Ctrl+V (Paste) 구현
  - [ ] 자동 오프셋 적용 (10px)

### **🥈 우선순위 2: 편집 편의성 (Day 2)**

**3B-1. Snap & Alignment**
- [ ] **스냅 시스템**
  - [ ] 객체 간 거리 기반 스냅 (5px)
  - [ ] 가이드라인 렌더링
  - [ ] 중앙선/가장자리 정렬
- [ ] **격자 시스템**
  - [ ] 격자 배경 렌더링 (20px)
  - [ ] 격자 기반 스냅
  - [ ] 격자 표시/숨김 토글

**3B-2. Group Transform**
- [ ] **그룹 선택 최적화**
  - [ ] 다중 객체 동시 변형
  - [ ] 그룹 중심점 계산
  - [ ] 비례 유지 (Shift 키)
- [ ] **성능 최적화**
  - [ ] 실시간 그룹 변형
  - [ ] 부드러운 애니메이션

**3B-3. Layer Management**
- [ ] **순서 관리**
  - [ ] 앞으로/뒤로 이동
  - [ ] Z-index 시각화
  - [ ] 키보드 단축키 (Ctrl+], Ctrl+[)
- [ ] **컨텍스트 메뉴**
  - [ ] 우클릭 메뉴
  - [ ] 레이어 관련 작업

### **🥉 우선순위 3: 고급 기능 (Day 3)**

**3C-1. 애니메이션 & UX**
- [ ] **트랜지션 효과**
  - [ ] 선택/해제 애니메이션 (200ms)
  - [ ] Transform 핸들 하이라이트
  - [ ] 스냅 진동 효과
- [ ] **시각적 피드백**
  - [ ] 드래그 그림자
  - [ ] 호버 상태 표시

**3C-2. 이미지 지원**
- [ ] **이미지 렌더링**
  - [ ] Image 타입 추가 (Core)
  - [ ] PNG, JPG, SVG 지원
  - [ ] 드래그 앤 드롭 업로드
- [ ] **이미지 편집**
  - [ ] 크기 조정
  - [ ] 회전 및 변형

**3C-3. 성능 최적화**
- [ ] **대량 데이터 처리**
  - [ ] 1000개 이상 객체 지원
  - [ ] 뷰포트 기반 렌더링
  - [ ] 메모리 최적화
- [ ] **렌더링 최적화**
  - [ ] 디바운스된 리렌더링
  - [ ] 60fps 성능 보장

---

## 📊 **진행 현황 대시보드**

### **완료율**
- ✅ **Phase 1-2**: 100% (기반 구축)
- ✅ **Phase 3A**: 100% (Undo/Redo 완료)
- ✅ **Phase 3B**: 100% (Copy/Paste 완료)
- ⏳ **Phase 3C**: 0% (고급 기능)

### **핵심 지표**
- **번들 크기**: Core 8.6KB ✅, Designer 200KB ✅
- **테스트 커버리지**: 30개 테스트 모두 통과 ✅
- **브라우저 호환성**: Chrome, Firefox, Safari ✅
- **성능**: 100개 객체에서 60fps 목표

### **다음 마일스톤**
1. ✅ **완료 (2025-07-15)**: Undo/Redo + Copy/Paste 시스템 구현
2. **다음 (2025-07-16)**: Snap & Alignment 기능
3. **이후 (2025-07-17)**: 애니메이션 + 성능 최적화

---

## 🎯 **다음 작업: Snap & Alignment 시스템**

### **즉시 착수할 세부 작업**
1. **Grid/Snap 관리 클래스** (1시간)
   - SnapManager 클래스 구현
   - 격자 스냅, 객체 스냅 기능
2. **정렬 도구** (1시간)
   - AlignmentManager 클래스
   - 좌/우/중앙 정렬, 균등 분배
3. **시각적 가이드** (30분)
   - 스냅 라인 표시, 정렬 가이드
   - 키보드 이벤트 처리
4. **테스트 작성** (30분)
   - Undo/Redo 동작 검증
   - 메모리 누수 방지

### **성공 기준**
- [ ] Ctrl+Z/Y로 모든 편집 작업 되돌리기 가능
- [ ] 50단계 히스토리 유지
- [ ] 메모리 사용량 100MB 이하
- [ ] 실시간 데모에서 완벽 동작