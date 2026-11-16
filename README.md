# SheetFix

A browser-based tool for cleaning CSV files, finding duplicates, and comparing business data.

**Choose your file, review the fixes, and download a clean copy.**

**Live demo:** https://ashweak.github.io/sheetfix/ (noncommercial project demonstration)

SheetFix is for small retailers, online sellers and office staff who work with CSV exports — product lists, supplier price lists, customer and order exports. Every change is previewed before it happens, the imported file is never modified, and nothing leaves the device.

## Features (v1.0)

| Tool | What it does |
|---|---|
| **Clean a file** | Trim spaces, collapse repeated spaces, upper/lower case, exact whole-value replacement, header rename/reorder, remove fully empty records, missing-value / number-format / date-format checks, optional date reformatting. Rules start off, apply only to chosen columns, run in a displayed order, and are previewed (before/after, changed-cell and affected-row counts) before being applied. Undo, redo and exact reset. |
| **Find duplicates** | Exact matching on one or more key columns (optional trim / case-insensitive *matching* that never rewrites values). Blank keys are never grouped. Identical and conflicting groups are separated; conflicting groups must be reviewed before keep-first/keep-last applies. Decisions are confirmed with counts and can be undone. |
| **Compare two lists** | Baseline vs Updated with explicit key and field mapping. Added / Removed / Changed / Unchanged / Excluded results with field-level old/new values. Missing or repeated keys are excluded from one-to-one matching and must be acknowledged. Both count invariants are checked and shown. Optional per-field trim, case and numeric equivalence (10.00 = 10); blank is never zero. |
| **Export** | Cleaned file, de-duplicated file, excluded records, change log, issue report, comparison summary/results, field-level changes. UTF-8 (BOM optional, on by default), comma/semicolon/tab, CRLF, standard quoting. **Spreadsheet-safe** mode (default) protects formula-like text; **exact text** mode is available for system imports. |

## Data handling and privacy

- Files are read and processed in the browser (a same-origin Web Worker). The app sends no file contents anywhere: no backend, accounts, analytics, ads, telemetry, external scripts, remote fonts or CDNs. A Content-Security-Policy restricts all requests to the same origin.
- Work lives in tab memory only. Reload or close loses it (a best-effort warning is shown). “Clear session” releases references; it cannot guarantee forensic erasure.
- All values stay text: `000123`, `+639171234567`, `1E10`, long IDs and `01/02/2026` are never reinterpreted. Formulas are never evaluated.
- User data is always rendered as text nodes; no `innerHTML`, no `eval`.

## Import contract

UTF-8 only (strict decoding — invalid bytes stop the import with instructions). Comma, semicolon or tab delimiters, suggested by detection and confirmed with a preview. Limits: 5 MiB per file, 10 MiB for a comparison pair, 20,000 records, 100 columns, 32,000 characters per cell — enforced while parsing. Malformed quotes and ragged rows block use until the user removes the record, pads short rows, or adds columns explicitly; nothing is truncated silently. Duplicate and blank headers are preserved and shown as “Price (column 4)” / “Column 2”.

## Run locally

Requires a current Node.js LTS (22+) for the dev server and tests only; the app itself has no build step.

```bash
npm install          # dev dependency: Playwright (for browser tests)
npm run serve        # http://127.0.0.1:8080/sheetfix/
npm test             # unit tests (node:test)
npx playwright install chromium && npm run test:browser   # end-to-end smoke test
```

Serve over HTTP — opening `docs/index.html` via `file://` will not load ES modules or the worker.

## Project layout

```
docs/                    Static site (GitHub Pages source: main /docs)
  index.html, .nojekyll
  assets/css/            Responsive styles
  assets/js/core/        Parser, dataset, recipe, validation, duplicates, comparison, CSV writer
  assets/js/io/          Import adapter (bytes → dataset, limits)
  assets/js/ui/          Views, state, tables, dialogs, worker client
  assets/js/workers/     Cancellable computation worker
  samples/               Synthetic sample CSVs
tests/unit/              Domain tests (node:test)
tests/browser/           Playwright end-to-end smoke test
planning/                Development plan, decisions, acceptance matrix, release checklist
```

## Known limitations

- CSV cannot force Excel to keep leading zeros or long IDs when opened by double-click. Use *Data → From Text/CSV* and set those columns to Text (see Help in the app).
- No XLSX/ODS, Google Sheets, fuzzy matching, phone normalization or offline install in v1.
- Supported browsers: current desktop Chrome/Edge and Firefox. Mobile layouts are tested by emulation at 360 px; Android Chrome and iOS Safari have **not** yet been verified on real devices.
- Performance targets (20,000 × 20 in under five seconds) are goals; see `planning/RELEASE_CHECKLIST.md` for what has been measured.

## Reporting bugs

Please attach a **synthetic** CSV that reproduces the problem — never real customer or business records. See [SECURITY.md](SECURITY.md) for security reports.

## License

MIT for original code — see [LICENSE](LICENSE). No third-party code is shipped in `docs/`.
