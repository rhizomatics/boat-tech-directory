// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";

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
        { label: "News, Education and Reference", link: "/education/" },
        { label: "Contributing", link: "/contributing/" },
      ],
    }),
  ],
});
