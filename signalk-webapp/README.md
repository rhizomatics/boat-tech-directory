# Boat Tech Directory

[![npm version](https://img.shields.io/npm/v/@rhizomatics/signalk-boat-tech-directory-plugin.svg)](https://www.npmjs.com/package/@rhizomatics/signalk-boat-tech-directory-plugin)

An offline copy of the [Boat Tech Directory](https://boat-tech-directory.rhizomatics.org.uk)
— a curated directory of marine electronics, NMEA, SignalK, OpenCPN and other open source boat tech projects, vendor hardware and software, blogs and forums — packaged as an offline
[SignalK server webapp](https://demo.signalk.org/documentation/develop/webapps/webapps.html) to make it easier to find information when on your boat.

Once installed it shows up as a "Boat Tech Directory" tile on the server's Webapps page. There is no configuration: the whole directory is served locally from static files, so it works with no internet connection (until of course you click a link).

## Install

From the SignalK server's Admin UI, open the **Appstore** and search for "Boat Tech Directory", or install directly:

```
npm install @rhizomatics/signalk-boat-tech-directory-plugin
```

(run from the server's SignalK data directory, e.g. `~/.signalk`), then restart the server.

## Techie

The main list is an `awesome-list` formatted `README.md`, which is built as a more navigable web site using *Astro Starlight*, and then packaged as a SignalK webapp. Links are automatically validated as part of the build.