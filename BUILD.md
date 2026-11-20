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

[mise](https://mise.jdx.dev) installs the tool versions in `mise.toml` (node, npm, uv, prek, lychee):

```bash
mise install
prek install
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

1. `sync-readme`: `scripts/sync-readme.mjs` wipes `src/content/docs/` and regenerates a page per README section. It converts GitHub alerts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`…, with an optional bold first line as the title) into Starlight asides, so call-outs render on both GitHub and the site. Markdown links to `https://boat-tech-directory.rhizomatics.org.uk/…` become relative links, so they also work in the SignalK plugin; `contributing.md` keeps its absolute badge snippet. It also generates the contributing page from `contributing.md`, the home page from the README intro, and the 404 page, and copies `docs/images/`. It adds a favicon from `docs/images/icons/` in front of every link to a known host (GitHub, GitLab, Codeberg, npm, YouTube, Facebook, Wikipedia, PyPI, Substack); the mapping is `FAVICONS` in `src/favicons.mjs`, shared with the SignalK Plugins pages. `src/styles/custom.css` keeps these icons inline. Don't put icons in `README.md` itself.
2. `build-spreadsheets`: `scripts/build-spreadsheets.mjs` reads `spreadsheets/*.xlsx` and writes:
   - the Downloads section: an index page `downloads` plus `downloads/example-checklists`, `downloads/navigation-templates` and `downloads/nmea-wifi-gateways`
   - PDFs into `public/downloads/`: one per checklist, all checklists combined, and the tidal planner, which takes its column widths, shading and row heights from the spreadsheet
   - copies of the `.xlsx` files, also into `public/downloads/`
3. `build-signalk-plugins`: `scripts/build-signalk-plugins.mjs` fetches every SignalK plugin and webapp from npm (the same keyword searches the SignalK App Store uses) and joins on scores from the [SignalK Plugin Registry](https://signalk.org/signalk-plugin-registry/). It writes:
   - `signalk-plugins`, an index of categories, and a page per App Store category under `signalk-plugins/`, plus an "Official" page for `@signalk/` packages and an "Uncategorized" page for packages with no category. Deprecated packages are left out.
   - `public/signalk-plugins.json`, the same data with npm keywords, badges and test status, for agents (linked from `llms.txt`). It leaves out package descriptions, which any npm author controls, to keep prompt injection away from agents. For the same reason the category pages aren't listed in `llms.txt`, and are dropped from `llms-small.txt` and `llms-full.txt` (`trimLlmsFull` in `astro.config.mjs`).
   - `generated/signalk-plugins.json`, unpublished and with descriptions, for the pages' schema.org JSON-LD (`src/components/Head.astro`)

   The npm and registry data is untrusted, and the offline copy is served from the boat's SignalK server, so `src/signalk-format.mjs` validates names, versions and URLs and escapes all free text before it reaches a page. `npm test` (`scripts/check-signalk-format.mjs`, also run by the publish workflow) feeds poisoned values through it and Astro's Markdown renderer. Categories follow the server's own rules, ported into `src/signalk-categories.mjs`, which also sets the page order used by the sidebar. Re-port it if the server's `src/categories.ts` changes. If the fetch fails, it writes a placeholder page and the build carries on. These pages aren't directory entries, so they're left out of the A–Z index, `directory.json` and `llms-small.txt`.
4. `build-terms-index`: `scripts/build-terms-index.mjs` builds the A–Z index page from every directory entry.

The section list, in order, lives in `site/sections.mjs`. Both the sidebar (`astro.config.mjs`) and the home page's "Sections" list are generated from it, so add or rename a section there. A section's `children` appear indented under it in the sidebar, and can nest further. A child with `heading` is shown under that heading of its parent's outline instead, and the parent's outline stays open while you're on any page below it, as SignalK Plugins is under Open Source Projects' SignalK heading. The nav is rendered by `src/components/Sidebar.astro`; the home page lists top-level sections only.

### Publishing

`.github/workflows/publish.yml` runs on every push and pull request to `main`. It:

1. runs `awesome-lint` on `README.md`
2. runs `npm ci && npm run build` in `site/`
3. on pushes to `main`, and on a weekly schedule (Mondays 04:17 UTC) or manual run, deploys `site/dist/` to GitHub Pages at <https://boat-tech-directory.rhizomatics.org.uk>

The weekly run refreshes the SignalK Plugins pages. The offline copy in the SignalK webapp plugin only refreshes when the plugin is released.

Builds from the publish workflow on pushes to `main` also set `AGENTREADY_SUBMIT=true`, which submits the site to the AgentReady index. That has a limited monthly quota, so local and pull request builds never submit.

### Link checking

Lychee checks links. It's a manual pre-commit stage because it is slow and hits every linked site:

```bash
prek run lychee --hook-stage manual --all-files
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

1. `npm --prefix ../site run build:signalk`: the normal site build (including all the pre-build steps above), with `ASTRO_BASE=/@rhizomatics/signalk-boat-tech-directory-plugin` and output to `site/dist-signalk/`. It also sets `SIGNALK_PLUGIN_BUILD=true`, which leaves out content recommending the plugin: the home page hero (`src/components/PageTitle.astro`) and a line on the SignalK Plugins index page.
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
