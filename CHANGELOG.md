# Changelog

## 1.0.0 — 2026-11-17

First release, implementing the SheetFix Final Development Plan v1.0.

- Import: strict UTF-8 (optional BOM), comma/semicolon/tab with suggested detection and preview, quote-aware parser with record/line tracking, limits enforced while parsing, blocking structural issues with explicit remove/pad/expand decisions, duplicate/blank header preservation.
- Clean: nine rules plus header editing, scoped to selected columns, fixed displayed order, before/after preview with counts, atomic apply, undo/redo/reset from the immutable source.
- Duplicates: collision-safe composite keys, missing-key exclusion, identical vs conflicting groups, review-gated keep-first/keep-last, confirmation and undo.
- Compare: explicit key/field mapping, optional per-field normalization, exclusion of missing and repeated keys with acknowledgement, both count invariants shown.
- Export: eight outputs, UTF-8/BOM/delimiter/CRLF/header options, spreadsheet-safe (default) and exact-text modes.
- Same-origin worker with progress, cancellation and stale-reply protection; Content-Security-Policy; responsive layout down to 360 px.
