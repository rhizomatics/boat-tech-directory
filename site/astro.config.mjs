// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import agentready from 'starlight-agentready';
import starlightLlmsTxt from 'starlight-llms-txt';

// https://astro.build/config
export default defineConfig({
  site: "https://boat-tech-directory.rhizomatics.org.uk",
  base: process.env.ASTRO_BASE ?? "/",
  outDir: process.env.ASTRO_OUTDIR ?? "dist",
  integrations: [
    sitemap(),
    starlight({
      title: "Boat Tech Directory",
      description:
        "A curated list of marine electronics, NMEA, SignalK, OpenCPN and other open source boat tech projects, vendor hardware and software, blogs and forums.",
      plugins: [agentready(),starlightLlmsTxt()],
      // Right-hand "On this page" panel is folded into the left nav instead (see
      // src/components/Sidebar.astro) to avoid two side rails on a link-dense directory page.
      tableOfContents: false,
      components: {
        Sidebar: "./src/components/Sidebar.astro",
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
        { label: "Charts", link: "/charts/" },
        { label: "Open Source Projects", link: "/open-source-projects/" },
        { label: "Protocols", link: "/protocols/" },
        { label: "Vendors", link: "/vendors/" },
        { label: "News", link: "/news/" },
        { label: "Education", link: "/education/" },
        { label: "Reference", link: "/reference/" },
        { label: "Contributing", link: "/contributing/" },
      ],
    }),
  ],
});
