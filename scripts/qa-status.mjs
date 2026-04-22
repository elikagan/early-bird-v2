#!/usr/bin/env node
/**
 * QA progress checker.
 *
 * Parses QA_CHECKLIST.md. Counts:
 *   - ticked items  (- [x])
 *   - unticked items (- [ ])
 *
 * Prints a colored banner with the totals, broken down by section.
 * Exits non-zero if any items are unticked — this is the mechanical
 * bludgeon that refuses to let "QA done" be claimed while anything
 * is still open.
 *
 * Run: `node scripts/qa-status.mjs [section-filter]`
 *   e.g. `node scripts/qa-status.mjs admin` for just the admin section.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECKLIST = resolve(ROOT, "QA_CHECKLIST.md");

if (!existsSync(CHECKLIST)) {
  console.error(`QA_CHECKLIST.md not found at ${CHECKLIST}`);
  process.exit(1);
}

const filter = process.argv[2]?.toLowerCase() ?? null;
const content = readFileSync(CHECKLIST, "utf8");
const lines = content.split("\n");

const SECTION_RE = /^#{1,3}\s+(.+?)\s*$/;
const ITEM_RE = /^\s*-\s+\[([ xX])\]\s+(.+?)\s*$/;

const items = [];
let section = "(top)";

for (const line of lines) {
  const secMatch = line.match(SECTION_RE);
  if (secMatch) {
    section = secMatch[1];
    continue;
  }
  const itemMatch = line.match(ITEM_RE);
  if (itemMatch) {
    items.push({
      section,
      done: /[xX]/.test(itemMatch[1]),
      text: itemMatch[2],
    });
  }
}

const filtered = filter
  ? items.filter((i) => i.section.toLowerCase().includes(filter))
  : items;

const totals = new Map();
for (const item of filtered) {
  const bucket = totals.get(item.section) ?? { done: 0, todo: 0 };
  if (item.done) bucket.done += 1;
  else bucket.todo += 1;
  totals.set(item.section, bucket);
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let totalDone = 0;
let totalTodo = 0;
for (const [, { done, todo }] of totals) {
  totalDone += done;
  totalTodo += todo;
}
const total = totalDone + totalTodo;
const pct = total === 0 ? 0 : Math.round((100 * totalDone) / total);

console.log("");
console.log(`${BOLD}QA progress${filter ? ` — filter="${filter}"` : ""}${RESET}`);
console.log("─".repeat(60));
for (const [sec, { done, todo }] of totals) {
  const total = done + todo;
  const pct = total === 0 ? 0 : Math.round((100 * done) / total);
  const color = todo === 0 ? GREEN : done === 0 ? DIM : YELLOW;
  console.log(
    `${color}${sec.padEnd(44)} ${String(done).padStart(3)}/${String(total).padStart(3)} (${pct}%)${RESET}`
  );
}
console.log("─".repeat(60));
const bannerColor = totalTodo === 0 ? GREEN : RED;
console.log(
  `${BOLD}${bannerColor}${totalDone}/${total} done — ${totalTodo} still open (${pct}%)${RESET}`
);

if (totalTodo > 0) {
  console.log("");
  console.log(`${RED}${BOLD}QA NOT COMPLETE. Don't claim done.${RESET}`);
  console.log("");
  process.exit(1);
}

console.log("");
console.log(`${GREEN}${BOLD}All QA items ticked.${RESET}`);
console.log("");
