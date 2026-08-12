// Recomputes Pagefind's `sub_results` (the deep-linked snippets shown nested
// under a page's search result) without Pagefind's own hard-coded
// restriction to splitting only on `h1`-`h6` anchors. Our directory pages
// mark up every entry with `<li id="...">` (see rehype-entry-ids.mjs) so
// that Pagefind can locate matches per-entry, but Pagefind's built-in
// sub_results calculation still only surfaces heading-level sections
// (https://pagefind.app/docs/sub-results/#retrieving-sub-results-using-the-javascript-api).
//
// This is a straight port of Pagefind's own `calculate_sub_results` /
// `build_excerpt` (MIT licensed, https://github.com/Pagefind/pagefind,
// pagefind_web_js/lib/sub_results.ts + excerpt.ts), with the `/h\d/` element
// filter removed so any anchor with text — including our `<li>` entries —
// can start a new sub result.

function calculateExcerptRegion(wordPositions, excerptLength) {
  if (wordPositions.length === 0) return 0;

  const words = [];
  for (const word of wordPositions) {
    words[word.location] = (words[word.location] || 0) + word.balanced_score;
  }
  if (words.length <= excerptLength) return 0;

  let densest = words.slice(0, excerptLength).reduce((sum, a) => sum + (a || 0), 0);
  let workingSum = densest;
  let densestAt = [0];
  for (let i = 0; i < words.length; i++) {
    const boundary = i + excerptLength;
    workingSum += (words[boundary] ?? 0) - (words[i] ?? 0);
    if (workingSum > densest) {
      densest = workingSum;
      densestAt = [i];
    } else if (workingSum === densest && densestAt[densestAt.length - 1] === i - 1) {
      densestAt.push(i);
    }
  }
  return densestAt[Math.floor(densestAt.length / 2)];
}

function buildExcerpt(content, start, length, locations, notBefore, notFrom) {
  const isZwsDelimited = content.includes("\u200B");
  const fragmentWords = isZwsDelimited ? content.split("\u200B") : content.split(/[\r\n\s]+/g);

  const endcap = notFrom ?? fragmentWords.length;
  const startcap = notBefore ?? 0;
  if (endcap - startcap < length) length = endcap - startcap;
  if (start + length > endcap) start = endcap - length;
  if (start < startcap) start = startcap;

  const joiner = isZwsDelimited ? "" : " ";
  const plain_excerpt = fragmentWords.slice(start, start + length).join(joiner).trim();

  for (const word of locations) {
    if (fragmentWords[word]?.startsWith("<mark>")) continue;
    fragmentWords[word] = `<mark>${fragmentWords[word]}</mark>`;
  }
  const excerpt = fragmentWords.slice(start, start + length).join(joiner).trim();

  return { excerpt, plain_excerpt };
}

export function calculateEntrySubResults(fragment, excerptLength = 30) {
  const effectiveUrl = fragment.meta?.url || fragment.url;
  const anchors = (fragment.anchors ?? [])
    .filter((a) => a.text && /\S/.test(a.text))
    .sort((a, b) => a.location - b.location);

  const results = [];
  let currentAnchorPosition = 0;
  let currentAnchor = {
    title: fragment.meta?.title,
    url: effectiveUrl,
    weighted_locations: [],
    locations: [],
    excerpt: "",
    plain_excerpt: "",
  };

  const addResult = (endRange) => {
    if (!currentAnchor.locations.length) return;
    const relativeWeightedLocations = currentAnchor.weighted_locations.map((l) => ({
      weight: l.weight,
      balanced_score: l.balanced_score,
      location: l.location - currentAnchorPosition,
    }));
    const excerptStart =
      calculateExcerptRegion(relativeWeightedLocations, excerptLength) + currentAnchorPosition;
    const excerptLen = endRange
      ? Math.min(endRange - excerptStart, excerptLength)
      : excerptLength;
    const excerpts = buildExcerpt(
      fragment.content ?? "",
      excerptStart,
      excerptLen,
      currentAnchor.locations,
      currentAnchorPosition,
      endRange
    );
    currentAnchor.excerpt = excerpts.excerpt;
    currentAnchor.plain_excerpt = excerpts.plain_excerpt;
    results.push(currentAnchor);
  };

  for (const word of fragment.weighted_locations ?? []) {
    if (!anchors.length || word.location < anchors[0].location) {
      currentAnchor.weighted_locations.push(word);
      currentAnchor.locations.push(word.location);
      continue;
    }

    let nextAnchor = anchors.shift();
    addResult(nextAnchor.location);
    while (anchors.length && word.location >= anchors[0].location) {
      nextAnchor = anchors.shift();
    }

    let anchoredUrl = effectiveUrl;
    try {
      const urlIsFq = /^((https?:)?\/\/)/.test(anchoredUrl);
      if (urlIsFq) {
        const fqUrl = new URL(anchoredUrl);
        fqUrl.hash = nextAnchor.id;
        anchoredUrl = fqUrl.toString();
      } else {
        const withSlash = /^\//.test(anchoredUrl) ? anchoredUrl : `/${anchoredUrl}`;
        const fqUrl = new URL(`https://example.com${withSlash}`);
        fqUrl.hash = nextAnchor.id;
        anchoredUrl = fqUrl.toString().replace(/^https:\/\/example\.com/, "");
      }
    } catch {
      // Keep the un-anchored URL if it couldn't be parsed.
    }

    currentAnchorPosition = nextAnchor.location;
    currentAnchor = {
      title: nextAnchor.text,
      url: anchoredUrl,
      anchor: nextAnchor,
      weighted_locations: [word],
      locations: [word.location],
      excerpt: "",
      plain_excerpt: "",
    };
  }
  addResult(anchors[0]?.location);

  return results;
}
