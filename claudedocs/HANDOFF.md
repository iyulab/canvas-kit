# Canvas-Kit 핸드오프 문서

> 현재·다음 작업 중심. 과거 이력은 TASKS.md 및 cycle-logs/ 참조.
> 로드맵 앵커: [TASKS.md](../docs/TASKS.md)

**최종 업데이트:** 2026-05-14

---

## 현재 상태

### 브랜치 / 커밋
- 브랜치: `main`
- 최신 커밋: `8bfe48e` — 샘플 정상화 4개 사이클 (2026-05-14)
- 미푸시: `origin/main` 대비 2 커밋 앞

### 테스트 / 빌드
- 테스트: 78/78 통과 (`@canvas-kit/core` 75 + `@canvas-kit/viewer` 3)
- 빌드: CJS + ESM + DTS 모두 정상
- 샘플 사이트: `site/` — `cd site && npx next dev` (포트 3001 권장, 3000은 다른 앱과 충돌 가능)

### 샘플 상태 (모두 에러 0)
| 샘플 | 상태 | 비고 |
|------|------|------|
| basic-rendering | ✅ | Viewer(Canvas 2D) 실제 사용 |
| designer | ✅ | 선택·Transformer 정상 |
| advanced-designer | ✅ | 도구 전환 시 씬 유지 |
| hit-test | ✅ | Core HitTest API 데모 |
| selection | ✅ | |
| free-drawing | ✅ | |
| editable-text | ✅ | |
| animation | ✅ | Play/Stop |
| interactive-map | ✅ | 점유율 데모 |
| undo-redo | ✅ | Add/Undo/Redo 모두 동작 |
| copy-paste | ✅ | 이중 적용 버그 수정 |
| drag-drop | ℹ️ | 개발 예정 placeholder |
| selection-test | ✅ | 허브 미노출, 무한루프 수정 |

---

## 다음에 할 일

### 우선순위 1 — Phase 3B (미완료, TASKS.md에서 이어받음)
**Snap & Alignment 시스템** (TASKS.md `3B-1`)
- SnapManager 클래스, 격자 스냅, 객체 간 정렬
- `@canvas-kit/core`에 추가 or designer 내부 구현 결정 필요 (upstream 확장 정책 적용)

**Group Transform** (TASKS.md `3B-2`)
- 다중 선택 시 동시 변형, 그룹 중심점 계산

### 우선순위 2 — 아키텍처 개선 제안 (Cycle 04 Carry-Forward)
- **Scene Observable Pattern**: Scene에 변경 이벤트 추가 → samples에서 `forceUpdate` 패턴 제거
  - 현재: scene mutation 후 `setHistoryStatus()`로 side-effect 리렌더 트리거 (기술 부채)
  - 개선: `scene.addEventListener('change', handler)` → React state 동기화
- **AdvancedDesigner 단일 Stage 아키텍처**: 현재 도구별 별도 Stage 인스턴스 → 레이어 오버레이 방식
  - 현재 workaround: `renderSceneBackground()` 배경 레이어 (작동하나 이상적이지 않음)

### 우선순위 3 — Phase 3C (TASKS.md `3C-*`)
- 이미지 지원, 성능 최적화 (1000개 객체)

---

## 참고 사항

### 개발 환경
```bash
# 패키지 빌드 (변경 후 필수)
cd packages/designer && npm run build
cd packages/viewer && npm run build

# 샘플 사이트
cd site && npx next dev --port 3001

# 테스트
npm test  # 루트에서 실행
```

### 주의 사항
- `site/`는 workspace 패키지를 `dist/`로 참조 → **라이브러리 코드 변경 후 반드시 빌드**
- React 19 사용 중 → `key`를 object spread로 전달하면 경고 (KonvaDesigner는 수정 완료)
- Scene은 mutable 객체: `setScene(scene)` 동일 참조는 React에서 bailout → `setHistoryStatus()` 등 다른 상태로 리렌더 트리거 필요

### 사이클 로그 위치
- `claudedocs/cycle-logs/` — 이번 세션 4개 사이클 상세 기록
