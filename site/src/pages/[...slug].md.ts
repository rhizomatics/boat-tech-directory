// Serves the raw Markdown source behind every docs page at the same path with a `.md`
// extension (e.g. `/protocols/` -> `/protocols.md`), so agents can fetch a single page's
// content directly instead of scraping rendered HTML. Complements the site-wide
// llms.txt/llms-full.txt (see astro.config.mjs) which agents use for the whole corpus.
import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection("docs");
  return docs
    .filter((entry) => entry.id !== "404")
    .map((entry) => ({
      params: { slug: entry.id },
      props: { entry },
    }));
};

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props;
  const { title, description } = entry.data;
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    ...(description ? [`description: ${JSON.stringify(description)}`] : []),
    "---",
    "",
  ].join("\n");

  return new Response(`${frontmatter}\n${entry.body ?? ""}`, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
};
