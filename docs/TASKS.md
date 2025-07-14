
# 작업 목록 (Tasks)

## Phase 1: 핵심 기반 구축 (Core Foundation)

### `common`
- [x] 모노레포 관리를 위한 `pnpm-workspace.yaml` 설정
- [x] `eslint`, `prettier`, `tsconfig` 등 공통 개발 환경 설정

### `packages/core`
- [x] `core` 패키지 기본 구조 설정 (`package.json`, `tsconfig.json`)
- [x] Canvas 렌더링을 위한 기본 API 설계
- [x] 간단한 도형(사각형, 원)을 렌더링하는 기능 구현
- [x] `core` 패키지를 위한 테스트 환경 설정 (Vitest)
- [ ] 기본 렌더링 기능에 대한 단위 테스트 작성 (TDD)

### `packages/viewer`
- [ ] `viewer` 패키지 기본 구조 설정
- [ ] `core` 패키지를 사용하여 Canvas를 화면에 표시하는 React 컴포넌트 구현
- [ ] `viewer` 컴포넌트에 대한 기본 테스트 작성

### `site`
- [ ] `viewer` 패키지를 사용하여 렌더링 결과를 보여주는 기본 데모 페이지 구현

---

## Phase 2: 디자인 기능 구현 (Designer Features)

- [ ] `packages/designer` 패키지 생성 및 설정
- [ ] 객체 선택 및 조작(이동, 크기 조절) 기능 구현
- [ ] 속성 편집기 UI 구현
- [ ] `designer` 기능에 대한 테스트 코드 작성

## Phase 3: 고급 기능 및 랜딩 페이지 (Advanced Features & Landing Page)

- [ ] `canvas-kit-site`에 프로젝트를 소개하는 랜딩 페이지 디자인 및 구현
- [ ] `core` 기능 확장 (e.g., 텍스트, 이미지 렌더링)
- [ ] 실행 취소/다시 실행 (Undo/Redo) 기능 구현
- [ ] 작업 내용 직렬화(Serialize)/역직렬화(Deserialize) 기능 구현 (JSON 형태)

## Phase 4: 문서화 및 안정화 (Documentation & Polishing)

- [ ] 각 패키지 API에 대한 상세 문서 작성 (JSDoc 또는 TypeDoc)
- [ ] 데모 페이지 기능 개선 및 사용성 향상
- [ ] 전체적인 코드 리팩토링 및 성능 최적화
- [ ] 최종 버그 수정 및 안정화
