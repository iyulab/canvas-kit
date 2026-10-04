# canvas-kit demo site

The live demo at [iyulab.github.io/canvas-kit](https://iyulab.github.io/canvas-kit): a Next.js app
with interactive samples for `@canvas-kit/core`, `@canvas-kit/viewer` and `@canvas-kit/designer`.
It uses the packages from this workspace, so it shows them as they are on `main`.

From the repository root:

```bash
pnpm dev           # run the site locally
pnpm build:all     # build the packages and the site
```

The samples live in `src/app/samples/`. `.github/workflows/deploy-pages.yml` builds a static export
(served under `/canvas-kit/`) and publishes it to GitHub Pages.
