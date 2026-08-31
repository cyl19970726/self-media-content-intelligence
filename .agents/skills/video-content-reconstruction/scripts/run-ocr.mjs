#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cacheRoot = join(tmpdir(), "self-media-swift-module-cache-v1");
const clangCache = join(cacheRoot, "clang");
const swiftCache = join(cacheRoot, "swift");
mkdirSync(clangCache, { recursive: true });
mkdirSync(swiftCache, { recursive: true });

const result = spawnSync("swift", [join(scriptDir, "ocr-frames.swift"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    CLANG_MODULE_CACHE_PATH: clangCache,
    SWIFT_MODULECACHE_PATH: swiftCache
  }
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
