#!/usr/bin/env node
/**
 * QA evidence verifier.
 *
 * For every TICKED item in QA_CHECKLIST.md that declares an evidence
 * file (format: "→ evidence-type: relative/path.ext"), verifies the
 * file actually exists on disk and is non-empty. Catches the case
 * where a checkbox was ticked but the evidence wasn't saved.
 *
 * Exits non-zero on the first missing file. Lists every gap.
 */

import { readFileSync, existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKLIST = resolve(ROOT, "QA_CHECKLIST.md");

if (!existsSync(CHECKLIST)) {
  console.error(`QA_CHECKLIST.md not found at ${CHECKLIST}`);
  process.exit(1);
}

const content = readFileSync(CHECKLIST, "utf8");
const lines = content.split("\n");

// Accepted evidence prefixes. Anything after the '→' that matches one
// of these is verified. Others are ignored (for "manual" items that
// don't need a file — tick at your own risk).
const EVIDENCE_PREFIXES = [
  "screenshot:",
  "snapshot:",
  "db-query:",
  "event-log:",
  "log:",
];

const ITEM_RE = /^\s*-\s+\[([ xX])\]\s+(.+?)\s*$/;

const missing = [];
let ticked = 0;
let withEvidence = 0;

for (const line of lines) {
  const m = line.match(ITEM_RE);
  if (!m) continue;
  const done = /[xX]/.test(m[1]);
  if (!done) continue;
  ticked += 1;

  const rest = m[2];
  const arrow = rest.indexOf("→");
  if (arrow === -1) continue; // manual item — no file to verify

  const evidenceRaw = rest.slice(arrow + 1).trim();
  const knownPrefix = EVIDENCE_PREFIXES.find((p) =>
    evidenceRaw.toLowerCase().startsWith(p)
  );
  if (!knownPrefix) continue;

  const path = evidenceRaw.slice(knownPrefix.length).trim();
  const abs = resolve(ROOT, path);
  if (!existsSync(abs)) {
    missing.push({ line: rest, path });
    withEvidence += 1;
    continue;
  }
  try {
    const stats = statSync(abs);
    if (stats.size === 0) {
      missing.push({ line: rest, path, reason: "empty" });
    }
  } catch {
    missing.push({ line: rest, path, reason: "unreadable" });
  }
  withEvidence += 1;
}

console.log("");
console.log(`Checked ${ticked} ticked items (${withEvidence} with evidence refs).`);

if (missing.length === 0) {
  console.log("\x1b[32mAll declared evidence files exist and are non-empty.\x1b[0m");
  console.log("");
  process.exit(0);
}

console.log(
  `\x1b[31m\x1b[1m${missing.length} evidence file${missing.length === 1 ? "" : "s"} missing or empty:\x1b[0m`
);
console.log("");
for (const m of missing) {
  console.log(`  \x1b[31m✗\x1b[0m ${m.line}`);
  console.log(`    expected: ${m.path}${m.reason ? `  (${m.reason})` : ""}`);
}
console.log("");
process.exit(1);
