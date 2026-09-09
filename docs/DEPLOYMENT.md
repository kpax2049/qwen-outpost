# Outpost — Deployment Guide

## Running Locally

```bash
cd outpost
npm install
npm run dev
```

The dev server starts on `http://localhost:5173`.

## Building for Production

```bash
cd outpost
npm run build
```

Outputs to `outpost/dist/` with two entry points:
- `index.html` — Main game
- `showcase.html` — Visual Showcase / Asset Atlas (developer-only)

## GitHub Pages Deployment

### How it works

1. A GitHub Actions workflow (`.github/workflows/pages.yml`) triggers on every push to `main`.
2. It installs dependencies, builds the Vite app with `PAGES_BASE=/qwen-outpost/`, and uploads the `outpost/dist/` directory as a GitHub Pages artifact.
3. GitHub Pages serves the artifact at the repository URL.

### Expected public URL

For repository `kpax2049/qwen-outpost`:

```
https://kpax2049.github.io/qwen-outpost/
```

### Required repository settings

1. **Enable GitHub Pages:**
   - Go to **Settings → Pages** in the repository
   - Set **Source** to "GitHub Actions"
   - Save

2. **Branch:** The workflow deploys from `main` branch.

### How base-path handling works

- The Vite config uses `base: process.env.PAGES_BASE || '/'`.
- Locally (no env var): `base: '/'` — all asset paths are `/assets/...`, `/favicon.svg`, etc. Works correctly in dev server.
- In the GitHub Actions workflow: `PAGES_BASE=/qwen-outpost/` — all paths become `/qwen-outpost/assets/...`, etc. Works correctly at the GitHub Pages URL.

This dual-config approach means localhost development is unaffected by the Pages configuration.

### Subpath-safe asset loading

All runtime asset URLs (sprite sheets, items, buildings) use `import.meta.env.BASE_URL + 'assets/relay-seven'` constructed at module load time. Vite replaces `import.meta.env.BASE_URL` with the configured base path at build time (`/` locally, `/qwen-outpost/` in production), so sprites load correctly regardless of deployment subpath. Hardcoded root-relative strings like `'/assets/relay-seven'` would fail under subpath deployment and have been eliminated.

### HTML template handling

Vite automatically rewrites root-relative paths (`/favicon.svg`, `/src/main.tsx`) in `index.html` and `showcase.html` during build. These files are processed as Vite HTML entry points, so the `base` option applies correctly.

### showcase.html

`showcase.html` is a developer-only Visual Showcase / Asset Atlas. It is included in the Pages artifact for convenience. It is never linked from the main game and has no impact on production gameplay. Excluding it from the artifact is optional but would require removing it from the Vite `rollupOptions.input` config.

### Manual deployment

To trigger a manual deployment without pushing to `main`:
- Go to **Actions → Deploy to GitHub Pages → Run workflow**
- Or run: `gh workflow run pages.yml`
