# Cycle 04: copy-paste 이중 적용 버그 + selection-test 무한 루프 수정
Date: 2026-05-14

## Re-plan
Carry-Forward: copy-paste 이중 붙여넣기. 추가 발견: selection-test(허브 외 페이지)의 무한 루프.

## Scope & Implementation
**파일 변경:**
- `site/src/app/samples/copy-paste/page.tsx`
- `site/src/app/samples/selection-test/page.tsx`

**copy-paste 이중 적용 버그:**
`handlePaste`: `PasteCommand.execute()`가 씬에 붙여넣기 후, 수동으로 `clipboard.paste()`를 또 호출해 이중 적용.
`handleDuplicate`: `DuplicateCommand.execute()`가 씬에 복제 후, 수동으로 같은 객체를 또 추가.

수정: Command 실행 후 수동 추가 코드 제거. `handleSceneChange(scene)` 호출로 `setHistoryStatus`를 통한 리렌더 트리거만 유지.

**검증:** Copy(1개 선택) → Paste → Scene Objects 3→4개 (정확히 1개 추가) 확인.

**selection-test 무한 루프:**
`handleSelectionChange`, `handleCanvasSelection`이 `useCallback` 없이 정의됨 → `SimpleSelectionDemo`의 onSelectionChange 의존성으로 루프 발생.

수정: 두 핸들러 `useCallback`으로 래핑, `useCallback` import 추가.

## Verification & Defect Resolution
- copy-paste: Paste 1회 실행 → 4개 (3+1) 정확
- selection-test: 콘솔 에러 0개 (이전: 4개 Maximum update depth exceeded)
- 전체 테스트 78/78 통과, 회귀 없음

## Reflection
- copy-paste 버그 패턴: Command + 수동 중복 적용. 근본 원인은 React 상태와 mutable Scene 참조 불일치를 수동으로 보완하려다 발생.
- 아키텍처 개선 필요: Scene이 Observable이거나 Command가 `onComplete` 콜백을 받으면 이런 패턴이 불필요해짐. Carry-Forward에 기록.
- selection-test: 허브에 노출되지 않은 내부 테스트 페이지지만 접근 가능한 라우트이므로 수정 적절.

## Carry-Forward
- Actionable: None (4개 사이클 목표 완료)
- Structural Improvement Proposals:
  1. Scene에 변경 이벤트 시스템 추가 (Observable pattern) — samples에서 forceUpdate 패턴 불필요해짐
  2. AdvancedDesigner 단일 Stage 아키텍처 리팩토링
- Pending Human Decisions: Scene mutation vs React immutable state 아키텍처 방향
- Roadmap Revisions: Phase 1 완료 표시
- Next Recommendation: 조기 종료 조건 충족 — 발견된 actionable 결함 모두 해결됨. 추가 사이클 필요 시 구조 개선 제안 검토.
