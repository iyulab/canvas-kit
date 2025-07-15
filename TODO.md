# Canvas-Kit Konva.js 전면 전환 로드맵

## 🎯 **프로젝트 현황** (2025-07-15 완료)

### **달성된 목표**
- **Designer 패키지**: Konva.js 기반 완전한 편집 환경 구축 ✅
- **Core/Viewer 패키지**: 가벼운 Native Canvas 유지 (8.6KB) ✅  
- **레거시 코드**: 과감한 폐기로 기술 부채 제거 ✅

### **현재 상태**
- **실행 기간**: 1일 완료 (2025-07-15)
- **테스트**: 30개 모두 통과  
- **번들 크기**: Core 8.6KB, Designer ~200KB (Konva 포함)
- **라이브 데모**: http://localhost:3000/demo/designer

---

## 📋 **완료된 작업 정리**

<details>
<summary><strong>✅ Phase 1-2A: 기반 시스템 (보존)</strong></summary>

- ✅ **Core 타입 시스템**: Scene, DrawingObject 인터페이스 (`rect`, `circle`, `text`)
- ✅ **테스트 인프라**: Vitest + 30개 검증된 테스트 케이스  
- ✅ **워크스페이스 구조**: PNPM monorepo 구성
- ✅ **샘플 환경**: Next.js 기반 테스트 사이트
- ✅ **빌드 시스템**: tsup 기반 ESM/CJS 듀얼 빌드

</details>

<details>
<summary><strong>✅ Phase 2B: Konva 전환 (2025-07-15)</strong></summary>

**Step 1A: Konva 기반 구조**
- ✅ konva, react-konva 의존성 추가 (Designer만)
- ✅ KonvaDesigner 완전 구현 (드래그, 리사이즈, 선택)
- ✅ Scene → Konva Objects 변환 로직
- ✅ 샘플 페이지 Konva 전환 완료

**Step 1B: 레거시 제거**  
- ✅ SVGOverlay 완전 제거 (14개 테스트 삭제)
- ✅ SelectableViewer 완전 제거 
- ✅ Core 타입 통일 ('rectangle' → 'rect')
- ✅ 번들 최적화 (11KB → 8.6KB)

</details>

<details>
<summary><strong>✅ Phase 3A-1: Rectangle Selection (2025-07-15 오후)</strong></summary>

**구현 완료:**
- ✅ **SelectionBox 컴포넌트**: 독립적인 Rectangle Selection 기능
- ✅ **드래그 영역 선택**: 빈 영역에서 드래그로 사각형 영역 그리기
- ✅ **시각적 피드백**: 파란색 점선 테두리 SelectionBox 표시  
- ✅ **다중 객체 선택**: 영역 내 모든 객체 자동 선택
- ✅ **기존 기능 호환**: Ctrl+Click 개별 선택과 함께 사용 가능
- ✅ **Next.js 호환성**: Konva SSR 문제 해결 및 웹팩 설정

**기술적 세부사항:**
- SelectionBox는 투명한 이벤트 레이어로 구현
- 객체 타입별 선택 로직 (rect: 모서리, circle/text: 중심점)
- 실시간 선택 영역 계산 및 시각적 표시
- KonvaDesigner와 완전 통합

</details>

---

## 🚀 **Phase 3: 사용자 경험 고도화** (진행중 - 2025-07-15~18)

### **🥇 우선순위 1: 핵심 UX 기능 (Day 1) - 50% 완료**

**3A-1. Rectangle Selection** ✅ **완료**
- [x] 드래그로 사각형 영역 그려서 다중 선택
- [x] 기존 Ctrl+Click과 함께 제공  
- [x] SelectionBox 시각적 피드백 (파란색 점선 테두리)
- [x] 부분적으로 겹치는 객체도 선택 지원

**3A-2. Undo/Redo 시스템** ⚡ **다음 작업**
- [ ] Scene 변경 히스토리 관리 (Command 패턴)
- [ ] Ctrl+Z, Ctrl+Y 키보드 단축키
- [ ] 메모리 효율적인 스택 관리 (최대 50단계)
- [ ] 실행 취소 가능한 작업: 드래그, 리사이즈, 추가, 삭제

**3A-3. Copy/Paste 기능**  
- [ ] Ctrl+C, Ctrl+V 키보드 단축키
- [ ] 클립보드를 통한 객체 복제
- [ ] 붙여넣기 시 자동 오프셋 적용 (10px씩)
- [ ] 다중 선택 객체 일괄 복사

### **🥈 우선순위 2: 편집 편의성 (Day 2)**
> 생산성을 크게 향상시키는 고급 편집 기능

**3B-1. Snap & Alignment**
- [ ] 객체 간 자동 정렬 (스냅 거리: 5px)
- [ ] 가이드라인 표시 (중앙선, 가장자리)  
- [ ] 격자 배경 및 격자 스냅 (20px 간격)
- [ ] 스냅 on/off 토글 기능

**3B-2. Group Transform**
- [ ] 다중 선택된 객체들의 동시 변형
- [ ] 그룹 회전, 크기조정 최적화
- [ ] 비례 유지 옵션 (Shift 키)
- [ ] 그룹 중심점 기준 변형

**3B-3. Layer Management**
- [ ] 객체 순서 관리 (앞으로/뒤로)
- [ ] 우클릭 컨텍스트 메뉴
- [ ] Z-index 시각적 표시
- [ ] 키보드 단축키: Ctrl+] (앞으로), Ctrl+[ (뒤로)

### **🥉 우선순위 3: 고급 기능 (Day 3)**  
> 차별화된 사용자 경험을 제공하는 고급 기능

**3C-1. 애니메이션 효과**
- [ ] 객체 선택/해제 시 부드러운 트랜지션 (200ms)
- [ ] 드래그 시 실시간 그림자 효과
- [ ] Transform 핸들 호버 하이라이트
- [ ] 스냅 시 진동 효과

**3C-2. 이미지 지원**
- [ ] 드래그 앤 드롭으로 이미지 추가
- [ ] 이미지 크기조정 및 회전
- [ ] 지원 포맷: PNG, JPG, SVG
- [ ] 이미지 미리보기 및 로딩 상태

**3C-3. 성능 최적화**
- [ ] 대량 객체 처리 최적화 (1000개 이상)
- [ ] 뷰포트 기반 렌더링 (가시 영역만)
- [ ] 메모리 사용량 모니터링
- [ ] 디바운스된 리렌더링

---

## 🔄 **다음 단계 실행 계획**

### **오늘 남은 작업 (2025-07-15 오후)**
1. **Undo/Redo 시스템 구현** - 시스템 안정성 확보  
2. **기본 테스트 작성** - Rectangle Selection 품질 보장
3. **Copy/Paste 기초 구조** - 키보드 단축키 준비

### **측정 가능한 목표**
- **Day 1**: Rectangle Selection ✅ + Undo/Redo 동작 확인
- **Day 2**: Copy/Paste + Snap 기능 완성  
- **Day 3**: 성능 최적화 + 애니메이션 효과

### **성공 기준**
- [x] Rectangle Selection 기능 완전 동작 ✅
- [ ] 각 기능별 최소 3개 테스트 케이스 작성
- [ ] 라이브 데모에서 모든 기능 동작 확인  
- [ ] 성능: 100개 객체에서 60fps 유지
- [ ] 메모리: Undo 스택 50단계에서 100MB 이하

---

## 🎯 **다음: Undo/Redo 시스템 구현 시작**

**즉시 착수할 작업:**
1. Command 패턴 기반 히스토리 관리자 구현
2. Scene 변경 감지 및 명령 기록
3. Ctrl+Z, Ctrl+Y 키보드 이벤트 처리
4. 메모리 효율적인 스택 관리
