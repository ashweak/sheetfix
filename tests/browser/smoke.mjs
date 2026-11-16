// End-to-end smoke test of all three workflows at the /sheetfix/ project subpath.
// Also asserts: no off-origin requests, no file data in URLs/console, 360 px layout without page overflow.
// Usage: node tests/browser/smoke.mjs [baseUrl]   (CHROME_CHANNEL=chrome to use installed Chrome)
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startServer } from '../serve.mjs';

let server;
let base = process.argv[2];
if (!base) {
  server = await startServer(0);
  base = `http://127.0.0.1:${server.address().port}/sheetfix/`;
}
const origin = new URL(base).origin;
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || undefined });
const failures = [];
const step = async (name, fn) => {
  try {
    await fn();
    console.log('PASS', name);
  } catch (e) {
    failures.push(name);
    console.log('FAIL', name, '\n  ', e.message.split('\n')[0]);
  }
};

const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
ctx.setDefaultTimeout(8000);
const requests = [];
const consoleMsgs = [];
page.on('request', (r) => requests.push(r.url()));
page.on('console', (m) => consoleMsgs.push(m.text()));
page.on('pageerror', (e) => consoleMsgs.push('PAGEERROR ' + e.message));
page.on('dialog', (d) => d.accept());

const download = async (name) => {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: new RegExp(`^Download ${name}`) }).click()]);
  const path = await dl.path();
  return { name: dl.suggestedFilename(), text: (await readFile(path, 'utf8')) };
};

await step('home loads at subpath', async () => {
  await page.goto(base);
  await page.getByRole('heading', { name: /Choose your file/ }).waitFor();
});

await step('clean: import sample, see structural preview', async () => {
  await page.getByRole('button', { name: 'Load messy sample and clean it' }).click();
  await page.getByText('products_messy.csv').first().waitFor();
  await page.getByRole('button', { name: 'Use this file' }).click();
  await page.getByRole('heading', { name: 'Rules' }).waitFor();
  await page.getByText(/12 working rows/).waitFor();
});

await step('clean: trim + collapse on Product name, apply, undo, redo', async () => {
  const rule = (label) => page.locator('li.rule').filter({ hasText: label });
  await rule('Trim surrounding spaces').getByRole('checkbox', { name: 'Trim surrounding spaces' }).check();
  await rule('Trim surrounding spaces').getByRole('checkbox', { name: 'Product name' }).check();
  await rule('Collapse repeated spaces').getByRole('checkbox', { name: 'Collapse repeated spaces' }).check();
  await rule('Collapse repeated spaces').getByRole('checkbox', { name: 'Product name' }).check();
  await rule('Remove fully empty records').getByRole('checkbox', { name: 'Remove fully empty records' }).check();
  await page.getByRole('button', { name: 'Apply rules' }).waitFor();
  const stat = page.locator('#clean-preview .stats li').first();
  await stat.getByText('3').waitFor();
  await page.getByRole('button', { name: 'Apply rules' }).click();
  await page.getByRole('button', { name: 'Apply', exact: true }).click(); // confirm dialog (rows removed)
  await page.getByText(/11 working rows/).waitFor();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByText(/12 working rows/).waitFor();
  await page.getByRole('button', { name: 'Redo' }).click();
  await page.getByText(/11 working rows/).waitFor();
});

await step('duplicates: SKU key, conflict requires review, confirm', async () => {
  await page.getByRole('link', { name: 'Find duplicates' }).click();
  await page.getByRole('checkbox', { name: 'SKU' }).check();
  await page.getByRole('button', { name: 'Find duplicates' }).click();
  await page.getByText('Conflicting', { exact: true }).first().waitFor();
  await page.getByRole('radio', { name: 'Keep first in file order' }).check();
  await page.getByText(/1 group undecided/).waitFor(); // conflict not auto-resolved
  await page.getByRole('checkbox', { name: /I have reviewed this group/ }).check();
  await page.locator('.sticky-summary').getByText('9 kept · 2 excluded').waitFor();
  await page.getByRole('button', { name: 'Confirm decisions' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.locator('.sticky-summary .badge', { hasText: 'Confirmed' }).waitFor();
});

let cleaned;
await step('export: safe mode protects formula, keeps leading zeros, reparses', async () => {
  await page.getByRole('link', { name: 'Export' }).click();
  cleaned = await download('products_messy_cleaned.csv');
  assert.ok(cleaned.text.startsWith('﻿SKU,Product name'));
  assert.ok(cleaned.text.includes('"\'=HYPERLINK(""http://example.invalid"")"'));
  assert.ok(cleaned.text.includes('000123,Rice 5kg,'));
  assert.ok(cleaned.text.includes('"Bath soap\n(twin pack)"'));
  assert.ok(cleaned.text.includes('\r\n'));
  await page.getByRole('radio', { name: /Duplicate result/ }).check();
  const dd = await download('products_messy_deduplicated.csv');
  assert.equal(dd.text.trim().split('\r\n').length, 1 + 9 /* the multiline field uses LF inside quotes, records end in CRLF */);
  await page.getByRole('radio', { name: /Exact text for system import/ }).check();
  await page.getByRole('radio', { name: /Cleaned file/ }).check();
  const exact = await download('products_messy_cleaned.csv');
  assert.ok(exact.text.includes(',"=HYPERLINK(""http'));
  await page.getByRole('radio', { name: /Change log/ }).check();
  const log = await download('products_messy_change_log.csv');
  assert.ok(log.text.includes('Trim surrounding spaces'));
});

await step('compare: samples, explicit mapping, exclusions acknowledged, invariants', async () => {
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('button', { name: 'Compare sample lists' }).click();
  await page.getByRole('button', { name: 'Use as Baseline' }).click();
  await page.getByRole('button', { name: 'Use as Updated' }).click();
  await page.getByRole('combobox', { name: 'Baseline key column 1' }).selectOption({ label: 'SKU' });
  await page.getByRole('combobox', { name: 'Updated key column 1' }).selectOption({ label: 'Item code' });
  await page.getByRole('combobox', { name: 'Updated column for Product name' }).selectOption({ label: 'Name' });
  await page.getByRole('combobox', { name: 'Updated column for Price' }).selectOption({ label: 'Unit price' });
  await page.getByRole('combobox', { name: 'Updated column for Stock' }).selectOption({ label: 'On hand' });
  await page.getByRole('combobox', { name: 'Number equivalence for Price' }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByText('Some records cannot be matched one-to-one').waitFor();
  await page.getByRole('button', { name: 'Exclude these records and show results' }).click();
  const inv = await page.locator('.invariant').innerText();
  assert.ok(!inv.includes('✗'), inv);
  assert.match(inv, /Baseline 8 = Removed 1 \+ Changed 2 \+ Unchanged 2 \+ Excluded 3/);
  assert.match(inv, /Updated 6 = Added 1 \+ Changed 2 \+ Unchanged 2 \+ Excluded 1/);
  await page.getByRole('link', { name: 'Export' }).click();
  await page.getByRole('radio', { name: /Field-level changes/ }).check();
  const f = await download('products_updated_field_changes.csv');
  assert.ok(f.text.includes('Stock,40,38'));
});

await step('invalid UTF-8 is rejected with instructions', async () => {
  await page.getByRole('link', { name: 'Clean a file' }).click();
  await page.getByRole('button', { name: 'Replace file' }).click();
  await page.locator('#file-main').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from([0x61, 0x2c, 0x62, 0x0a, 0xff, 0x2c, 0x31, 0x0a]) });
  await page.getByText(/not valid UTF-8/).waitFor();
});

await step('privacy: no off-origin requests, no data in URLs or console', async () => {
  const off = requests.filter((u) => !u.startsWith(origin) && !u.startsWith('blob:') && !u.startsWith('data:'));
  assert.deepEqual(off, []);
  assert.ok(!requests.some((u) => /Rice|HYPERLINK|000123/.test(decodeURIComponent(u))));
  assert.ok(!consoleMsgs.some((m) => /Rice|HYPERLINK|PAGEERROR/.test(m)), consoleMsgs.join('\n'));
});

await step('360 px: no page-wide horizontal overflow; drawer navigation', async () => {
  const m = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const p = await m.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  for (const r of ['home', 'clean', 'duplicates', 'compare', 'export', 'help']) {
    await p.goto(base + '#/' + r);
    await p.locator('main h1').first().waitFor();
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 0, `${r} overflows by ${over}px`);
  }
  await p.goto(base + '#/clean');
  await p.getByRole('button', { name: 'Load sample: messy product list' }).click();
  await p.getByRole('button', { name: 'Use this file' }).click();
  await p.getByRole('heading', { name: 'Rules' }).waitFor();
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 0, `clean with data overflows by ${over}px`);
  await p.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('link', { name: 'Help & About' }).click();
  await p.getByRole('heading', { name: 'Help & About' }).waitFor();
  assert.deepEqual(errs, []);
  await m.close();
});

await step('refresh on a deep hash route works', async () => {
  const p = await ctx.newPage();
  await p.goto(base + '#/compare');
  await p.reload();
  await p.getByRole('heading', { name: 'Compare two lists' }).waitFor();
  await p.close();
});

await browser.close();
if (server) server.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASSED');
process.exit(failures.length ? 1 : 0);
