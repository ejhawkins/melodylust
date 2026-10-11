// Update the site's Articles Tracker from its master copy, the Google Sheet.
//
//   1. In Google Sheets: File → Download → Comma-separated values (.csv)
//   2. npm run tracker:import -- "~/Downloads/Articles Tracker - Sheet1.csv"
//
// Every row is checked first; nothing changes if any row has a problem. The script then
// lists what would be added, edited and removed. If articles would be removed, it stops so
// an old download can't wipe articles by accident; rerun with --allow-removals if intended.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { assignIds, diffTracker, parseSheetCsv, toTrackerCsv, type TrackerRow } from '../src/lib/tracker-import.ts';

const TRACKER = 'data/articles-tracker.csv';
const args = process.argv.slice(2);
const allowRemovals = args.includes('--allow-removals');
const path = args.filter(arg => !arg.startsWith('--')).join(' ').replace(/^~(?=\/)/, homedir());
const label = (row: TrackerRow) => `#${row.id} ${row.publication} · ${row.published_at} · ${row.title}`;

if (!path) {
  console.log('Usage: npm run tracker:import -- "path/to/Articles Tracker.csv" [--allow-removals]');
  process.exit(1);
}
if (!existsSync(path)) {
  console.error(`Can't find ${path}`);
  process.exit(1);
}

const sheet = parseSheetCsv(readFileSync(path, 'utf8'));
if (sheet.problems.length) {
  console.error(`\nNothing was changed — fix these in the Sheet, download it again and rerun:\n`);
  for (const { row, problem } of sheet.problems) console.error(`  Row ${row}: ${problem}`);
  process.exit(1);
}

const incoming = assignIds(sheet.rows);
const current = parseSheetCsv(readFileSync(TRACKER, 'utf8')).rows;
const diff = diffTracker(current, incoming);

console.log(`\nSheet: ${incoming.length} articles. Site now: ${current.length}.`);
console.log(`  ${diff.added.length} new · ${diff.changed.length} edited · ${diff.removed.length} removed · ${diff.unchanged} unchanged\n`);
for (const row of diff.added) console.log(`  + ${label(row)}`);
for (const { after } of diff.changed) console.log(`  ~ ${label(after)}`);
for (const row of diff.removed) console.log(`  - ${label(row)}`);

if (!diff.added.length && !diff.changed.length && !diff.removed.length) {
  console.log('Already up to date — nothing to change.');
  process.exit(0);
}
if (diff.removed.length && !allowRemovals) {
  console.error(`\nStopped: this would remove ${diff.removed.length} article(s) listed with "-" above.`);
  console.error('If the Sheet is an old download, download it again. If the removals are intended, rerun with --allow-removals.');
  process.exit(2);
}
writeFileSync(TRACKER, toTrackerCsv(incoming));
console.log(`\nUpdated ${TRACKER}. Gemini re-reads the articles on the next search.`);
