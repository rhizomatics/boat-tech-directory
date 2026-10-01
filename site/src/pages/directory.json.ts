// Serves every directory entry as structured JSON at /directory.json, so agents can
// filter by section/category or look up a vendor's link without parsing Markdown lists.
// Linked from llms.txt (see astro.config.mjs).
//
// URLs are absolute against `site` (the public canonical domain), not `base`: the SignalK
// plugin build serves under a base path on the user's own server, but the canonical home
// of each entry is the public site.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { extractEntries, isDirectoryPage } from "../directory-entries.mjs";

export const GET: APIRoute = async ({ site }) => {
  const docs = (await getCollection("docs")).filter((entry) => isDirectoryPage(entry.id));

  const entries = docs.flatMap((doc) => {
    const pageUrl = new URL(`/${doc.id}/`, site);
    return extractEntries(doc.body ?? "").map(({ name, anchorId, href, description, category }) => ({
      name,
      // A few entries link elsewhere on their own page (e.g. "#nmea-interfacing").
      url: href ? new URL(href, pageUrl).href : null,
      description,
      section: doc.data.title,
      category,
      directoryUrl: new URL(`#${anchorId}`, pageUrl).href,
    }));
  });

  const body = {
    name: "Boat Tech Directory",
    description:
      "Every entry in the Boat Tech Directory: marine electronics, NMEA, SignalK, OpenCPN and other open source boat tech projects, vendors, blogs and forums.",
    homepage: new URL("/", site).href,
    license: "https://creativecommons.org/licenses/by-sa/4.0/",
    generated: new Date().toISOString(),
    count: entries.length,
    entries,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
