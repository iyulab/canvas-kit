# Canvas-Kit 샘플 개발 로드맵

> 방향성 문서 — 사이클별 발견에 따라 수정됨

## 현황 (2026-05-14)

샘플 사이트(`site/`)가 존재하나 다수 기능적 결함이 있어 검증 불가 상태였음.
Cycle 1-5 결과로 핵심 버그 수정 완료.

## Phase 1: 기존 샘플 정상화 ✅ 완료

- KonvaDesigner React 19 호환 (`key` spread 제거)
- KonvaDesigner 무한 렌더 루프 수정 (onSelectionChange 안정 ref)
- AdvancedDesigner 도구 전환 시 씬 객체 유지
- basic-rendering: Viewer 패키지 실제 사용
- copy-paste: 이중 적용 버그 수정
- selection-test: useCallback 래핑

## Phase 2: 샘플 상호작용 강화 (미완료)

- 드래그 드로 실제 브라우저 동작 확인 (자동화 검증 어려움)
- copy-paste Undo 씬 동기화 개선
- Viewer 캔버스 스타일 개선 (테두리, 배경)

## Phase 3: 미구현 샘플 (예정)

- Collision Detection (개발 예정으로 표시됨)
- Drag & Drop (개발 예정으로 표시됨)

## 알려진 제한사항

- Scene 변경이 React 상태와 분리 (mutation 기반 → 참조 동일) → 일부 샘플에서 Undo가 완전 동기화되지 않을 수 있음
- 이는 라이브러리 아키텍처 수준 변경이 필요하며, 현재 사이클 범위 밖
