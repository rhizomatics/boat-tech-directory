// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import agentready from 'starlight-agentready';
import starlightLlmsTxt from 'starlight-llms-txt';
import { unified } from "@astrojs/markdown-remark";
import rehypeEntryIds from "./src/rehype-entry-ids.mjs";
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
plugins.push(starlightLlmsTxt());

// https://astro.build/config
export default defineConfig({
  site: "https://boat-tech-directory.rhizomatics.org.uk",
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
      plugins,
      // Right-hand "On this page" panel is folded into the left nav instead (see
      // src/components/Sidebar.astro) to avoid two side rails on a link-dense directory page.
      tableOfContents: false,
      components: {
        Sidebar: "./src/components/Sidebar.astro",
        Search: "./src/components/Search.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/rhizomatics/boat-tech-directory",
        },
      ],
      sidebar: [
        { label: "Home", link: "/" },
        { label: "Social", link: "/social/" },
        { label: "Charts and Data", link: "/charts/" },
        { label: "Open Source Projects", link: "/open-source-projects/" },
        { label: "Protocols", link: "/protocols/" },
        { label: "Vendors", link: "/vendors/" },
        { label: "News", link: "/news/" },
        { label: "Education", link: "/education/" },
        { label: "Reference", link: "/reference/" },
        { label: "Index", link: "/index-of-terms/" },
        { label: "Contributing", link: "/contributing/" },
      ],
    }),
  ],
});
