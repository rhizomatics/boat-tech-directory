# signalk-boat-tech-dir-plugin Development

## Release

```bash
npm login
git tag -f latest
git tag -f latest v1.0.0
git push --tags --force
npm publish --tag latest --access public
```

GitHub release

The content here is a build output, not hand-edited. It's generated from the
[`site/`](../site) Astro project, which in turn is generated from the repo's root
[`README.md`](../README.md). To refresh `public/` from the current README:

```
npm run build
```
