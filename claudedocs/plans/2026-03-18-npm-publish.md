# canvas-kit npm 배포 준비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3개 패키지(@canvas-kit/core, viewer, designer)를 npm에 배포 가능한 상태로 정비하고, GitHub Actions publish 워크플로우를 구축한다.

**Architecture:** 각 패키지에 tsup 빌드를 통일하고, package.json에 exports/files/publishConfig를 표준화한다. pnpm workspace:* 참조는 publish 시 실제 버전으로 자동 치환된다. GitHub Actions에서 수동 트리거(workflow_dispatch)로 npm publish를 수행한다.

**Tech Stack:** pnpm workspaces, tsup (빌드), GitHub Actions (CI/CD), npm registry

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `packages/core/package.json` | exports, files 필드 추가, 버전 0.1.0 |
| Modify | `packages/viewer/package.json` | 빌드 스크립트, exports, files, publishConfig 추가, 버전 0.1.0 |
| Modify | `packages/designer/package.json` | 빌드 스크립트, exports, files, publishConfig 추가, 버전 0.1.0 |
| Create | `.github/workflows/publish-npm.yml` | npm publish 워크플로우 |
| Create | `.npmrc` | pnpm publish 설정 |

---

### Task 1: @canvas-kit/core package.json 정비

**Files:**
- Modify: `packages/core/package.json`

- [x] **Step 1: package.json에 exports, files 필드 추가 및 버전 0.1.0으로 업데이트**

현재 상태: main/module/types는 있으나 exports 필드 없음. publishConfig 있음. 버전 0.0.1.

```json
{
  "name": "@canvas-kit/core",
  "version": "0.1.0",
  "description": "UI-independent data engine for canvas-kit",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  }
}
```

- [x] **Step 2: 빌드 테스트**

Run: `cd packages/core && pnpm build`
Expected: dist/ 에 index.js, index.mjs, index.d.ts 생성

- [x] **Step 3: 테스트 실행**

Run: `pnpm test:core`
Expected: 모든 테스트 통과

- [x] **Step 4: Commit**

```bash
git add packages/core/package.json
git commit -m "chore(core): prepare for npm publish v0.1.0"
```

---

### Task 2: @canvas-kit/viewer 빌드 설정 추가

**Files:**
- Modify: `packages/viewer/package.json`

- [ ] **Step 1: package.json에 빌드 스크립트, exports, files, publishConfig 추가**

현재 상태: main/types가 src 파일을 직접 참조. 빌드 스크립트 없음. publishConfig 없음.

viewer는 React 컴포넌트이므로 JSX를 보존하지 않고 컴파일해야 함. tsup으로 빌드.

```json
{
  "name": "@canvas-kit/viewer",
  "version": "0.1.0",
  "description": "Lightweight HTML viewer for canvas-kit",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --external react --external react-dom --external @canvas-kit/core",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "lint": "echo 'ESLint configuration in progress'"
  },
  "dependencies": {
    "@canvas-kit/core": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

주요 변경:
- tsup 빌드 추가 (core를 external로 처리, react를 external로 처리)
- peerDependencies React 범위를 18+19로 확장
- devDependencies에 tsup 추가 필요

- [x] **Step 2: devDependencies에 tsup 추가**

Run: `cd packages/viewer && pnpm add -D tsup`

- [x] **Step 3: 빌드 테스트**

Run: `cd packages/core && pnpm build && cd ../viewer && pnpm build`
Expected: packages/viewer/dist/ 에 index.js, index.mjs, index.d.ts 생성

- [x] **Step 4: 테스트 실행**

Run: `pnpm test:viewer`
Expected: 모든 테스트 통과

- [x] **Step 5: Commit**

```bash
git add packages/viewer/package.json pnpm-lock.yaml
git commit -m "chore(viewer): add build setup for npm publish v0.1.0"
```

---

### Task 3: @canvas-kit/designer 빌드 설정 추가

**Files:**
- Modify: `packages/designer/package.json`

- [ ] **Step 1: package.json에 빌드 스크립트, exports, files, publishConfig 추가**

현재 상태: main/types가 src/index.tsx를 직접 참조. 빌드 스크립트 없음.

designer는 React + Konva 의존. 모두 external로 처리.

```json
{
  "name": "@canvas-kit/designer",
  "version": "0.1.0",
  "description": "Complete canvas editor UI powered by Konva.js",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.tsx --format cjs,esm --dts --external react --external react-dom --external konva --external react-konva --external @canvas-kit/core --external @canvas-kit/viewer",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit",
    "lint": "echo 'ESLint configuration in progress'"
  },
  "dependencies": {
    "@canvas-kit/core": "workspace:*",
    "@canvas-kit/viewer": "workspace:*"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "konva": "^9.0.0",
    "react-konva": "^18.0.0 || ^19.0.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

주요 변경:
- konva, react-konva를 dependencies → peerDependencies로 이동
- tsup 빌드 추가 (모든 peer deps를 external로)
- devDependencies에 tsup 추가 필요

- [x] **Step 2: devDependencies에 tsup 추가, konva/react-konva를 devDependencies로도 유지**

Run: `cd packages/designer && pnpm add -D tsup konva react-konva`
(konva/react-konva를 peerDeps로 올리되 devDeps에도 남겨 로컬 개발/테스트용)

- [x] **Step 3: 빌드 테스트**

Run: `cd packages/core && pnpm build && cd ../viewer && pnpm build && cd ../designer && pnpm build`
Expected: packages/designer/dist/ 에 index.js, index.mjs, index.d.ts 생성

- [x] **Step 4: Commit**

```bash
git add packages/designer/package.json pnpm-lock.yaml
git commit -m "chore(designer): add build setup for npm publish v0.1.0"
```

---

### Task 4: .npmrc 생성

**Files:**
- Create: `.npmrc`

- [ ] **Step 1: 루트에 .npmrc 생성**

```
# pnpm workspace publish 시 workspace:* 참조를 실제 버전으로 치환
# npm publish 인증은 GitHub Actions에서 NPM_TOKEN 환경변수로 처리
```

참고: pnpm은 publish 시 `workspace:*`를 자동으로 실제 버전(`^0.1.0`)으로 치환하므로 별도 설정 불필요. .npmrc는 필요 시에만 추가.

실제로 pnpm은 기본 동작으로 workspace 프로토콜을 치환하므로, .npmrc 없이도 동작함. **이 Task는 skip 가능.**

---

### Task 5: GitHub Actions npm publish 워크플로우 생성

**Files:**
- Create: `.github/workflows/publish-npm.yml`

- [x] **Step 1: publish 워크플로우 작성**

```yaml
name: Publish to npm

on:
  workflow_dispatch:
    inputs:
      package:
        description: 'Package to publish (core, viewer, designer, all)'
        required: true
        default: 'all'
        type: choice
        options:
          - core
          - viewer
          - designer
          - all

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Build packages
        run: |
          pnpm --filter @canvas-kit/core build
          pnpm --filter @canvas-kit/viewer build
          pnpm --filter @canvas-kit/designer build

      - name: Test packages
        run: |
          pnpm --filter @canvas-kit/core test
          pnpm --filter @canvas-kit/viewer test

      - name: Publish core
        if: ${{ inputs.package == 'core' || inputs.package == 'all' }}
        run: pnpm --filter @canvas-kit/core publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish viewer
        if: ${{ inputs.package == 'viewer' || inputs.package == 'all' }}
        run: pnpm --filter @canvas-kit/viewer publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish designer
        if: ${{ inputs.package == 'designer' || inputs.package == 'all' }}
        run: pnpm --filter @canvas-kit/designer publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [x] **Step 2: Commit**

```bash
git add .github/workflows/publish-npm.yml
git commit -m "ci: add npm publish workflow"
```

---

### Task 6: 로컬 빌드 전체 검증

- [x] **Step 1: 전체 빌드 + 테스트**

Run: `pnpm build:all && pnpm test:packages`
Expected: 모든 패키지 빌드 성공, 테스트 통과

- [x] **Step 2: dry-run publish 확인**

Run:
```bash
cd packages/core && pnpm publish --dry-run
cd ../viewer && pnpm publish --dry-run
cd ../designer && pnpm publish --dry-run
```
Expected: 각 패키지의 포함 파일 목록 확인, workspace:* 가 버전으로 치환되었는지 확인

- [x] **Step 3: 최종 Commit**

```bash
git add -A
git commit -m "chore: finalize npm publish setup for v0.1.0"
```

---

## 배포 전 필수 사항 (수동)

1. GitHub 리포 Settings → Secrets에 `NPM_TOKEN` 추가
2. npmjs.com에서 @canvas-kit org에 팀원 초대 (필요 시)
3. `git push` 후 GitHub Actions에서 publish 워크플로우 수동 실행

## 주의사항

- `git push`는 수동으로 수행 (CLAUDE.md 정책)
- 메이저 버전 변경 금지 — 0.1.0으로 시작
- site 패키지는 private:true이므로 publish 대상 아님
