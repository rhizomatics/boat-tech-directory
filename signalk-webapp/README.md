# Boat Tech Directory

[![npm version](https://img.shields.io/npm/v/@rhizomatics/signalk-boat-tech-directory-plugin.svg)](https://www.npmjs.com/package/@rhizomatics/signalk-boat-tech-directory-plugin)
[![npm downloads](https://img.shields.io/npm/dm/@rhizomatics/signalk-boat-tech-directory-plugin.svg)](https://www.npmjs.com/package/@rhizomatics/signalk-boat-tech-directory-plugin)


An offline copy of the [Boat Tech Directory](https://boat-tech-directory.rhizomatics.org.uk)
— a curated directory of marine electronics, NMEA, SignalK, OpenCPN and other open source boat tech projects, vendor hardware and software, blogs and forums — packaged as an offline and searchable
[SignalK server webapp](https://demo.signalk.org/documentation/develop/webapps/webapps.html) to make it easier to find information when on your boat.

Once installed it shows up as a **Boat Tech Directory** tile on the server's Webapps page. There is no configuration: the whole directory is served locally from downloaded files, so it can be browsed and searched with no internet connection (until of course you click a link).

## Install

From the SignalK server's Admin UI, open the **Appstore** and search for "Boat Tech Directory", or install directly:

```
npm install @rhizomatics/signalk-boat-tech-directory-plugin
```

(run from the server's SignalK data directory, e.g. `~/.signalk`), then restart the server.

## Removal

Uninstall from the SignalK Admin UI. There is no additional data or configuration to remove.

## Suggesting Links or Corrections

See the [Contribution Guidelines](https://github.com/rhizomatics/boat-tech-directory?tab=contributing-ov-file). This can be via either a Pull Request or Issue on Github.

## Techie Stuff

The main list is in a format known as an `awesome-list`, formatted as a single `README.md`. A build process turns this into a more navigable and less techie web site using *Astro Starlight*, and then packaged as a npm plugin to offer as a SignalK offline webapp. Links are automatically validated as part of the build.
