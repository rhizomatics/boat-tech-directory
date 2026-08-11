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

// README uses raw HTML `<img src="docs/images/...">` for inline favicons (e.g. the
// GitHub/YouTube icons next to blog links). Astro's asset pipeline only optimizes/rewrites
// markdown-syntax `![]()` images, not raw HTML, so these need a literal path that resolves
// from wherever the generated page actually lives — `public/images/...` (raw, unhashed,
// works the same under either `base`) reached via a plain relative `../` climb, not the
// `src/assets` import path used for the markdown-syntax logo below.
function rewriteImagePaths(markdown, depth) {
  return markdown.replaceAll("docs/images/", "../".repeat(depth) + "images/");
}

const outDir = resolve(siteDir, "src/content/docs");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Starlight already renders the frontmatter `title` as the page's h1, so a leading
// `#`/`##` heading carried over from the README/contributing source would duplicate it.
function stripLeadingHeading(markdown) {
  return markdown.replace(/^#{1,2}\s+.*\n+/, "");
}

function writePage(slug, title, description, body, { depth = 1 } = {}) {
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    "---",
    "",
    `<!-- Generated from ../../../../README.md by scripts/sync-readme.mjs — do not edit directly. -->`,
    "",
  ].join("\n");
  const processed = stripLeadingHeading(rewriteImagePaths(convertAdmonitions(body), depth));
  writeFileSync(resolve(outDir, `${slug}.md`), frontmatter + processed + "\n");
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
    title: "Standards and Protocols",
    description: "NMEA, Seatalk, SAE and other marine networking standards.",
  },
  {
    marker: "vendors",
    slug: "vendors",
    title: "Vendors",
    description: "Hardware and software vendors, and specialist consultants.",
  },
    {
    marker: "news",
    slug: "news",
    title: "News",
    description: "News",
  },
  {
    marker: "education",
    slug: "education",
    title: "Education",
    description: "Education sites and vendors.",
  },
    {
    marker: "reference",
    slug: "reference",
    title: "Reference",
    description: "Reference material, including checklists.",
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
writePage(
  "contributing",
  "Contributing",
  "How to contribute to the Boat Tech Directory.",
  contributing,
  { depth: 1 },
);

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
  { depth: 0 },
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
