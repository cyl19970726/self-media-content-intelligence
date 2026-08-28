import fs from "node:fs";
import path from "node:path";

const configuredRoot = process.env.SIGNAL_ROOM_EVIDENCE_ROOT;

if (!configuredRoot) {
  console.error("SIGNAL_ROOM_EVIDENCE_ROOT is required for the external Evidence test suite.");
  process.exit(1);
}

const root = path.resolve(configuredRoot);
const casRoot = path.join(root, "sha256");
const compatibilityView = path.join(root, "view", "artifacts");

if (!path.isAbsolute(configuredRoot) || !fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`External Evidence root is not an existing absolute directory: ${configuredRoot}`);
  process.exit(1);
}

if (!fs.statSync(casRoot, { throwIfNoEntry: false })?.isDirectory() || !fs.statSync(compatibilityView, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`External Evidence root is incomplete: ${root}`);
  process.exit(1);
}

console.log(`External Evidence test root: ${root}`);
