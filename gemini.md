# 프로젝트 가이드라인

## 개발 방법론
- TDD(Test-Driven Development) 방식을 따라 개발합니다.
- 작업을 마치기 전에 `pnpm check`(lint → 전체 빌드 → 공개 타입 검사 → 타입 검사 → 패키지 테스트)를 통과시킵니다.

## 문서
- 이 리포에는 정제된 문서(`README.md`, `docs/`, 패키지별 `CHANGELOG.md`)만 둡니다. 작업 현황·계획·핸드오프 같은
  개발 추적 기록은 이 리포에 커밋하지 않습니다.

## 구성
- `packages/core` · `packages/viewer` · `packages/designer` — 게시 패키지
- `site` — 각 패키지를 시연하는 데모 사이트(`site/README.md`)
