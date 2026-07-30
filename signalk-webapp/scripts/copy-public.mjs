#!/usr/bin/env node
// Copies the Astro site's SignalK-targeted build (../site/dist-signalk, built with
// base=/@rhizomatics/signalk-boat-tech-directory-plugin to match how the SignalK server
// mounts this package) into public/, which is what gets published to npm.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(packageDir, "../site/dist-signalk");
const publicDir = resolve(packageDir, "public");

if (!existsSync(distDir)) {
  throw new Error(`${distDir} not found — run "npm run build:signalk" in site/ first`);
}

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(distDir, publicDir, { recursive: true });
