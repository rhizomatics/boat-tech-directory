# Boat Tech Directory — SignalK Webapp

[![npm version](https://img.shields.io/npm/v/@rhizomatics/signalk-boat-tech-directory-plugin.svg)](https://www.npmjs.com/package/@rhizomatics/signalk-boat-tech-directory-plugin)

An offline copy of the [Boat Tech Directory](https://boat-tech-directory.rhizomatics.org.uk)
— a curated directory of marine electronics, NMEA, SignalK, OpenCPN and other open source boat
tech projects, vendor hardware and software, blogs and forums — packaged as a
[SignalK server webapp](https://demo.signalk.org/documentation/develop/webapps/webapps.html).

Once installed it shows up as a "Boat Tech Directory" tile on the server's Webapps page. There
is no configuration: the whole directory is served locally from static files, so it works with
no internet connection.

## Install

From the SignalK server's Admin UI, open the **Appstore** and search for "Boat Tech Directory",
or install directly:

```
npm install @rhizomatics/signalk-boat-tech-directory-plugin
```

(run from the server's SignalK data directory, e.g. `~/.signalk`), then restart the server.

## Development

The content here is a build output, not hand-edited. It's generated from the
[`site/`](../site) Astro project, which in turn is generated from the repo's root
[`README.md`](../README.md). To refresh `public/` from the current README:

```
npm run build
```
