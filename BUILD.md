# Build

How the Boat Tech Directory web site and the SignalK webapp plugin are built and published.

## Overview

```text
README.md, contributing.md, docs/images/ ──sync-readme.mjs──────────┐
                                                                     ├─> site/src/content/docs/*.md ─> Astro Starlight ─┬─> site/dist/         ─> GitHub Pages
~/Documents/Boat/*.numbers ─sync_spreadsheets.py─> site/spreadsheets/*.xlsx ─build-spreadsheets.mjs─┘   (+ PDFs, downloads)   └─> site/dist-signalk/ ─> signalk-webapp/public/ ─> npm
   (maintainer's Mac only)        (committed)
```

- **`README.md`** is the source of truth for the directory. It's an [awesome list](https://github.com/sindresorhus/awesome), readable on GitHub as-is. Sections marked `<!-- --8<-- [start:X] -->` … `[end:X]` each become a page.
- **`site/spreadsheets/*.xlsx`** hold tabular data: the example checklists, NMEA Wi-Fi gateway comparison and tidal planner template. Each becomes a page, plus printable PDFs and downloadable copies.
- **`site/`** is the [Astro Starlight](https://starlight.astro.build) project that turns both into the web site.
- **`signalk-webapp/`** packages a copy of the site for offline use as a [SignalK](https://signalk.org) server webapp.

Everything under `site/src/content/docs/`, `site/public/images/`, `site/public/downloads/` and `signalk-webapp/public/` is generated. Don't edit it; it's gitignored and rebuilt every time.

## Tools

[mise](https://mise.jdx.dev) installs the tool versions in `mise.toml` (node, npm, uv, pre-commit, lychee):

```bash
mise install
pre-commit install
```

## Web site

```bash
cd site
npm ci
npm run dev       # local server with live reload
npm run build     # production build into site/dist/
npm run preview   # serve site/dist/
```

`dev` and `build` first run, in order:

1. `sync-readme`: `scripts/sync-readme.mjs` wipes `src/content/docs/` and regenerates a page per README section. It also generates the contributing page from `contributing.md`, the home page from the README intro, and the 404 page, and copies `docs/images/`.
2. `build-spreadsheets`: `scripts/build-spreadsheets.mjs` reads `spreadsheets/*.xlsx` and writes:
   - the Downloads section: an index page `downloads` plus `downloads/example-checklists`, `downloads/navigation-templates` and `downloads/nmea-wifi-gateways`
   - PDFs into `public/downloads/`: one per checklist, all checklists combined, and the tidal planner, which takes its column widths, shading and row heights from the spreadsheet
   - copies of the `.xlsx` files, also into `public/downloads/`
3. `build-terms-index`: `scripts/build-terms-index.mjs` builds the A–Z index page from every directory entry.

The section list, in order, lives in `site/sections.mjs`. Both the sidebar (`astro.config.mjs`) and the home page's "Sections" list are generated from it, so add or rename a section there. A section's `children` appear indented under it in both.

### Publishing

`.github/workflows/publish.yml` runs on every push and pull request to `main`. It:

1. runs `awesome-lint` on `README.md`
2. runs `npm ci && npm run build` in `site/`
3. on pushes to `main` only, deploys `site/dist/` to GitHub Pages at <https://boat-tech-directory.rhizomatics.org.uk>

Builds from the publish workflow on `main` also set `AGENTREADY_SUBMIT=true`, which submits the site to the AgentReady index. That has a limited monthly quota, so local and pull request builds never submit.

### Link checking

Lychee checks links. It's a manual pre-commit stage because it is slow and hits every linked site:

```bash
pre-commit run lychee --hook-stage manual --all-files
```

## Spreadsheets

The `.xlsx` files are converted from the maintainer's Apple Numbers originals, listed in `site/spreadsheets/sources.json`. Converting to `.xlsx` keeps Numbers out of the build entirely, so CI only needs Node.

`site/scripts/sync_spreadsheets.py` does the conversion with [numbers-parser](https://github.com/masaccio/numbers-parser) and openpyxl. It keeps values, header rows, column widths, row heights, cell shading and bold, and stores the table title as the sheet's page header.

- It runs automatically as the `sync-spreadsheets` pre-commit hook, which stages any converted files.
- It only converts a spreadsheet when the content of its Numbers source has changed. Source hashes are kept in `sources.lock.json`, because `.xlsx` output differs byte-for-byte on every run.
- Where a source doesn't exist (anyone but the maintainer, and CI), it is skipped, so the hook is a no-op for other contributors.

To run it by hand:

```bash
cd site
npm run sync-spreadsheets                         # convert changed sources
uv run scripts/sync_spreadsheets.py --force       # convert everything
```

To add a spreadsheet, add it to `sources.json` and run the sync. Then add a page builder to `build-spreadsheets.mjs` and a sidebar entry to `astro.config.mjs`.

## SignalK webapp plugin

The plugin is published to npm as [`@rhizomatics/signalk-boat-tech-directory-plugin`](https://www.npmjs.com/package/@rhizomatics/signalk-boat-tech-directory-plugin). A SignalK server mounts it under `/@rhizomatics/signalk-boat-tech-directory-plugin/` and serves it offline.

It is the same site, built a second time with a different base path:

```bash
cd signalk-webapp
npm run build
```

This runs, in order:

1. `npm --prefix ../site run build:signalk`: the normal site build (including all the pre-build steps above), with `ASTRO_BASE=/@rhizomatics/signalk-boat-tech-directory-plugin` and output to `site/dist-signalk/`
2. `scripts/copy-public.mjs`: copies `site/dist-signalk/` into `signalk-webapp/public/`, which is what gets published

Internal links in generated pages are relative, not root-absolute, so they work under either base path. The downloads (PDFs and spreadsheets) are included, so they are available offline too.

### Releasing

Publishing is manual, from a clean checkout of `main`:

1. Bump `version` in `signalk-webapp/package.json` and commit.
2. Publish. `prepublishOnly` runs `npm run build` first, so `public/` is always fresh:

   ```bash
   cd signalk-webapp
   npm login
   npm publish --access public
   ```

3. Tag the release and create a GitHub release:

   ```bash
   git tag v$(node -p "require('./package.json').version")
   git push --tags
   ```

See [`signalk-webapp/BUILD.md`](signalk-webapp/BUILD.md) for the plugin's own notes, and its [`README.md`](signalk-webapp/README.md) for what users see in the SignalK Appstore.
