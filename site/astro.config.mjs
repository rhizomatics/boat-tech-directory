// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import agentready from 'starlight-agentready';
import starlightLlmsTxt from 'starlight-llms-txt';
import { unified } from "@astrojs/markdown-remark";
import rehypeEntryIds from "./src/rehype-entry-ids.mjs";

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
  markdown: {
    processor: unified({ rehypePlugins: [rehypeEntryIds] }),
  },
  integrations: [
    sitemap(),
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
        { label: "Social Media", link: "/social-media/" },
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
