// ══ LAB PROCUREMENT — REMOVABLE (whole file) ══
// Fixture-only HTTP tests for /api/inventory/procurement (GET / POST / DELETE
// / export). Same safety rules as requestItemEdit.test.js: never the .env DB,
// local host only unless TEST_ALLOW_REMOTE=1, throwaway token secret, fixtures
// far above real ids, and the run FAILS if any table's row count differs from
// its starting count.
//
// Run (from server/):
//   TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=root TEST_DB_PASSWORD= \
//   TEST_DB_NAME=pbl_test node tests/labProcurement.test.js

const need = ['TEST_DB_HOST', 'TEST_DB_USER', 'TEST_DB_NAME'];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Refusing to run: set ${missing.join(', ')} (tests never use the .env database).`);
  process.exit(2);
}
if (!['127.0.0.1', 'localhost', '::1'].includes(process.env.TEST_DB_HOST) && process.env.TEST_ALLOW_REMOTE !== '1') {
  console.error('Refusing to run against a non-local TEST_DB_HOST (set TEST_ALLOW_REMOTE=1 to override).');
  process.exit(2);
}

// Set BEFORE db.js loads: dotenv never overrides variables that already exist.
process.env.DB_HOST = process.env.TEST_DB_HOST;
process.env.DB_PORT = process.env.TEST_DB_PORT || '3306';
process.env.DB_USER = process.env.TEST_DB_USER;
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';
process.env.DB_NAME = process.env.TEST_DB_NAME;
process.env.DB_SSL_CA_PATH = '';
process.env.ACCESS_TOKEN_SECRET = 'lab-procurement-test-secret';
process.env.ACCESS_TOKEN_EXPIRY = '15m';

const { default: db, testConnection } = await import('../src/config/db.js');
const { default: app } = await import('../src/app.js');
const { generateAccessToken } = await import('../src/utils/jwt.js');

const TABLES = ['lab_procurement', 'labs', 'user_profiles', 'inventory_items', 'inventory_stock_txns', 'inventory_obligations'];
const BASE = 990000000;
const ADMIN = { user_id: BASE + 3, role_id: 3, name: 'Test Admin' };
const INCHARGE = { user_id: BASE + 4, role_id: 4, name: 'Test Incharge' };
const R5A = { user_id: BASE + 5, role_id: 5, name: 'Test Member A' };
const R5B = { user_id: BASE + 6, role_id: 5, name: 'Test Member B' };
const STUDENT = { user_id: BASE + 1, role_id: 1, name: 'Test Student' };
const FACULTY = { user_id: BASE + 2, role_id: 2, name: 'Test Faculty' };
const FIXTURE_USERS = [R5A.user_id, R5B.user_id];

const created = { labs: [], procurement: [] };
let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};
const counts = async () => {
  const out = {};
  for (const t of TABLES) { const [[r]] = await db.execute(`SELECT COUNT(*) AS n FROM ${t}`); out[t] = Number(r.n); }
  return out;
};
// Stock fingerprint: every item's quantity, so ANY stock write is caught.
const stockFingerprint = async () => {
  const [rows] = await db.execute('SELECT item_id, current_quantity FROM inventory_items ORDER BY item_id');
  return JSON.stringify(rows.map((r) => [Number(r.item_id), Number(r.current_quantity)]));
};
const procRow = async (id) => (await db.execute('SELECT * FROM lab_procurement WHERE procurement_id = ?', [id]))[0][0];

const cleanup = async () => {
  await db.execute(`DELETE FROM lab_procurement WHERE user_id IN (?, ?, ?, ?)`, [...FIXTURE_USERS, ADMIN.user_id, INCHARGE.user_id]);
  if (created.procurement.length) {
    const ph = created.procurement.map(() => '?').join(',');
    await db.execute(`DELETE FROM lab_procurement WHERE procurement_id IN (${ph})`, created.procurement);
  }
  if (created.labs.length) {
    const ph = created.labs.map(() => '?').join(',');
    await db.execute(`DELETE FROM labs WHERE lab_id IN (${ph})`, created.labs);
  }
  await db.execute(`DELETE FROM user_profiles WHERE user_id IN (?, ?)`, FIXTURE_USERS);
};

let server;
let before;
try {
  console.log('Booting db.js migration check against the TEST database…');
  if (!(await testConnection())) throw new Error('testConnection failed');

  const [[t0]] = await db.execute(
    `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'lab_procurement'`);
  check('T0 boot creates lab_procurement', Number(t0.n) === 1);

  before = await counts();

  // Fixtures: one lab, display names for the two lab members.
  const [lab] = await db.execute(`INSERT INTO labs (lab_name, lab_code) VALUES ('ZZ Test Lab', 'ZZT')`);
  created.labs.push(lab.insertId);
  const LAB_ID = lab.insertId;
  await db.execute(`INSERT INTO user_profiles (user_id, name) VALUES (?, 'Member A'), (?, 'Member B')`, FIXTURE_USERS);

  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/inventory`;
  const tok = (u) => generateAccessToken({ ...u, reg_num: null, picture: null });
  const call = async (method, path, user, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (user) headers.Authorization = `Bearer ${tok(user)}`;
    const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    // Decode by hand with ignoreBOM so a leading U+FEFF survives (res.text() strips it).
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
    let json = null; try { json = JSON.parse(text); } catch { /* CSV or empty */ }
    return { status: res.status, json, text, bytes, type: res.headers.get('content-type') || '', disp: res.headers.get('content-disposition') || '' };
  };

  console.log('\nRunning tests…');

  // T1 + T2 — create, and prove no stock side effect
  let idA;
  {
    const stockBefore = await stockFingerprint();
    const [[tx0]] = await db.execute('SELECT COUNT(*) AS n FROM inventory_stock_txns');
    const [[ob0]] = await db.execute('SELECT COUNT(*) AS n FROM inventory_obligations');
    // user_id in the body must be ignored.
    const r = await call('POST', '/procurement', R5A, { item_name: '  Arduino Uno, R3  ', quantity: '5.5', unit: ' pcs ', lab_id: LAB_ID, user_id: 1 });
    idA = r.json?.data?.procurement_id;
    if (idA) created.procurement.push(idA);
    const row = idA ? await procRow(idA) : null;
    check('T1 role 5 create → 2xx', r.status === 200 || r.status === 201, `got ${r.status} ${r.json?.message || ''}`);
    check('T1 stored with the TOKEN user_id (body user_id ignored)', row && Number(row.user_id) === R5A.user_id, `user_id=${row?.user_id}`);
    check('T1 values trimmed + normalised', row && row.item_name === 'Arduino Uno, R3' && row.unit === 'pcs'
      && Number(row.quantity) === 5.5 && Number(row.lab_id) === LAB_ID);
    const [[tx1]] = await db.execute('SELECT COUNT(*) AS n FROM inventory_stock_txns');
    const [[ob1]] = await db.execute('SELECT COUNT(*) AS n FROM inventory_obligations');
    check('T2 inventory_items.current_quantity UNCHANGED', (await stockFingerprint()) === stockBefore);
    check('T2 inventory_stock_txns has NO new row', Number(tx1.n) === Number(tx0.n), `${tx0.n} -> ${tx1.n}`);
    check('T2 inventory_obligations has NO new row', Number(ob1.n) === Number(ob0.n), `${ob0.n} -> ${ob1.n}`);
  }

  // T3 — validation
  {
    const [[c0]] = await db.execute('SELECT COUNT(*) AS n FROM lab_procurement');
    const bad = [
      ['missing item_name', { quantity: 1, unit: 'pcs' }],
      ['blank item_name', { item_name: '   ', quantity: 1, unit: 'pcs' }],
      ['zero quantity', { item_name: 'X', quantity: 0, unit: 'pcs' }],
      ['negative quantity', { item_name: 'X', quantity: -2, unit: 'pcs' }],
      ['non-numeric quantity', { item_name: 'X', quantity: 'abc', unit: 'pcs' }],
      ['missing unit', { item_name: 'X', quantity: 1 }],
      ['blank unit', { item_name: 'X', quantity: 1, unit: '  ' }],
    ];
    for (const [label, body] of bad) {
      const r = await call('POST', '/procurement', R5A, body);
      check(`T3 ${label} → 400`, r.status === 400, `got ${r.status}`);
    }
    const [[c1]] = await db.execute('SELECT COUNT(*) AS n FROM lab_procurement');
    check('T3 nothing stored', Number(c1.n) === Number(c0.n));
  }

  // T4 — unknown lab
  {
    const r = await call('POST', '/procurement', R5A, { item_name: 'X', quantity: 1, unit: 'pcs', lab_id: BASE + 999 });
    check('T4 unknown lab_id → 400', r.status === 400, `got ${r.status}`);
  }

  // B's entry (no lab) for the cross-user checks
  const rB = await call('POST', '/procurement', R5B, { item_name: 'Beaker 250ml', quantity: 2, unit: 'pcs', lab_id: '' });
  const idB = rB.json?.data?.procurement_id;
  if (idB) created.procurement.push(idB);

  // T5 — GET as 3 / 4 / 5; role 5 sees another member's row
  {
    for (const [label, u] of [['admin', ADMIN], ['incharge', INCHARGE], ['role 5', R5A]]) {
      const r = await call('GET', '/procurement', u);
      check(`T5 GET as ${label} → 200`, r.status === 200, `got ${r.status}`);
    }
    const r = await call('GET', '/procurement', R5A);
    const rowB = (r.json?.data?.items || []).find((x) => Number(x.procurement_id) === Number(idB));
    check('T5 role 5 sees a row entered by a DIFFERENT user', !!rowB && Number(rowB.user_id) === R5B.user_id);
    check('T5 row carries lab_name + entered_by_name', !!rowB && rowB.lab_name == null && rowB.entered_by_name === 'Member B');
    const items = r.json?.data?.items || [];
    const iA = items.findIndex((x) => Number(x.procurement_id) === Number(idA));
    const iB = items.findIndex((x) => Number(x.procurement_id) === Number(idB));
    check('T5 newest first', iB !== -1 && iA !== -1 && iB < iA);
  }

  // T6 / T7 — roles 1 and 2 → 403; no token → 401
  {
    for (const [label, u] of [['role 1', STUDENT], ['role 2', FACULTY]]) {
      const g = await call('GET', '/procurement', u);
      const p = await call('POST', '/procurement', u, { item_name: 'X', quantity: 1, unit: 'pcs' });
      const d = await call('DELETE', `/procurement/${idA}`, u);
      check(`T6 ${label} GET/POST/DELETE → 403`, g.status === 403 && p.status === 403 && d.status === 403, `${g.status}/${p.status}/${d.status}`);
    }
    const g = await call('GET', '/procurement', null);
    const p = await call('POST', '/procurement', null, { item_name: 'X', quantity: 1, unit: 'pcs' });
    const d = await call('DELETE', `/procurement/${idA}`, null);
    check('T7 no token GET/POST/DELETE → 401', g.status === 401 && p.status === 401 && d.status === 401, `${g.status}/${p.status}/${d.status}`);
    check('T6/T7 row still there', !!(await procRow(idA)));
  }

  // Extra — export (admin/incharge only, exact ids, screen order, csvCell quoting)
  {
    const r = await call('POST', '/procurement/export', INCHARGE, { ids: [idB, idA] });
    const lines = r.text.split('\r\n');
    check('EXPORT incharge → 200 text/csv with dated filename', r.status === 200 && r.type.startsWith('text/csv')
      && /filename="lab-procurement-\d{4}-\d{2}-\d{2}\.csv"/.test(r.disp), `${r.status} ${r.type} ${r.disp}`);
    check('EXPORT header + rows in the order sent', lines[0] === '﻿#,Item Name,Quantity,Unit,Lab,Entered By,Date'
      && lines.length === 3 && lines[1].startsWith('1,Beaker 250ml,2,pcs,No lab,Member B,')
      && lines[2].startsWith('2,"Arduino Uno, R3",5.5,pcs,ZZ Test Lab,Member A,'), JSON.stringify(lines));
    check('EXPORT date is dd-MMM-yyyy HH:mm', /,\d{2}-[A-Z][a-z]{2}-\d{4} \d{2}:\d{2}$/.test(lines[1] || ''), lines[1]);
    const r5 = await call('POST', '/procurement/export', R5A, { ids: [idA] });
    check('EXPORT as role 5 → 403', r5.status === 403, `got ${r5.status}`);
  }

  // T8 — role 5 deletes own → 200; someone else's → 403 and row survives
  {
    const other = await call('DELETE', `/procurement/${idB}`, R5A);
    check("T8 role 5 deletes someone else's row → 403", other.status === 403, `got ${other.status}`);
    check('T8 that row is still there', !!(await procRow(idB)));
    const own = await call('DELETE', `/procurement/${idA}`, R5A);
    check('T8 role 5 deletes own row → 200', own.status === 200 && !(await procRow(idA)), `got ${own.status}`);
  }

  // T9 — admin deletes someone else's row
  {
    const r = await call('DELETE', `/procurement/${idB}`, ADMIN);
    check("T9 role 3 deletes someone else's row → 200", r.status === 200 && !(await procRow(idB)), `got ${r.status}`);
    const r2 = await call('POST', '/procurement', R5B, { item_name: 'Pipette', quantity: 1, unit: 'pcs' });
    const idC = r2.json?.data?.procurement_id;
    if (idC) created.procurement.push(idC);
    const r3 = await call('DELETE', `/procurement/${idC}`, INCHARGE);
    check("T9 role 4 deletes someone else's row → 200", r3.status === 200 && !(await procRow(idC)), `got ${r3.status}`);
  }

  // ══ ADMIN/INCHARGE ADD + CSV BOM — tests T10–T15 ══
  // T10 — admin adds; owned by the admin (body user_id ignored)
  let idAdmin;
  {
    const r = await call('POST', '/procurement', ADMIN, { item_name: 'Soldering iron', quantity: 1, unit: 'pcs', lab_id: LAB_ID, user_id: R5A.user_id });
    idAdmin = r.json?.data?.procurement_id;
    if (idAdmin) created.procurement.push(idAdmin);
    const row = idAdmin ? await procRow(idAdmin) : null;
    check('T10 role 3 POST → 2xx, stored with the ADMIN user_id', (r.status === 200 || r.status === 201) && row && Number(row.user_id) === ADMIN.user_id,
      `got ${r.status} user_id=${row?.user_id}`);
  }
  // T11 — incharge adds
  {
    const r = await call('POST', '/procurement', INCHARGE, { item_name: 'Multimeter', quantity: '2', unit: 'pcs' });
    const id = r.json?.data?.procurement_id;
    if (id) created.procurement.push(id);
    const row = id ? await procRow(id) : null;
    check('T11 role 4 POST → 2xx, stored with the INCHARGE user_id', (r.status === 200 || r.status === 201) && row && Number(row.user_id) === INCHARGE.user_id,
      `got ${r.status}`);
  }
  // T12 — roles 1 and 2 still 403 on POST, nothing stored
  {
    const [[c0]] = await db.execute('SELECT COUNT(*) AS n FROM lab_procurement');
    const p1 = await call('POST', '/procurement', STUDENT, { item_name: 'X', quantity: 1, unit: 'pcs' });
    const p2 = await call('POST', '/procurement', FACULTY, { item_name: 'X', quantity: 1, unit: 'pcs' });
    const [[c1]] = await db.execute('SELECT COUNT(*) AS n FROM lab_procurement');
    check('T12 role 1 + role 2 POST → 403, nothing stored', p1.status === 403 && p2.status === 403 && Number(c1.n) === Number(c0.n),
      `${p1.status}/${p2.status} rows ${c0.n}->${c1.n}`);
  }
  // T13 — role 5 cannot delete the admin's row
  {
    const r = await call('DELETE', `/procurement/${idAdmin}`, R5A);
    check("T13 role 5 deletes the admin's row → 403, row still there", r.status === 403 && !!(await procRow(idAdmin)), `got ${r.status}`);
  }
  // T15 — BOM + non-ASCII round-trip (before T14 deletes the admin row)
  {
    const name = 'Café Ø-ring — 5µm ±0.1';
    const r0 = await call('POST', '/procurement', R5A, { item_name: name, quantity: 3, unit: 'µL' });
    const idU = r0.json?.data?.procurement_id;
    if (idU) created.procurement.push(idU);
    const r = await call('POST', '/procurement/export', ADMIN, { ids: [idU, idAdmin] });
    const b = r.bytes || new Uint8Array();
    check('T15 export begins with the UTF-8 BOM (EF BB BF)', b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF,
      `first bytes ${[...b.slice(0, 3)].map((x) => x.toString(16)).join(' ')}`);
    const row1 = r.text.split('\r\n')[1] || '';
    check('T15 non-ASCII item name + unit round-trip exactly', row1.startsWith(`1,${name},3,µL,No lab,Member A,`), row1);
  }
  // T14 — admin deletes the admin-created row
  {
    const r = await call('DELETE', `/procurement/${idAdmin}`, ADMIN);
    check("T14 role 3 deletes the admin-created row → 200", r.status === 200 && !(await procRow(idAdmin)), `got ${r.status}`);
  }
} catch (err) {
  fail += 1;
  console.error('  ERROR', err);
} finally {
  try { await cleanup(); } catch (e) { fail += 1; console.error('  CLEANUP ERROR', e); }
  if (before) {
    const after = await counts();
    const same = TABLES.every((t) => after[t] === before[t]);
    check('Cleanup: every table back to its starting row count', same, JSON.stringify({ before, after }));
  }
  if (server) server.close();
  await db.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
