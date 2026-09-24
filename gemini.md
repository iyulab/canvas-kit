# 프로젝트 가이드라인

## 개발 방법론
- TDD(Test-Driven Development) 방식을 따라 개발합니다.

## 작업 흐름
- 이 리포에는 정제된 문서(`README.md`, `docs/`)만 둡니다. 작업 현황·계획·핸드오프 같은 개발 추적 기록은
  이 리포에 커밋하지 않습니다(`claudedocs/`는 `.gitignore` 대상).

## 초기 설정 및 주요 작업

### 패키지 생성
- `packages/core`
- `packages/designer`
- `packages/viewer`

### 웹사이트 (`site`)
- 방문자를 위한 랜딩 페이지를 구현합니다.
- 각 패키지(core, designer, viewer)의 기능을 시연하고 UI를 점검할 수 있는 데모 페이지를 제공합니다.
