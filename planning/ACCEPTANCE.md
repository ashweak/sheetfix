# Acceptance matrix (plan §13) — evidence as of 2026-11-17

Unit = `tests/unit/core.test.mjs` (node:test, 26 tests). E2E = `tests/browser/smoke.mjs` (Playwright, Chromium, 10 steps). All passing at release.

| Area | Evidence | Status |
|---|---|---|
| Parsing | Unit: quoted delimiters, escaped quotes, multiline, record vs line, BOM, CRLF/LF, semicolon/tab, detection, no header, repeated/blank headers | PASS |
| Validation | Unit: malformed quotes, ragged rows (block/pad/remove/expand), empty file, header-only, invalid UTF-8, column/cell/record limits. E2E: invalid UTF-8 message | PASS |
| Text integrity | Unit: `000123`, `+639…`, `1E10`, 20-digit IDs, dates, formula text, accents, emoji unchanged | PASS |
| Cleaning | Unit: selected columns only, counts, source untouched, no compounding, all rule types. E2E: apply/undo/redo | PASS |
| Duplicates | Unit: separator collision, blank keys, identical vs conflict, policy gating, source order, normalization doesn't rewrite. E2E: review + confirm | PASS |
| Comparison | Unit + E2E: Added/Removed/Changed/Unchanged/Excluded, both invariants, duplicate keys never matched | PASS |
| Normalization | Unit: exact default; trim/case/numeric only when enabled; blank ≠ 0 | PASS |
| Export | Unit: round trip, single empty column, safe vs exact, plain-number option, filenames. E2E: downloads, BOM, CRLF, protected formula | PASS |
| Concurrency | Job ids drop stale replies; cancel terminates worker (code review; manual check) | PASS (manual) |
| Privacy | E2E: no off-origin requests, no data in URLs or console across all workflows; CSP | PASS |
| UI | E2E: 360 px no page overflow on all routes, drawer nav, dialogs; keyboard: native controls, `<dialog>`, visible focus, skip link | PASS (automated + code review); manual screen-reader pass pending |
| Deployment | E2E at `/sheetfix/` subpath locally; live smoke test after Pages deploy | See release checklist |

## Performance (development container, headless Chromium)

20,000 rows × 20 columns (4.1 MiB): import preview 0.7 s · trim all columns preview (380,000 changes) 1.0 s incl. debounce · apply 0.05 s · export view 0.14 s · change-log view 0.8 s. Domain-only (Node): compare 20k vs 20k 0.18 s. Goals met on this machine; real-device numbers still to be recorded.
