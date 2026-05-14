# Cycle 01: KonvaDesigner React 19 호환 + 무한 루프 수정
Date: 2026-05-14

## Re-plan
이전 사이클 없음. 목표: "샘플이 제대로 작동하지 않아" — Playwright로 각 샘플 검증.
베이스라인: 테스트 78 pass, 빌드 성공. 두 라이브러리 버그 확인 후 범위 좁혀 수정.

## Scope & Implementation
**파일 변경:** `packages/designer/src/KonvaDesigner.tsx`

1. **React 19 key spread 오류** (`KonvaDesigner.tsx:104`): `commonProps`에서 `key` 제거, 각 JSX 요소(`Rect`, `Circle`, `Line`, `Text`)에 `key={obj.id}` 직접 전달.

2. **무한 렌더 루프** (`KonvaDesigner.tsx:47`): `onSelectionChange`를 `useEffect` 의존성 배열에서 제거. `useRef` + `useLayoutEffect` 패턴으로 안정적 콜백 참조 유지. `import` 목록에 `useLayoutEffect` 추가.

**근거:** `designer/page.tsx`의 `handleSelectionChange`가 `useCallback`으로 감싸지지 않아 매 렌더마다 새 참조 생성 → effect 재실행 → `setSelectedObjects` → 리렌더 → 루프.

## Verification & Defect Resolution
- 빌드 성공 (`tsup`, 42.84 KB CJS)
- Designer 샘플 재방문: 콘솔 에러 0개 (이전: 10개)
- 파란 사각형 클릭 → Transformer 핸들 표시 정상
- "선택된 객체: 1개" 텍스트 업데이트 정상 → onSelectionChange 동작 확인

## Reflection
- 수정 범위 적절: 라이브러리 두 버그만, 샘플 코드 미수정
- `useLayoutEffect`는 SSR 경고를 유발할 수 있으나 `KonvaDesigner`는 이미 `ssr: false`로 동적 로드됨 → 문제 없음
- 철학 드리프트 없음

## Carry-Forward
- Actionable: basic-rendering이 Viewer 대신 AdvancedDesigner 사용 (Cycle 3에서 수정)
- Structural Improvement Proposals: designer/page.tsx의 `handleSelectionChange`도 `useCallback` 래핑이 좋으나, KonvaDesigner 쪽 수정으로 이미 안정화됨 — 저우선순위
- Pending Human Decisions: None
- Roadmap Revisions: None
- Next Recommendation: Cycle 2에서 나머지 샘플 기능 검증 계속
