#!/usr/bin/env node
// Regenerates the docs content pages from the repo README.md so the two never drift.
// Re-run automatically before `dev`/`build` (see package.json pre* scripts).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = resolve(siteDir, "..");

const readme = readFileSync(resolve(rootDir, "README.md"), "utf8");

// Extract each `<!-- --8<-- [start:X] --> ... <!-- --8<-- [end:X] -->` marked section.
const sections = new Map();
for (const match of readme.matchAll(
  /<!-- --8<-- \[start:([\w-]+)\] -->\n([\s\S]*?)<!-- --8<-- \[end:\1\] -->/g,
)) {
  sections.set(match[1], match[2].trim());
}

// mkdocs/pymdown admonitions (`!!! type "title"` / `??? type`, 4-space-indented body)
// -> Starlight aside syntax (`:::type[title] ... :::`).
const ASIDE_TYPES = { note: "note", tip: "tip", warning: "caution", danger: "danger" };
function convertAdmonitions(markdown) {
  return markdown.replace(
    /^(?:!!!|\?\?\?\+?)\s+(\w+)(?:\s+"([^"]*)")?\n((?:(?: {4}|\t).*\n?)+)/gm,
    (_match, type, title, body) => {
      const asideType = ASIDE_TYPES[type.toLowerCase()] ?? "note";
      const dedented = body.replace(/^(?: {4}|\t)/gm, "").trimEnd();
      const header = title ? `:::${asideType}[${title}]` : `:::${asideType}`;
      return `${header}\n${dedented}\n:::\n`;
    },
  );
}

const outDir = resolve(siteDir, "src/content/docs");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

function writePage(slug, title, description, body) {
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    "---",
    "",
    `<!-- Generated from ../../../../README.md by scripts/sync-readme.mjs — do not edit directly. -->`,
    "",
  ].join("\n");
  writeFileSync(resolve(outDir, `${slug}.md`), frontmatter + convertAdmonitions(body) + "\n");
}

const pages = [
  {
    marker: "social_media",
    slug: "social-media",
    title: "Social Media",
    description: "Blogs, vlogs, video channels and forums.",
  },
  {
    marker: "charts",
    slug: "charts",
    title: "Charts",
    description: "Open and volunteer charting projects.",
  },
  {
    marker: "open-source-projects",
    slug: "open-source-projects",
    title: "Open Source Projects",
    description: "Software and firmware, including NMEA libraries.",
  },
  {
    marker: "protocols",
    slug: "protocols",
    title: "Protocols",
    description: "NMEA, Seatalk, SAE and other marine networking standards.",
  },
  {
    marker: "vendors",
    slug: "vendors",
    title: "Vendors",
    description: "Hardware and software vendors, and specialist consultants.",
  },
  {
    marker: "education",
    slug: "education",
    title: "News, Education and Reference",
    description: "News, Courses, tutorials and technical references.",
  },
];

for (const { marker, slug, title, description } of pages) {
  const body = sections.get(marker);
  if (!body) {
    throw new Error(`README.md is missing the "${marker}" --8<-- marker`);
  }
  writePage(slug, title, description, body);
}

// contributing.md is a standalone root file (not a README marker).
const contributing = readFileSync(resolve(rootDir, "contributing.md"), "utf8").trim();
writePage("contributing", "Contributing", "How to contribute to the Boat Tech Directory.", contributing);

// Home page: README's intro-text section plus the same short "Contribute" blurb and
// "Sections" link list that the old docs/index.md carried (hand-authored here, not
// worth round-tripping through a README marker for a handful of stable lines).
const introText = sections.get("intro-text");
if (!introText) {
  throw new Error(`README.md is missing the "intro-text" --8<-- marker`);
}
const homeBody = `${introText}

![Boat Tech Directory logo](../../assets/images/social-preview.jpg)

### Contribute

Contributions welcome! Read the [contribution guidelines](./contributing/) first.

## Sections

- [Social Media](./social-media/) — Blogs, vlogs, video channels and forums.
- [Charts](./charts/) — Open and volunteer charting projects
- [Open Source Projects](./open-source-projects/) — Software and firmware, including NMEA libraries
- [Protocols](./protocols/) — NMEA, Seatalk, SAE and other marine networking standards
- [Vendors](./vendors/) — Hardware and software vendors, and specialist consultants.
- [News, Education and Reference](./education/) — News, Courses, tutorials and technical references
`;
writePage(
  "index",
  "Boat Tech Directory",
  "A curated list of marine electronics, NMEA, SignalK, OpenCPN and other open source boat tech projects, vendor hardware and software, blogs and forums.",
  homeBody,
);

// Images: one copy under src/assets (Astro's optimized, base-aware asset pipeline, for
// images referenced from page content) and one copy under public/ (raw, unhashed, stable
// path — needed so the SignalK webapp package can point package.json's `appIcon` at a
// filename known ahead of build time).
const imagesSrc = resolve(rootDir, "docs/images");
for (const dest of [resolve(siteDir, "src/assets/images"), resolve(siteDir, "public/images")]) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(imagesSrc, dest, { recursive: true, filter: (src) => !src.endsWith(".DS_Store") });
}
