# signalk-boat-tech-dir-plugin Development

## Release

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Create a GitHub release tagged `v<version>` (mark it pre-release, or use an
   `alpha`/`beta`/`rc` tag, for a non-`latest` dist-tag).
3. [`release.yml`](../.github/workflows/release.yml) builds the webapp and *stages*
   the publish on npm via trusted publishing (OIDC, no token).
4. Approve the staged version on npmjs.com (Staged Packages tab, or
   `npm stage approve <stage-id>`) to make it live.

The content here is a build output, not hand-edited. It's generated from the
[`site/`](../site) Astro project, which in turn is generated from the repo's root
[`README.md`](../README.md). To refresh `public/` from the current README:

```
npm run build
```
