// Favicons for well-known hosts, keyed by registrable domain. Any link whose hostname is
// that domain or a subdomain of it (e.g. `www.youtube.com`, `foo.github.io`) gets the icon.
// The icons live in ../../docs/images/icons/. Shared by scripts/sync-readme.mjs (README
// pages) and scripts/build-signalk-plugins.mjs (SignalK Plugins pages).
export const FAVICONS = [
  ["github.com", "github.ico", "GitHub"],
  ["github.io", "github.ico", "GitHub"],
  ["gitlab.com", "gitlab.png", "GitLab"],
  ["gitlab.io", "gitlab.png", "GitLab"],
  ["codeberg.org", "codeberg.svg", "Codeberg"],
  ["npmjs.com", "npm.svg", "npm"],
  ["youtube.com", "youtube.ico", "YouTube"],
  ["youtu.be", "youtube.ico", "YouTube"],
  ["facebook.com", "facebook.ico", "Facebook"],
  ["wikipedia.org", "wikipedia.ico", "Wikipedia"],
  ["pypi.org", "pypi.ico", "PyPI"],
  ["substack.com", "substack.ico", "Substack"],
];

/** @returns {{ icon: string, site: string } | undefined} */
export function faviconFor(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return undefined;
  }
  const match = FAVICONS.find(([domain]) => host === domain || host.endsWith(`.${domain}`));
  return match && { icon: match[1], site: match[2] };
}
