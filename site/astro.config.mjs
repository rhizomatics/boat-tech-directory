// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import agentready from 'starlight-agentready';
import starlightLlmsTxt from 'starlight-llms-txt';
import { unified } from "@astrojs/markdown-remark";
import rehypeEntryIds from "./src/rehype-entry-ids.mjs";
import { sections } from "./sections.mjs";
import { copyFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// @astrojs/sitemap always names its output `sitemap-index.xml`, fanning URLs out into
// `sitemap-0.xml`, `sitemap-1.xml`, etc., with no config option to call it `sitemap.xml`.
// Some tools (Google Search Console included) expect the conventional /sitemap.xml path
// to hold the actual <url> entries, not an index pointing elsewhere. This site is small
// enough to stay on a single shard, so mirror that shard's full contents as sitemap.xml;
// if it ever grows past one shard, fall back to aliasing the index instead.
const aliasSitemap = {
  name: "alias-sitemap-xml",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const outDir = fileURLToPath(dir);
      const hasSecondShard = await access(`${outDir}/sitemap-1.xml`).then(
        () => true,
        () => false,
      );
      const source = hasSecondShard ? "sitemap-index.xml" : "sitemap-0.xml";
      await copyFile(`${outDir}/${source}`, `${outDir}/sitemap.xml`);
    },
  },
};

// AgentReady submits the built site to an external indexing webhook on every
// `astro:build:done`, consuming one of a limited monthly quota of refreshes. Only run it
// from the GitHub Actions publish workflow (gated there via AGENTREADY_SUBMIT), never on
// local/dev builds or CI builds for pull requests.
const plugins = [];
if (process.env.AGENTREADY_SUBMIT === "true") {
  plugins.push(agentready({ domain: "boat-tech-directory.rhizomatics.org.uk" }));
}
// llms.txt by default only links the full/small corpus dumps; list each section's
// Markdown twin (src/pages/[...slug].md.ts) and the JSON export too, so an agent can
// fetch just the part it needs. Absolute against the public site, like directory.json.
const site = "https://boat-tech-directory.rhizomatics.org.uk";
const sectionLinks = (list, depth = 0) =>
  list.flatMap(({ label, slug, description, children = [] }) => [
    `${"  ".repeat(depth)}- [${label}](${site}/${slug}.md): ${description}`,
    ...sectionLinks(children, depth + 1),
  ]);
const llmsDetails = [
  "Each entry is a link with a one-line description, grouped by section and category. Each section is available as Markdown:",
  sectionLinks(sections).join("\n"),
  `For structured lookups, [directory.json](${site}/directory.json) lists every entry with its name, link, description, section and category.`,
  `[signalk-plugins.json](${site}/signalk-plugins.json) lists every SignalK server plugin and webapp in the SignalK App Store, with its categories, version, publish date, SignalK Plugin Registry score and badges. It is refreshed weekly.`,
].join("\n\n");

plugins.push(
  starlightLlmsTxt({
    details: llmsDetails,
    // The A-Z index repeats every entry from the other sections, and the SignalK Plugins
    // category pages are a large generated catalogue (signalk-plugins.json has the same data);
    // leave both out of the abridged corpus.
    exclude: ["index-of-terms", "signalk-plugins/**"],
  }),
);

// Flattened, in nav order. Only drives Starlight's prev/next page links: the nav itself is
// rendered from sections.mjs by src/components/Sidebar.astro.
const sidebarLinks = (list) =>
  list.flatMap(({ label, slug, children = [] }) => [{ label, link: `/${slug}/` }, ...sidebarLinks(children)]);

// https://astro.build/config
export default defineConfig({
  site,
  base: process.env.ASTRO_BASE ?? "/",
  outDir: process.env.ASTRO_OUTDIR ?? "dist",
  // "Social Media" was renamed to "Social"; keep old inbound links/search hits working.
  redirects: {
    "/social-media/": "/social/",
    "/social_media/": "/social/",
  },
  markdown: {
    processor: unified({ rehypePlugins: [rehypeEntryIds] }),
  },
  integrations: [
    sitemap(),
    aliasSitemap,
    starlight({
      title: "Boat Tech Directory",
      description:
        "A curated list of marine electronics, NMEA, SignalK, OpenCPN and other open source boat tech projects, vendor hardware and software, blogs and forums.",
      favicon: "/favicon.svg",
      customCss: ["./src/styles/custom.css"],
      // Starlight has no built-in og:image option; link-preview crawlers (iMessage,
      // Slack, etc.) fall back to guessing an icon from the host when this is absent.
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content:
              `${site}/images/social-preview.jpg`,
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:width", content: "1536" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:height", content: "1024" },
        },
        {
          tag: "meta",
          attrs: { name: "twitter:card", content: "summary_large_image" },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content:
              `${site}/images/social-preview.jpg`,
          },
        },
      ],
      plugins,
      // Right-hand "On this page" panel is folded into the left nav instead (see
      // src/components/Sidebar.astro) to avoid two side rails on a link-dense directory page.
      tableOfContents: false,
      components: {
        Sidebar: "./src/components/Sidebar.astro",
        Search: "./src/components/Search.astro",
        Head: "./src/components/Head.astro",
        PageTitle: "./src/components/PageTitle.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/rhizomatics/boat-tech-directory",
        },
      ],
      // Generated from sections.mjs, shared with the home page's "Sections" list.
      sidebar: [{ label: "Home", link: "/" }, ...sidebarLinks(sections)],
    }),
  ],
});
