# Cycle 03: basic-rendering 샘플 Viewer 교체 + debug console.log 제거
Date: 2026-05-14

## Re-plan
Carry-Forward: basic-rendering이 설명과 달리 AdvancedDesigner 사용. Cycle 03 범위: Viewer 교체.

## Scope & Implementation
**파일 변경:**
- `packages/viewer/src/viewer.tsx`: `console.log('Rendering scene with objects:', ...)` 제거
- `site/src/app/samples/basic-rendering/page.tsx`: 전면 재작성

**basic-rendering 재작성 내용:**
- `AdvancedDesigner` import → `Viewer` import (동적 로드)
- description 수정: "Canvas 2D API로 씬을 정적으로 렌더링합니다." 추가
- debug `console.log` 4개 제거
- 불필요한 디버그 패널("Objects:..." 목록) 제거
- 깔끔한 Scene Status 박스 유지

## Verification & Defect Resolution
- 빌드: `@canvas-kit/viewer` 재빌드 성공 (631B ESM)
- 샘플 렌더링 확인: Canvas 2D로 2 rect + 2 circle 정상 렌더
- "추가" 버튼 클릭 → Objects in Scene: 4→5, 새 사각형 캔버스에 추가됨 확인
- 콘솔 에러 0개

## Reflection
- Viewer 컴포넌트는 Canvas 2D API 기반 정적 렌더러로, KonvaDesigner와 명확히 구분됨
- basic-rendering 샘플이 이제 라이브러리의 Viewer 패키지를 실제로 데모함
- SSR 없음(`ssr: false`) 적절

## Carry-Forward
- Actionable: copy-paste 이중 적용 버그 (Cycle 04에서 수정)
- Structural Improvement Proposals: None
- Pending Human Decisions: None
- Roadmap Revisions: None
- Next Recommendation: copy-paste 이중 붙여넣기/복제 버그 수정
