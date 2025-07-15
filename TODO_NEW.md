# Canvas-Kit 개발 로드맵

## ✅ 완료된 Phase들

### **Phase 1.5: 기반 안정화** (완료)
- ✅ 워크스페이스 빌드/테스트 시스템
- ✅ core 패키지 구조 정리 (renderer 분리, export 정리)
- ✅ 타입 시스템 확장성 개선
- ✅ 에러 처리 및 검증 로직
- ✅ vitest 단일 실행 모드

### **Phase 2A: Foundation Layer** (완료)
- ✅ 히트 테스트 시스템 완전 구현
- ✅ Scene 클래스 확장 (`getObjectAtPoint`, `getObjectsAtPoint`)
- ✅ 포괄적 테스트 커버리지 (10개 테스트 통과)
- ✅ Samples 환경 구축 (허브, 기본 렌더링, 히트 테스트)

### **Phase 2B: Selection System** (완료 ✅)
- ✅ **Selection Manager 클래스**: 선택 상태를 관리하는 독립적인 클래스 구현
  - ✅ 단일/다중 선택 상태 관리
  - ✅ 선택 변경 이벤트 발생
  - ✅ 선택 해제 기능
  - ✅ 바운딩 박스 계산 로직 (개별/전체 객체)
  - ✅ 포괄적 테스트 스위트 (20 tests)
- ✅ **SVG 오버레이 시스템**: 바운딩 박스 렌더링을 위한 SVG 레이어
  - ✅ SVGOverlay 클래스 구현
  - ✅ 동적 사이즈 조정 및 좌표 동기화
  - ✅ 커스터마이제이션 옵션 (색상, 스타일)
  - ✅ 포괄적 테스트 스위트 (14 tests)
- ✅ **SelectableViewer 컴포넌트**: Viewer + 선택 기능이 통합된 컴포넌트
  - ✅ 마우스 클릭으로 객체 선택/해제
  - ✅ 키보드 단축키 (Escape, Ctrl+A, Ctrl+Click)
  - ✅ 실시간 시각적 피드백
  - ✅ 상태 동기화 (Scene 변경과 선택 상태)
- ✅ **Selection System 샘플**: 선택 기능을 테스트할 수 있는 인터랙티브 샘플
  - ✅ 다양한 객체 타입 지원 (rectangle, circle, text)
  - ✅ 실시간 선택 정보 표시
  - ✅ 컨트롤 패널 및 키보드 단축키 가이드

---

## 🎯 Phase 2C: Designer Integration (다음 단계)

### **[Designer] 통합 에디터 구성**
- [ ] **Designer 패키지 완전 통합**
  - [ ] SelectableViewer를 Designer 기본 컴포넌트로 통합
  - [ ] 속성 패널 (selected object properties)
  - [ ] 툴바 구현 (selection tools, delete, copy/paste)
- [ ] **고급 선택 기능**
  - [ ] 드래그 선택 (rectangle selection)
  - [ ] 선택 영역 시각적 피드백
  - [ ] 다중 선택 상태 관리 고도화

### **[UI] 편집 인터페이스**
- [ ] **속성 패널 컴포넌트**: 선택된 객체 속성 실시간 편집
- [ ] **툴바 컴포넌트**: 선택, 삭제, 복사/붙여넣기 도구
- [ ] **레이어 패널**: 객체 계층 구조 표시 및 관리

---

## 🎯 Phase 3: Manipulation Systems

### **[Core] Transform 시스템**
- [ ] **Transform Manager**: 이동, 크기조정, 회전 로직
- [ ] **Handle System**: 크기조정/회전 핸들 관리
- [ ] **Constraint System**: 비율 유지, 최소/최대 크기 제한

### **[UI] 조작 피드백**
- [ ] **Resize Handles**: 8방향 크기조정 핸들
- [ ] **Rotation Handle**: 회전 조작 핸들
- [ ] **Transform Feedback**: 조작 중 실시간 피드백

### **[Designer] 드래그 & 드롭**
- [ ] **Drag Manager**: 드래그 상태 및 로직 관리
- [ ] **Drop System**: 유효한 드롭 위치 계산
- [ ] **Live Transform**: 조작 중 실시간 렌더링 업데이트

---

## 🎯 Phase 4: Advanced Features

### **[Core] 고급 기능**
- [ ] **Command Pattern**: Undo/Redo 시스템
- [ ] **Clipboard System**: 복사/붙여넣기 기능
- [ ] **Layer System**: 레이어 기반 객체 관리

### **[Designer] 전문 도구**
- [ ] **Alignment Tools**: 객체 정렬 도구
- [ ] **Snapping System**: 격자/객체 스냅 기능
- [ ] **Grouping**: 그룹화/언그룹화 기능

### **[Export] 내보내기 시스템**
- [ ] **Image Export**: PNG, JPEG 내보내기
- [ ] **Vector Export**: SVG 내보내기
- [ ] **Data Export**: JSON 프로젝트 저장/로드

---

## 📊 현재 상태 (2024.12)

### **패키지 상태**
- **@canvas-kit/core**: Production Ready ✅
  - 5개 클래스 (Scene, Renderer, HitTest, SelectionManager, SVGOverlay)
  - 44개 테스트 모두 통과
  - 완전한 타입 커버리지
- **@canvas-kit/viewer**: Stable ✅
  - Viewer 컴포넌트 안정화
- **@canvas-kit/designer**: SelectableViewer Ready ✅
  - SelectableViewer 컴포넌트 완성
  - Designer 기본 통합 준비 완료

### **샘플 환경**
- **허브**: 3개 샘플 통합 관리 ✅
- **기본 렌더링**: Canvas 기본 기능 시연 ✅
- **히트 테스트**: 인터랙티브 충돌 검사 ✅
- **선택 시스템**: 완전한 선택 기능 데모 ✅

### **테스트 커버리지**
- **총 테스트**: 44개 (모두 통과 ✅)
- **core 패키지**: 100% 기능 커버리지
- **지속적 통합**: 빌드/테스트 자동화

---

## 🚀 즉시 진행: Phase 2C 착수

### **우선순위 1: Designer 통합 (2-3일)**
1. SelectableViewer를 Designer 기본 컴포넌트로 통합
2. 속성 패널 기본 구현
3. 삭제 기능 구현 

### **우선순위 2: 드래그 선택 (1-2일)**
1. Rectangle Selection 구현
2. 다중 객체 동시 선택 기능
3. 선택 영역 시각적 피드백

### **우선순위 3: 샘플 확장 (1일)**
1. Designer 통합 샘플 추가
2. 실제 편집 워크플로우 데모

---

## 🎯 Phase 2B 핵심 성과 요약

✅ **완전한 선택 시스템**: 단일/다중 선택, 시각적 피드백, 이벤트 시스템  
✅ **SVG 오버레이 기술**: Canvas와 동기화된 벡터 오버레이 시스템  
✅ **실용적 컴포넌트**: SelectableViewer로 즉시 사용 가능한 선택 기능  
✅ **포괄적 테스트**: 44개 테스트로 높은 코드 신뢰성  
✅ **실제 샘플**: 브라우저에서 바로 테스트 가능한 데모 환경
