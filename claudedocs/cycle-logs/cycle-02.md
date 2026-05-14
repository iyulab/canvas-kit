# Cycle 02: 전체 샘플 기능 검증 + AdvancedDesigner 배경 레이어 수정
Date: 2026-05-14

## Re-plan
Cycle 01 Carry-Forward 없음. 나머지 11개 샘플 기능 검증 + AdvancedDesigner 구조 버그 수정.

## Scope & Implementation
**파일 변경:**
- `packages/designer/src/AdvancedDesigner.tsx`
- `site/src/app/samples/advanced-designer/page.tsx`

**AdvancedDesigner 버그 (구조적):**
도구 전환(`rect`/`circle`/`draw`/`text`) 시 새 Stage 인스턴스가 생성되며 씬 객체가 사라지는 버그.

수정: `renderSceneBackground()` 헬퍼 함수 추가 — `listening={false}` Layer에 기존 씬 객체를 읽기 전용으로 렌더링. `draw/text` Stage와 `isDrawingShapeTool` Stage 양쪽에 배경 레이어 삽입. `Line`, `Text` 컴포넌트 import 추가.

**advanced-designer/page.tsx 버그:**
`handleSceneChange`가 `console.log`만 호출하고 state를 업데이트하지 않아 씬 변경 시 사이드바 미갱신.

수정: `CommandHistory.addEventListener`로 구독 → `forceUpdate(v => v + 1)` 상태 카운터로 리렌더 트리거. `handleSceneChange`에도 `forceUpdate` 추가.

## Verification & Defect Resolution
- rect 도구로 전환 후 기존 도형 유지 확인 (스크린샷)
- 콘솔 에러 0개

**샘플 전체 상태:**
| 샘플 | 에러 | 기능 |
|------|------|------|
| designer | 0 | ✅ |
| advanced-designer | 0 | ✅ Fixed |
| hit-test | 0 | ✅ Hit 감지 정상 |
| selection | 0 | ✅ |
| free-drawing | 0 | ✅ |
| editable-text | 0 | ✅ |
| animation | 0 | ✅ Play 동작 |
| interactive-map | 0 | ✅ |
| undo-redo | 0 | ✅ Add/Undo/Redo 동작 |
| copy-paste | 0 | 🔍 버그 발견 → Cycle 04 |
| drag-drop | 0 | ✅ 개발예정 placeholder |

## Reflection
- AdvancedDesigner의 구조: 도구별로 완전히 분리된 Stage 인스턴스 사용. 씬 공유가 없어 배경 레이어로 보완. 근본적 해결은 단일 Stage + Layer 오버레이 방식으로 리팩토링이지만, 현재 기능 요구사항은 충족함.
- 사이드바 업데이트 패턴: CommandHistory 이벤트 구독 → 카운터 증가 방식은 관용적이나 약간 verbose. 라이브러리가 Observable Scene을 제공하면 더 깔끔함.

## Carry-Forward
- Actionable: basic-rendering이 Viewer 미사용 (Cycle 03에서 수정), copy-paste 이중 적용 버그 (Cycle 04에서 수정)
- Structural Improvement Proposals: AdvancedDesigner 단일 Stage 아키텍처로 리팩토링 고려 — 현재는 배경 레이어로 임시 해결
- Pending Human Decisions: None
- Roadmap Revisions: None
- Next Recommendation: basic-rendering Viewer 교체, copy-paste 버그 수정
