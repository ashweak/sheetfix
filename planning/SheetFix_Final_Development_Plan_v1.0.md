# SheetFix — Final Development Plan

Version 1.0 · November 15, 2026 · Prepared for Lance Agua

Status: complete planning baseline, ready for development. This document specifies intended behavior; implementation, testing, repository creation, and deployment have not been completed or verified.

## 1. Product and purpose

**SheetFix** is a browser-based CSV utility for business owners and staff who need to clean a file, find duplicate records, or compare two versions of a list.

**Promise: “Choose your file, review the fixes, and download a clean copy.”**

Initial users include small retailers updating product lists, online sellers preparing imports, and staff checking supplier/customer/order exports. The first release is general-purpose: users choose the relevant columns and rules rather than being forced into a specific inventory system.

Value hypotheses: reduce repetitive spreadsheet work, make changes visible, and prevent accidental damage to identifiers. Validate these with real tasks before claiming time savings or willingness to pay. The product assists review; it cannot establish which customer record is true or whether a supplier price is correct.

Repository: `sheetfix`. Description: “A browser-based tool for cleaning CSV files, finding duplicates, and comparing business data.” Public repository, README, and MIT license for original code; retain dependency notices. Name and brand availability remain to be checked.

## 2. First-release decisions

| Decision | V1 baseline |
|---|---|
| Main tools | Clean a file; find duplicates; compare two lists |
| Input/output | UTF-8 CSV, with optional BOM; comma/semicolon/tab delimiters |
| Platform | Responsive browser application |
| Processing | On the user's device |
| Data persistence | Session memory; explicit download for saving work |
| Accounts/backend | None |
| AI | None required |
| Paid dependencies | None required |
| Source | Public GitHub repository |
| Pages release | Noncommercial project demonstration, subject to current hosting rules |

Start with three complete workflows rather than a large collection of unreliable tools. XLSX/XLS/ODS, Google Sheets connections, multi-file merging, cloud sync, shared accounts, fuzzy name matching, phone-country conversion, advanced financial calculations, and automatic semantic corrections are deferred.

CSV carries tabular values; it does not preserve workbook styles, multiple sheets, charts, formulas as executable logic, or Excel cell types. SheetFix never evaluates formulas.

## 3. Hosting and zero-cost boundary

HTML, CSS, and JavaScript can be served as static assets. The proposed infrastructure needs no paid server, database, AI service, custom domain, or login provider. Existing equipment, internet, and development time are outside the ₱0 infrastructure target.

GitHub Pages explicitly restricts running an online business, e-commerce, or commercial SaaS, including sites primarily facilitating commercial transactions. Therefore use Pages for the noncommercial project/demo and documentation only where the actual use fits the rules. Free access or an open-source license alone does not guarantee compliance. Recheck the final intended deployment before publishing. If its operation falls within a restriction, retain GitHub for code and demo/docs and distribute the locally runnable tool or select permitted hosting; do not relabel a commercial service to bypass the rule.

The provisional project address is `https://<username>.github.io/sheetfix/`; the username and deployment are unverified. A future paid service requires a separate hosting and cost decision. No income or perpetual-free hosting guarantee is made.

## 4. Core user journeys

### A. Clean a file

1. Choose a CSV file or load synthetic sample data.
2. Confirm encoding, delimiter, and whether the first record contains headers.
3. Inspect row/column counts and structural errors.
4. Select columns and optional cleaning rules.
5. See a before/after preview, changed-cell count, and affected-row count.
6. Apply the rule set atomically, inspect results, and undo if needed.
7. Choose export settings and download a new CSV plus an optional change log.

### B. Find duplicates

1. Load a file and select one or several identifying columns.
2. Choose exact matching or explicitly enable comparison normalization.
3. Inspect duplicate groups, including conflicting non-key fields.
4. Select records to retain, or choose a clearly previewed keep-first/keep-last policy.
5. Download the retained file and, separately, excluded records if desired.

### C. Compare two lists

1. Choose a baseline file and an updated file.
2. Map their key columns and selected comparison columns explicitly.
3. Resolve or exclude invalid/duplicate keys on each side.
4. Review Added, Removed, Changed, Unchanged, and Excluded results.
5. Inspect field-level old/new values and download comparison outputs.

Use the labels “Baseline” and “Updated” consistently. “Added” means only in Updated, not a claim about when a real-world product was created. Comparison does not automatically modify either source file.

## 5. Import contract and structural validation

Initial supported limits: 5 MiB per file, 10 MiB total in a two-file comparison, 20,000 data records per file, 100 columns, and 32,000 characters per cell. These are proposed limits to validate on target hardware; lower them if testing shows memory or responsiveness problems. Enforce record/column/cell limits during parsing, not only after allocating an unlimited dataset.

Accept UTF-8, including BOM. Decode strictly; if bytes are invalid UTF-8, stop with instructions to re-export as UTF-8. Do not silently substitute replacement characters or promise automatic support for legacy encodings. File extensions alone are not proof of valid content.

Use a quoted-field parser, never `split(',')`. Support delimiters comma, semicolon, and tab. Suggest delimiter detection but require a visible preview and allow manual selection. Commas/newlines/doubled quotes inside quoted fields must parse correctly. Track CSV record number separately from physical line number because a quoted record can span lines.

Parse into arrays and assign internal column IDs. Preserve duplicate and blank header labels; show disambiguated UI labels such as “Price (column 4).” Do not silently let a parser rename headers or overwrite fields. If no header exists, create display labels Column 1, Column 2, etc.; they are not added to export unless the user selects an output header row.

Preserve every field as text initially. Disable dynamic typing. Values such as `000123`, `+639171234567`, `1E10`, long numeric IDs, and `01/02/2026` must remain exact text. The original bytes and parsed source snapshot stay unchanged in memory until the session is cleared.

Malformed quotes or ragged records block transformation/export until the user resolves them. V1 offers reselecting settings, removing a clearly previewed invalid record, or explicitly padding short records with empty trailing fields. Extra fields require a corrected file or explicit column expansion; never truncate silently. A structural exclusion is recorded and downloadable in the issue report.

Empty physical records and delimiter-only records are distinct. Display their counts and let the user choose whether to remove fully empty records. An ending line terminator must not invent an extra business record. Whitespace-only fields count as empty only under a chosen whitespace rule. An empty file is an error; a header-only file can be previewed and exported but has no data records.

## 6. Cleaning rules

Nothing mutates on file selection. Rule switches start off. Each rule is scoped to selected columns and runs in a displayed order.

| Rule | Exact behavior |
|---|---|
| Trim surrounding spaces | Remove ordinary spaces/tabs at field edges; preserve embedded text and newlines unless separately chosen |
| Collapse repeated spaces | Replace repeated ordinary spaces inside selected fields with one; no identifier columns preselected |
| Uppercase/lowercase | Explicit conversion for selected columns; warn that names/codes may be case-sensitive |
| Remove fully empty records | Apply stated empty definition; show records affected |
| Exact value replacement | Replace whole-field matches; show case/whitespace settings; no regex in V1 |
| Header editing | Rename/reorder columns with preview; detect duplicate display names |
| Missing-value check | Flag blank cells in user-selected required columns; do not fill invented values |
| Numeric-format check | Validate against an explicitly chosen decimal/grouping format without converting identifiers |
| Date-format check | Validate using a chosen source format; ambiguous dates require user choice |
| Date output formatting | Optional explicit conversion of valid calendar dates only; invalid values remain flagged |

No title-case conversion, fuzzy correction, automatic phone normalization, or removal of punctuation in V1. These can damage valid business data. Preserve accents and Unicode by default. A future Unicode normalization option must be explicit.

Run structural decisions first, then trim, collapse spaces, case conversion, exact replacement, optional date formatting, validation, and any explicit row exclusion. Show this order. Recompute the preview from the immutable source and the full recipe, so reapplying a recipe cannot accidentally compound a replacement. Review decisions are tied to dataset revision; changing cleaning rules invalidates stale duplicate/comparison results.

Money-like fields remain text. Numeric-format validation and optional comparison use canonical decimal strings rather than floating-point conversion. If numeric deltas are added later, define exact decimal arithmetic and currency/precision first.

## 7. Duplicate detection rules

The user selects one or more key columns. An exact duplicate key is equality of the complete ordered key tuple; use a collision-safe structure or length-aware encoding, not a separator that could occur in the data.

Default equality is case-sensitive, with spaces significant. Optional trim/case-insensitive matching affects matching keys only and does not rewrite output values. Display those settings above each result.

If any selected key field is blank, classify the row as “Missing key” and exclude it from automatic grouping. Never treat all blank customer emails as one customer. Fully identical rows are one duplicate category; rows sharing a key but differing elsewhere are “Conflicting records.” Conflicting records require group review before any exclusion policy is applied.

Keep-first/keep-last refers to original source record order, not an inferred latest timestamp. Show survivor and exclusion counts before confirmation. Do not merge conflicting values automatically. Retain stable row IDs and source record references for every decision. Undo restores all exclusions. Export ordering follows original order among retained rows.

## 8. Two-file comparison rules

Map baseline key column(s) to updated key column(s), plus the fields to compare. Never assume equal column position means equal meaning. Header suggestions are conveniences, not automatic approval.

Key values remain exact strings by default. Missing keys and duplicate keys on either side are excluded from one-to-one matching and presented as blockers/review items. Do not silently select the first row or create a many-to-many comparison. The user may return to the duplicate tool or explicitly exclude affected groups, and the report must show these exclusions.

For valid unique keys:

- Only in Updated: Added.
- Only in Baseline: Removed.
- In both, any selected field differs: Changed.
- In both, all selected fields agree: Unchanged.

Optional comparison normalization is explicit per field: trim, case-insensitive text, or numeric equivalence under a chosen locale. Default `10.00` and `10` are different strings; numeric equivalence can treat them as equal without changing either value. Blank is not zero. Missing mapped columns are errors, not empty cells.

Changed results show key, source record references, field, baseline value, updated value, and matching settings. Row-level summary counts and field-level change counts are separate. Mapping only a subset of fields means “Unchanged in selected fields,” not full-record identity.

Accounting invariants: baseline records = Removed + Changed + Unchanged + baseline excluded records. Updated records = Added + Changed + Unchanged + updated excluded records. Changed/Unchanged each count a matched pair once. Result order is deterministic: updated order for Added/Changed/Unchanged, baseline order for Removed.

## 9. Exports and spreadsheet compatibility

Offer cleaned CSV, retained duplicate result, excluded records CSV, comparison summary CSV, field-level changes CSV, and issue/change-log CSV. Source names become safe output filenames with suffixes, e.g. `products_cleaned.csv`; never overwrite a user's original file through browser file handles.

Output settings: UTF-8, optional BOM on by default for common spreadsheet compatibility, selected delimiter, CRLF line endings, standard CSV quoting, and explicit header inclusion. Preserve commas/quotes/newlines through quoting. Export selection changes affect a preview before download.

Default to spreadsheet-safe export: escape formula-like text beginning with `=`, `+`, `-`, `@`, tab, or carriage return, including risky leading whitespace/control variants covered by tests. Show the count and explain that protective apostrophes alter exported field text. Quoting alone does not prevent formula execution in spreadsheet programs.

Provide a separate explicit “Exact text export for system import” option with an explanation that opening it in spreadsheet software may interpret formulas. Formula cells are never executed by SheetFix. Preserve exact source text in memory; never silently modify it while parsing. Test both export paths. Legitimate negative numeric text and international phone numbers also need clear handling because safe mode may protect them as text.

CSV cannot force Excel to retain leading zeros, long identifiers, or date-like text when opened by double-clicking. Explain how to import relevant columns as Text; do not claim that quoting or a BOM solves this. V1 does not create `="000123"` formulas as a workaround. A future typed XLSX export can address this separately.

Change logs include rule, internal row/column reference, old/new text, and reason. They may contain sensitive data; downloads stay under the owner's control. Comparison reports include settings and excluded counts so results remain interpretable.

## 10. Interface and visual direction

Use a clean white/slate layout with teal as the main action color, amber for review, and red for blocking errors. Keep wording plain and actions obvious. Product-facing language says “Choose file” rather than pretending a server upload occurs.

| Screen | Key content |
|---|---|
| Home | Three tool cards, short explanation, sample-data button, local-processing notice |
| Import | Drop zone plus normal file picker, encoding/delimiter/header settings, structural preview |
| Clean | Rules panel, before/after table, counts, apply/undo/reset |
| Duplicates | Key selection, group navigator, conflict details, retain/exclude decisions |
| Compare | Two file panels, column mappings, status tabs, field-level details |
| Export | Output choice, safety mode, encoding/delimiter, download summary |
| Help/About | CSV limitations, examples, privacy, version, troubleshooting |

Desktop: compact sidebar and workspace. Mobile: drawer navigation, stacked controls, detail cards, and an internally scrolling table. Support 360 px screens without page-wide overflow. Paginate previews (default 50 rows); filters search the complete in-memory dataset, not just the visible page. Clearly show filtered versus total counts.

Use icons with text labels, visible focus, semantic form controls, accessible error summaries, keyboard-operable dialogs, sufficient contrast, and status text alongside colors. Aim for WCAG 2.2 AA on core workflows, verified with automated checks and manual keyboard review. Drag/drop must have a file-picker alternative. Large tables need accessible headers and a record-details view.

Unsaved work gets a clear reminder before reset/tool replacement and a best-effort tab-close warning. Explain that browser close/reload loses the session; do not promise the warning always appears. Navigating between tools inside the app preserves the session.

## 11. Data state and privacy

V1 stores business datasets in memory only. No background autosave, history database, account, analytics, ads, or telemetry. Store only harmless appearance preferences locally if needed. No external scripts, remote fonts, or runtime CDN dependencies.

Core model:

- SourceFile: local ID, display name, byte size, parsing settings, original bytes while session exists.
- Dataset: stable row/column IDs, ordered string cells, source record references, revision.
- Recipe: ordered rules, target columns, parameters, version.
- Preview: changes, issues, resulting revision, counts.
- DuplicateReview: chosen keys, normalization, groups, survivor decisions, dataset revision.
- Comparison: both revisions, mappings, statuses, exclusions, field differences.
- ExportManifest: app version, settings, counts, output filename.

Use immutable source data and computed working views. Undo/redo stores lightweight recipe/decision revisions; document any history cap without losing the original reset option. Cancellation or failure leaves the prior committed working view intact. A late worker response with an outdated revision must not replace current results.

Local processing means app code does not send selected file contents anywhere. Hosting still receives ordinary page/asset requests. Browser extensions, shared devices, malicious same-origin code, and operating-system access remain outside this guarantee. Clear session releases application references and revokes download object URLs; it cannot guarantee forensic erasure from memory or delete downloaded files.

Treat files as untrusted input: render text with text nodes, no unsanitized HTML, no eval, no executable spreadsheet evaluation. Do not place row data in URLs, console logs, crash reports, issue templates, or network requests. Prefer a dedicated publishing origin where feasible; different GitHub project paths share an origin and are not isolation boundaries.

Public repository/test fixtures contain synthetic data only. Add ignore rules for private inputs, downloads, local exports, test output, node_modules, and secrets. Keep synthetic CSV fixtures explicitly tracked. Review staged files before pushing. Ignore rules cannot undo an accidental prior commit.

## 12. Technical implementation

Use vanilla HTML, CSS, and JavaScript ES modules with a pinned, locally bundled CSV parser. Papa Parse is the selected parser candidate; confirm current release, license, and behavior before pinning. Its text parsing, quoting, and export capabilities should be covered by our own acceptance tests. Do not enable dynamic typing.

Keep deployment build-free. Use a supported Node.js LTS at implementation time for local tooling, Node's test runner for domain tests, and Playwright for browser tests. Pin development dependencies with a lockfile; verify exact versions and security advisories when installing.

Separate domain functions from UI. Parse, transform, group, and compare in a same-origin Web Worker with progress and cancellation. Use indexed maps for grouping/comparison, not every-row versus every-row loops. Terminating a worker cancels computation; no partial result is applied. Reuse parsed sources where memory permits and avoid unlimited full-dataset copies.

Use hash navigation and relative asset paths under `/sheetfix/`. No service worker or installable offline mode in V1; loaded computations are local, but offline reopening is not promised. Serve locally through HTTP during development rather than relying on `file://` ES-module behavior.

| Repository location | Purpose |
|---|---|
| `docs/index.html`, `docs/.nojekyll` | Static Pages entry |
| `docs/assets/css/` | Responsive components, tables, print/help styles |
| `docs/assets/js/core/` | Dataset, validation, normalization, recipes, duplicates, comparison |
| `docs/assets/js/io/` | Parse/export adapter and file limits |
| `docs/assets/js/ui/` | Views, dialogs, state, messages |
| `docs/assets/js/workers/` | Cancellable computation worker |
| `docs/assets/vendor/` | Pinned parser and license |
| `docs/samples/` | Synthetic demonstration files |
| `tests/` | Unit fixtures, integration tests, browser tests |
| `planning/` | This specification, acceptance matrix, release checklist |
| Root | README, LICENSE, SECURITY, CONTRIBUTING, CHANGELOG, manifests, ignore rules |
| `.github/workflows/` | Automated checks |

## 13. Quality gates and meaningful tests

| Area | Required evidence |
|---|---|
| Parsing | Quoted delimiters, escaped quotes, multiline fields, BOM, CRLF/LF, semicolon/tab, no header, repeated/blank headers |
| Validation | Malformed quotes, ragged records, empty input, invalid UTF-8, oversized file/row/cell limits |
| Text integrity | Leading zeros, long IDs, formula text, accents, emoji, leading plus, scientific-looking codes remain unchanged unless selected |
| Cleaning | Rules affect only selected columns; before/after counts correct; reset exact; recipe reapplies from source |
| Duplicates | Composite keys cannot collide; blank keys excluded; conflicts require review; first/last uses source order |
| Comparison | Added/Removed/Changed/Unchanged/exclusions satisfy both count invariants; duplicate keys never silently matched |
| Normalization | Defaults exact; trim/case/numeric equivalence only when enabled; blank differs from zero |
| Export | Reparse ordinary output to the expected table; safe-mode changes separately accounted for; formula/control cases protected |
| Concurrency | Cancel and stale worker replies cannot overwrite newer state |
| Privacy | No file data sent in network requests, logs, or URLs during all core workflows |
| UI | Keyboard, screen-reader basics, 360 px layout, dialogs, errors, loading, cancel, reset, download |
| Deployment | Assets, worker, hash navigation, refresh, and samples work at actual project subpath |

Test current desktop Chrome/Edge and Firefox. Test Android Chrome and iOS Safari before listing them as supported; record versions. Automated browser emulation alone is not proof of support on a real mobile device.

Performance target: one-file operations on 20,000 rows × 20 typical short-text columns complete within five seconds on the documented development laptop, with visible progress and responsive navigation. Measure comparisons separately with two files. These are goals, not existing benchmark results. Publish limits based on measured supported devices and reduce limits if necessary.

Release blockers: silent field corruption, lost leading zeros in app processing, automatic exclusion without review, false one-to-one comparisons, executable imported content, unsafe default export, private data in repository, broken download, or incorrect counts.

## 14. Ordered development checkpoints

| Checkpoint | Deliverable | PASS condition |
|---|---|---|
| 1 | Repository/local environment | Correct remote/ownership, README/MIT, clean setup; no assumed repository |
| 2 | Domain contracts and fixtures | Expected parser, duplicate, and comparison outcomes documented |
| 3 | Responsive shell and sample mode | Three journeys navigable on desktop/mobile |
| 4 | Import worker and structural preview | Valid CSV preserved; invalid structures blocked clearly |
| 5 | Immutable dataset and recipe state | Apply/cancel/reset/undo work without modifying source |
| 6 | Cleaning and validation | Selected-column behavior and change counts pass |
| 7 | Duplicate review | Missing/conflicting keys and survivor decisions pass |
| 8 | Two-file comparison | Mapping and all count invariants pass |
| 9 | Export workflows | Safe/exact modes, logs, encoding, and round trips verified |
| 10 | Privacy/security/accessibility | No release blockers; keyboard and network checks pass |
| 11 | Browser/performance QA | Actual supported limits/browsers documented |
| 12 | Pages demo deployment | Policy fit checked; live URL and worker smoke-tested |
| 13 | Owner pilot | Real-task feedback captured without collecting private records |
| 14 | v1.0 release | Checks pass, docs/changelog complete, release tag and rollback recorded |

Guided development uses one checkpoint at a time, one exact PowerShell command per terminal step, then explicit PASS/FAIL after the user shares output. File edits specify exact path and changes, with a separate verification command. Do not skip failed checkpoints or modify unrelated projects.

Indicative effort: 3–5 weeks part time for one developer learning alongside implementation, plus pilot availability. Correctness gates govern release timing.

## 15. Publication, maintenance, and rollback

Before publishing: verify repository remote and source ownership, review hosting rules, inspect all public files, run tests, confirm dependency notices, and ensure `docs/` contains no business records. Enable Pages deployment from `main` and `/docs` if the final release fits current rules. Confirm the actual GitHub UI and resulting URL at implementation time.

Smoke-test the live `/sheetfix/` path with synthetic files through all three workflows, including worker loading and CSV downloads. Check direct page refresh and navigation. Record the exact release commit and tag.

Roll back through a revert of the faulty release and redeployment. V1 has no persisted business database to migrate, simplifying rollback. A user already holding a page open may retain old code; show app version and suggest exporting results before refreshing for an update.

Maintenance includes dependency review before releases, regression fixtures for reported bugs, a changelog, and reproducible checks. Bug reports request synthetic reproductions, not private business files. Never claim a fix passed checks that were not run.

## 16. Pilot and future product direction

Pilot with three to five owners/staff who regularly work with CSV exports. Give them a synthetic exercise first, then let them work on their own device with files they control. Record task completion, confusing steps, time versus their existing method, unintended changes, and whether they would reuse it. Do not centralize their customer datasets.

V1 acceptance: all core tasks completed without developer intervention after brief onboarding; no incorrect transformations or silent exclusions in reviewed cases; successful downloads; understandable duplicate/conflict decisions; comparison counts independently checked. Aiming for ten task sessions is a proposed sample, not statistical proof of broad demand.

Future candidates, only after evidence: XLSX import/export with explicit workbook limitations; combine files by mapped columns; reusable local recipes without embedded data; more validators; typed exports; locally saved projects; and integrations. Each requires a separate data-preservation and testing specification.

Potential commercial value comes from advanced workflows, support, and integrations. Do not set final subscription prices, add paid checkout, or assume paid demand before validation. Any commercial service needs permitted hosting and a new operating-cost/security plan. The public MIT code can be reused by others; usability and reliability must be the product's strengths.

## 17. Definition of done

SheetFix v1.0 is complete when a user can import a supported CSV, understand issues, safely clean selected fields, review duplicates, compare two mapped lists, and download accurate outputs with clear export-safety settings. The source remains untouched, exclusions and changes are traceable, and private data is absent from repository/network traffic generated by application logic. Required correctness, browser, accessibility, and security checks pass. Documentation matches measured capabilities and the publishing mode fits current hosting rules.

Planning is complete. Next implementation action: Checkpoint 1, verify the `sheetfix` repository and local development environment. This document does not claim the software has been built.

## Sources checked November 15, 2026

Sources establish platform/parser behavior, not demand or revenue projections.

- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Papa Parse documentation: https://www.papaparse.com/docs
- Papa Parse FAQ: https://www.papaparse.com/faq

Dependency versions, GitHub UI details, and current hosting terms must be checked again during implementation.
