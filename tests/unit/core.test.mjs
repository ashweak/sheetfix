import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, decodeUtf8, detectDelimiter } from '../../docs/assets/js/core/csv-parse.js';
import { buildDataset, displayLabels } from '../../docs/assets/js/core/dataset.js';
import { applyRecipe, defaultRecipe } from '../../docs/assets/js/core/recipe.js';
import { canonicalDecimal, numberFormat, parseDate } from '../../docs/assets/js/core/validate.js';
import { findDuplicates, resolveDuplicates } from '../../docs/assets/js/core/duplicates.js';
import { compareLists } from '../../docs/assets/js/core/compare.js';
import { writeCsv, safeFilename, isFormulaLike } from '../../docs/assets/js/core/csv-write.js';
import { importFile } from '../../docs/assets/js/io/import.js';

const enc = (s) => new TextEncoder().encode(s);
const imp = (s, settings = {}) =>
  importFile({ bytes: enc(s).buffer, settings: { delimiter: 'auto', hasHeader: true, ...settings } });
const fields = (s, o) => parseCsv(s, o).records.map((r) => r.fields);

// ---------- Parsing ----------
test('quoted delimiters, escaped quotes, multiline fields', () => {
  const r = parseCsv('a,b\n"x,y","say ""hi"""\n"line1\nline2",z\n');
  assert.deepEqual(r.records.map((x) => x.fields), [['a', 'b'], ['x,y', 'say "hi"'], ['line1\nline2', 'z']]);
  assert.equal(r.records[2].record, 3);
  assert.equal(r.records[2].line, 3);
  assert.equal(r.records.length, 3, 'trailing newline does not add a record');
});

test('record number differs from physical line after multiline field', () => {
  const r = parseCsv('h\n"a\nb"\nc\n');
  assert.equal(r.records[2].record, 3);
  assert.equal(r.records[2].line, 4);
});

test('CRLF, LF, semicolon and tab delimiters', () => {
  assert.deepEqual(fields('a;b\r\n1;2\r\n', { delimiter: ';' }), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(fields('a\tb\n1\t2', { delimiter: '\t' }), [['a', 'b'], ['1', '2']]);
  assert.equal(detectDelimiter('a;b;c\n1;2;3\n4;5;6').delimiter, ';');
  assert.equal(detectDelimiter('a\tb\n1\t2').delimiter, '\t');
  assert.equal(detectDelimiter('name,price\n"Doe; J",1\n').delimiter, ',');
});

test('BOM accepted and removed from first header', () => {
  const out = imp('﻿SKU,Name\n001,A\n');
  assert.equal(out.hadBom, true);
  assert.equal(out.dataset.columns[0].header, 'SKU');
});

test('invalid UTF-8 is rejected, never replaced', () => {
  assert.throws(() => decodeUtf8(new Uint8Array([0x61, 0xff, 0x62])), /not valid UTF-8/);
});

test('empty file is an error; header-only file has zero data records', () => {
  assert.throws(() => imp(''), /empty/);
  const out = imp('a,b\n');
  assert.equal(out.dataset.rows.length, 0);
  assert.equal(out.dataset.columns.length, 2);
});

test('repeated and blank headers preserved with disambiguated labels', () => {
  const out = imp('Price,,Price\n1,2,3\n');
  assert.deepEqual(out.dataset.columns.map((c) => c.header), ['Price', '', 'Price']);
  assert.deepEqual(displayLabels(['Price', '', 'Price']), ['Price (column 1)', 'Column 2', 'Price (column 3)']);
});

test('no-header mode keeps first record as data', () => {
  const out = imp('1,2\n3,4\n', { hasHeader: false });
  assert.equal(out.dataset.rows.length, 2);
});

// ---------- Validation ----------
test('malformed quotes and ragged records block until resolved', () => {
  const out = imp('a,b\n"x,1\n');
  assert.ok(out.dataset.blocking > 0);
  const rag = imp('a,b,c\n1,2\n1,2,3,4\n');
  assert.equal(rag.dataset.blocking, 2);
  const padded = imp('a,b,c\n1,2\n', { padShort: true });
  assert.equal(padded.dataset.blocking, 0);
  assert.deepEqual(padded.dataset.rows[0].cells, ['1', '2', '']);
  const removed = imp('a,b,c\n1,2\n4,5,6\n', { removed: [2] });
  assert.equal(removed.dataset.blocking, 0);
  assert.equal(removed.dataset.rows.length, 1);
  const wide = imp('a,b\n1,2,3\n', { expandWide: true });
  assert.equal(wide.dataset.blocking, 0);
  assert.equal(wide.dataset.columns.length, 3);
});

test('blank lines and delimiter-only records are distinct', () => {
  const r = parseCsv('a,b\n\n,\n1,2\n');
  assert.equal(r.stats.blankLines, 1);
  assert.equal(r.stats.delimiterOnly, 1);
});

test('limits enforced during parsing', () => {
  assert.throws(() => parseCsv('a,b,c\n', { limits: { columns: 2 } }), /limit is 2/);
  assert.throws(() => parseCsv('abcdef\n', { limits: { cellChars: 3 } }), /longer than/);
  assert.throws(() => parseCsv('a\nb\nc\nd\n', { limits: { records: 2 } }), /more than 2/);
});

// ---------- Text integrity ----------
test('identifiers and odd text stay exact', () => {
  const vals = ['000123', '+639171234567', '1E10', '12345678901234567890', '01/02/2026', '=SUM(A1)', 'Café ñ', '😀'];
  const out = imp('v\n' + vals.map((v) => `"${v}"`).join('\n') + '\n');
  assert.deepEqual(out.dataset.rows.map((r) => r.cells[0]), vals);
});

// ---------- Cleaning ----------
function ds(csv) {
  return imp(csv).dataset;
}

test('rules affect only selected columns; counts correct; source untouched', () => {
  const d = ds('a,b\n  x  ,  y  \n z ,w\n');
  const before = JSON.stringify(d.rows);
  const r = defaultRecipe();
  r.trim = { on: true, cols: ['c0'] };
  const out = applyRecipe(d, r);
  assert.deepEqual(out.rows.map((x) => x.cells), [['x', '  y  '], ['z', 'w']]);
  assert.equal(out.counts.changedCells, 2);
  assert.equal(out.counts.affectedRows, 2);
  assert.equal(JSON.stringify(d.rows), before);
});

test('recipe reapplies from source without compounding', () => {
  const d = ds('a\nA\n');
  const r = defaultRecipe();
  r.replace = { on: true, cols: ['c0'], pairs: [{ find: 'A', replace: 'AA' }], caseSensitive: true, ignoreEdgeSpaces: false };
  const once = applyRecipe(d, r);
  const twice = applyRecipe(d, r);
  assert.equal(once.rows[0].cells[0], 'AA');
  assert.equal(twice.rows[0].cells[0], 'AA');
});

test('collapse, case, date output, checks, remove empty', () => {
  const d = ds('n,d,p,q\nfoo   bar,13/01/2026,1.5,\n,,,\nx,31/02/2026,abc,y\n');
  const r = defaultRecipe();
  r.collapse = { on: true, cols: ['c0'] };
  r.case = { on: true, cols: ['c0'], mode: 'upper' };
  r.dateOut = { on: true, cols: ['c1'], source: 'DD/MM/YYYY', output: 'YYYY-MM-DD' };
  r.required = { on: true, cols: ['c3'] };
  r.numeric = { on: true, cols: ['c2'], format: 'dot' };
  r.removeEmpty = { on: true, whitespaceIsEmpty: false };
  const out = applyRecipe(d, r);
  assert.equal(out.rows.length, 2);
  assert.equal(out.excluded.length, 1);
  assert.deepEqual(out.rows[0].cells.slice(0, 2), ['FOO BAR', '2026-01-13']);
  assert.equal(out.rows[1].cells[1], '31/02/2026', 'invalid date left unchanged');
  const rules = out.issues.map((i) => i.rule).sort();
  assert.deepEqual(rules, ['dateOut', 'numeric', 'required']);
});

test('canonical decimals are exact and blank is not zero', () => {
  const f = numberFormat('comma-dot');
  assert.equal(canonicalDecimal('1,234.50', f), '1234.5');
  assert.equal(canonicalDecimal('10.00', numberFormat('dot')), '10');
  assert.equal(canonicalDecimal('-0.0', numberFormat('dot')), '0');
  assert.equal(canonicalDecimal('', numberFormat('dot')), null);
  assert.equal(canonicalDecimal('12345678901234567890.1', numberFormat('dot')), '12345678901234567890.1');
  assert.equal(parseDate('29/02/2025', 'DD/MM/YYYY'), null);
});

// ---------- Duplicates ----------
const rowsOf = (arr) => arr.map((cells, i) => ({ id: 'r' + (i + 2), record: i + 2, cells }));

test('composite keys cannot collide through separators', () => {
  const rows = rowsOf([['a|b', 'c'], ['a', 'b|c']]);
  assert.equal(findDuplicates(rows, [0, 1]).groups.length, 0);
});

test('blank keys excluded; identical vs conflicting groups', () => {
  const rows = rowsOf([['', 'x'], ['', 'x'], ['k1', '1'], ['k1', '1'], ['k2', '1'], ['k2', '2']]);
  const res = findDuplicates(rows, [0]);
  assert.equal(res.missingKey.length, 2);
  assert.equal(res.groups.length, 2);
  assert.equal(res.groups[0].identical, true);
  assert.equal(res.groups[1].identical, false);
  assert.deepEqual(res.groups[1].conflictCols, [1]);
});

test('policy applies to identical groups only until conflicts are reviewed; uses source order', () => {
  const rows = rowsOf([['k1', '1'], ['k2', 'a'], ['k1', '1'], ['k2', 'b']]);
  const res = findDuplicates(rows, [0]);
  let out = resolveDuplicates(rows, res, { policy: 'last' });
  assert.deepEqual(out.retained.map((r) => r.id), ['r3', 'r4', 'r5']);
  assert.equal(out.unresolved.length, 1);
  out = resolveDuplicates(rows, res, { policy: 'last', reviewed: new Set([res.groups[1].key]) });
  assert.deepEqual(out.retained.map((r) => r.id), ['r4', 'r5']);
  out = resolveDuplicates(rows, res, { policy: 'none', decisions: { [res.groups[1].key]: ['r3'] } });
  assert.deepEqual(out.retained.map((r) => r.id), ['r2', 'r3', 'r4']);
});

test('matching normalization does not rewrite values', () => {
  const rows = rowsOf([[' A@x.com'], ['a@x.com ']]);
  const res = findDuplicates(rows, [0], { trim: true, caseInsensitive: true });
  assert.equal(res.groups.length, 1);
  assert.equal(rows[0].cells[0], ' A@x.com');
});

// ---------- Comparison ----------
const side = (arr) => ({ columns: arr[0].map((_, i) => ({ index: i })), rows: rowsOf(arr) });

test('added/removed/changed/unchanged/excluded satisfy both invariants', () => {
  const base = side([['1', 'a', '10.00'], ['2', 'b', '5'], ['3', 'c', '1'], ['4', 'd', '1'], ['4', 'd2', '1'], ['', 'z', '1']]);
  const upd = side([['1', 'a', '10'], ['2', 'B', '5'], ['5', 'e', '1'], ['4', 'd', '1'], ['6', 'f', ''], ['6', 'f', '']]);
  const mapping = { keys: [{ a: 0, b: 0 }], fields: [{ a: 1, b: 1, label: 'Name' }, { a: 2, b: 2, label: 'Price' }] };
  const r = compareLists(base, upd, mapping);
  assert.equal(r.counts.added, 1); // 5
  assert.equal(r.counts.removed, 1); // 3
  assert.equal(r.counts.changed, 2); // 1 (10.00 vs 10 exact), 2 (b/B)
  assert.equal(r.counts.unchanged, 0);
  assert.equal(r.counts.excludedBaseline, 3); // 4,4 duplicate + blank key
  assert.equal(r.counts.excludedUpdated, 3); // 4 (dup on other side), 6,6
  assert.ok(r.counts.baselineBalanced && r.counts.updatedBalanced);
});

test('normalization only when enabled; blank differs from zero; missing columns error', () => {
  const base = side([['1', 'Ab ', '10.00'], ['2', 'x', '']]);
  const upd = side([['1', 'ab', '10'], ['2', 'x', '0']]);
  const mapping = { keys: [{ a: 0, b: 0 }], fields: [{ a: 1, b: 1, label: 'N', trim: true, caseInsensitive: true }, { a: 2, b: 2, label: 'P', numeric: 'dot' }] };
  const r = compareLists(base, upd, mapping);
  assert.equal(r.counts.unchanged, 1);
  assert.equal(r.counts.changed, 1);
  assert.equal(r.fieldChanges[0].old, '');
  assert.throws(() => compareLists(base, upd, { keys: [{ a: 0, b: 9 }], fields: [] }), /missing/);
});

// ---------- Export ----------
test('ordinary output reparses to the same table', () => {
  const rows = [['a,b', 'say "hi"', 'x\ny'], ['', ' lead', '000123']];
  const { text } = writeCsv(['h1', 'h2', 'h3'], rows, { bom: true, safe: true });
  assert.ok(text.startsWith('﻿'));
  assert.ok(text.includes('\r\n'));
  const back = parseCsv(text.slice(1)).records.map((r) => r.fields);
  assert.deepEqual(back, [['h1', 'h2', 'h3'], ...rows]);
});

test('single empty column rows survive a round trip', () => {
  const { text } = writeCsv(['h'], [[''], ['x']], { bom: false });
  assert.deepEqual(parseCsv(text).records.map((r) => r.fields), [['h'], [''], ['x']]);
});

test('safe mode protects formula/control cases; exact mode does not', () => {
  const risky = ['=1+1', '+1', '-1', '@SUM(A1)', '\t=1', '\r=1', ' =1', ' =1', '＝1'];
  for (const v of risky) assert.ok(isFormulaLike(v), JSON.stringify(v));
  const safe = writeCsv(null, risky.map((v) => [v]), { bom: false });
  assert.equal(safe.protectedCount, risky.length);
  const back = parseCsv(safe.text).records.map((r) => r.fields[0]);
  assert.ok(back.every((v, i) => v === "'" + risky[i]));
  const exact = writeCsv(null, risky.map((v) => [v]), { bom: false, safe: false });
  assert.equal(exact.protectedCount, 0);
  assert.deepEqual(parseCsv(exact.text).records.map((r) => r.fields[0]), risky);
  const plain = writeCsv(null, [['-12.50'], ['+639171234567'], ['-1+2']], { bom: false, allowPlainNumbers: true });
  assert.equal(plain.protectedCount, 1);
});

test('safe output filenames', () => {
  assert.equal(safeFilename('products.csv', 'cleaned'), 'products_cleaned.csv');
  assert.equal(safeFilename('../My File (1).csv', 'excluded'), 'My_File_1_excluded.csv');
  assert.equal(safeFilename('', 'x'), 'sheetfix_x.csv');
});
