// Gives each directory entry (list item) a stable anchor id, so Pagefind's
// sub-result splitting (enabled by Starlight's search UI) can key off
// individual entries instead of collapsing every match on a page — or within
// one heading section — into a single result. Pagefind treats any element
// with an `id` as an anchor boundary, not just headings.
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import GithubSlugger from "github-slugger";

export default function rehypeEntryIds() {
  return (tree) => {
    const slugger = new GithubSlugger();
    visit(tree, "element", (node) => {
      if (node.tagName !== "li" || node.properties?.id) return;
      let link;
      visit(node, "element", (child) => {
        if (child.tagName === "a" && !link) link = child;
      });
      const text = toString(link ?? node).trim();
      if (!text) return;
      node.properties.id = slugger.slug(text.slice(0, 60));
    });
  };
}
