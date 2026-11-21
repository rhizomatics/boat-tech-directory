// Formats one SignalK Plugins page entry (scripts/build-signalk-plugins.mjs) as Markdown.
//
// Everything here comes from npm and the SignalK Plugin Registry, which any package author
// can influence, and Astro passes raw HTML in Markdown straight through. The offline copy is
// served from the boat's SignalK server, where injected script would run with the admin
// UI's origin. So every field is validated or escaped before it reaches the page:
//
// - names and versions must match npm's own rules, or the package is skipped
// - free text is Markdown-escaped, including "<" and "&", so it can't open HTML
// - URLs must parse as http(s), and are re-serialised (which percent-encodes quotes,
//   spaces and angle brackets) and HTML-escaped into attributes
import { faviconFor } from "./favicons.mjs";

// npm package names: optional @scope/, then URL-safe characters only. Uppercase is allowed for
// legacy packages; nothing that needs escaping in a URL path or Markdown link text.
const NPM_NAME = /^(?:@([a-z0-9][a-z0-9._~-]*)\/)?([a-z0-9][a-z0-9._~-]*)$/i;
// Semver, as npm requires on publish (and the App Store checks): digits, then an optional
// prerelease and an optional build suffix, each from [0-9A-Za-z.-]. Each is at most one group,
// so the pattern can't backtrack exponentially on a long, malformed version.
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const MAX_DESCRIPTION = 300;

/** @returns {{ scope: string | null, shortName: string } | null} */
export function parseName(name) {
  const match = typeof name === "string" ? name.match(NPM_NAME) : null;
  return match && { scope: match[1] ?? null, shortName: match[2] };
}

export const isVersion = (version) => typeof version === "string" && SEMVER.test(version);

export function parseDate(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date : null;
}

export const parseScore = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined);

// Escape everything that could start Markdown syntax or HTML in a line of free text, and
// collapse whitespace and control characters so it can't start a new block. Capped in length.
export function escapeMarkdown(text) {
  let flat = String(text).replace(/\p{Cc}/gu, " ").replace(/\s+/g, " ").trim();
  if (flat.length > MAX_DESCRIPTION) flat = `${flat.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
  return flat.replace(/[\\`*_[\]<>|#&~!]/g, "\\$&");
}

// The App Store's own keywords are shown as `webapp` and `categories` instead.
const STRUCTURAL_KEYWORDS = new Set(["signalk-node-server-plugin", "signalk-webapp", "signalk-embeddable-webapp"]);
const KEYWORD = /^[a-z0-9][a-z0-9 .+#-]{0,39}$/;

// An npm package's keywords, reduced to short lowercase tokens, for agents and structured data
// in place of free-text descriptions (see build-signalk-plugins.mjs).
export function cleanKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  const clean = keywords
    .filter((k) => typeof k === "string")
    .map((k) => k.trim().toLowerCase())
    .filter((k) => KEYWORD.test(k) && !STRUCTURAL_KEYWORDS.has(k) && !k.startsWith("signalk-category-"));
  return [...new Set(clean)].slice(0, 15);
}

export const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// npm repository fields come in several forms ("git+https://github.com/x/y.git",
// "git@github.com:x/y.git", "github:x/y"). Returns a browsable http(s) URL, or null.
export function sourceUrl(repository) {
  if (typeof repository !== "string") return null;
  const candidate = repository
    .trim()
    .replace(/^git\+/, "")
    .replace(/^git@([^:/\s]+):/, "https://$1/")
    .replace(/^github:/, "https://github.com/")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "");
  let url;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  return url.href;
}

// Category pages are two levels deep (/signalk-plugins/ais/), and public/images/ is copied
// from docs/images/ by sync-readme.mjs. Raw HTML, like sync-readme's favicons, so Astro
// doesn't try to resolve it as an optimised asset.
const icon = (file, alt) => `<img src="../../images/icons/${file}" alt="${escapeHtml(alt)}" width="16" height="16">`;

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const formatDate = (date) => dateFormat.format(date);

/**
 * @param {{ name: string, shortName: string, scope: string | null, description: string,
 *   version: string, date: Date | null, webapp: boolean, score?: number,
 *   sourceUrl: string | null }} plugin  already validated by the caller (see parseName etc.)
 */
export function formatEntry(plugin) {
  const { name, shortName, scope, description, version, date, webapp, score, sourceUrl: source } = plugin;
  // NPM_NAME leaves nothing to encode; the scope's "@" is valid in a URL path.
  const npmUrl = `https://www.npmjs.com/package/${name}`;
  const facts = [
    webapp ? "webapp" : null,
    `v${version}`,
    date ? `updated ${formatDate(date)}` : null,
    score === undefined ? "not yet scored" : `score ${score}`,
  ].filter(Boolean);
  const text = description ? ` - ${escapeMarkdown(description)}` : "";
  const publisher = scope ? ` Published by ${escapeMarkdown(scope)}.` : "";
  let link = "";
  if (source) {
    const host = faviconFor(source);
    const content = host ? icon(host.icon, `Source on ${host.site}`) : "Source";
    link = ` <a href="${escapeHtml(source)}">${content}</a>`;
  }
  return `- ${icon("npm.svg", "")} [${escapeMarkdown(shortName)}](${npmUrl})${text} *(${facts.join(", ")})*${publisher}${link}`;
}
