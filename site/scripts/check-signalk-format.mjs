#!/usr/bin/env node
// Regression check for ../src/signalk-format.mjs: feeds poisoned npm/registry values through
// the real formatter and Astro's Markdown renderer, and fails if the HTML contains anything
// but the expected tags and attributes, or a link that isn't http(s). Run by `npm test` and
// the publish workflow.
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import * as f from "../src/signalk-format.mjs";
const md = await createMarkdownProcessor();
const base = { name: "x", shortName: "x", scope: null, description: "d", version: "1.0.0", date: null, webapp: false, score: 50, sourceUrl: null };
const evilUrls = [
  'https://github.com/a/b" onmouseover="alert(1)',
  "https://evil.example/a <img src=x onerror=alert(1)>",
  "javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,<script>alert(1)</script>",
  "git+javascript:alert(1)", "https://github.com/a/b'><script>alert(1)</script>", "https://user:pw@github.com/a",
  "https://evil.example/)<img src=x onerror=alert(1)>",
];
const evilText = [
  "<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "&lt;script&gt;", "[click](javascript:alert(1))",
  "![x](https://evil/x.png)", "`<b>`", "<!-- -->", "line1\n\n<script>alert(1)</script>", ":::danger\nboom\n:::",
  "a | b", "x".repeat(1000), "\u0000<svg onload=alert(1)>",
];
let bad = 0;
const check = async (label, plugin) => {
  const html = (await md.render(f.formatEntry(plugin))).code;
  // Real tags only (escaped text shows as &#x3C; and never matches "<").
  const problems = [];
  for (const [, tag, attrs] of html.matchAll(/<(\w+)([^>]*)>/g)) {
    if (!["ul", "li", "a", "img", "em"].includes(tag)) problems.push(`tag <${tag}>`);
    for (const [, attr, value] of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (!["href", "src", "alt", "width", "height"].includes(attr)) problems.push(`attr ${attr}`);
      if (attr === "href" && !/^https?:\/\//.test(value)) problems.push(`href ${value}`);
      if (attr === "src" && !value.startsWith("../../images/icons/")) problems.push(`src ${value}`);
    }
    const stray = attrs.replace(/([\w-]+)="[^"]*"/g, "").trim();
    if (stray) problems.push(`stray ${stray}`);
  }
  if (problems.length) { bad++; console.log("FAIL", label, problems.map(String), "\n", html); }
};
for (const u of evilUrls) await check(`url ${u}`, { ...base, sourceUrl: f.sourceUrl(u) });
for (const t of evilText) await check(`desc ${t.slice(0, 40)}`, { ...base, description: t });
for (const t of evilText) await check(`scope ${t.slice(0, 40)}`, { ...base, scope: t });
const expect = (label, actual, wanted) => {
  if (actual !== wanted) { bad++; console.log("FAIL", label, JSON.stringify(actual), "!==", JSON.stringify(wanted)); }
};
for (const n of ["<b>x</b>", "x)](javascript:alert(1)", "@<s>/b", "a b", "", null]) expect(`name ${n}`, f.parseName(n), null);
expect("name @a/b", JSON.stringify(f.parseName("@a/b")), JSON.stringify({ scope: "a", shortName: "b" }));
for (const v of ["1.0.0<script>", "1.0", "", undefined]) expect(`version ${v}`, f.isVersion(v), false);
expect("version prerelease", f.isVersion("1.0.0-beta.1+build"), true);
expect("version long malformed", f.isVersion(`1.0.0-${"a-".repeat(50000)}!`), false);
for (const u of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "data:text/html,x", "git+javascript:alert(1)", "https://user:pw@github.com/a"])
  expect(`url ${u}`, f.sourceUrl(u), null);
expect("url git+https", f.sourceUrl("git+https://github.com/a/b.git"), "https://github.com/a/b");
expect("url ssh", f.sourceUrl("git@github.com:a/b.git"), "https://github.com/a/b");

if (bad) {
  console.error(`signalk-format: ${bad} check(s) failed`);
  process.exit(1);
}
console.log("signalk-format: poisoned input renders safely");
