// ═══ REQUEST ITEM EDIT AUDIT — REMOVABLE (whole file) ═══
// Fixture-only HTTP tests for
//   PATCH  /api/inventory/requests/:requestId/items/:lineId
//   DELETE /api/inventory/requests/:requestId/items/:lineId
// plus a regression check that approving an untouched request still deducts
// stock exactly as before.
//
// SAFETY: never runs against the DB in server/.env. It needs an explicit
// TEST_DB_* target, refuses a non-local host unless TEST_ALLOW_REMOTE=1, and
// signs its own tokens with a throwaway secret. It boots db.js's migration
// check against that target (which is how the two new columns get there).
// Fixtures use ids far above real data and are deleted at the end; the run
// fails if any table's row count differs from its starting count.
//
// Run (from server/):
//   TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=root TEST_DB_PASSWORD= \
//   TEST_DB_NAME=pbl_test node tests/requestItemEdit.test.js

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
process.env.ACCESS_TOKEN_SECRET = 'request-item-edit-test-secret';
process.env.ACCESS_TOKEN_EXPIRY = '15m';

const { default: db, testConnection } = await import('../src/config/db.js');
const { default: app } = await import('../src/app.js');
const { generateAccessToken } = await import('../src/utils/jwt.js');

const TABLES = ['inventory_items', 'inventory_requests', 'inventory_request_items', 'inventory_stock_txns', 'inventory_obligations'];
const BASE = 990000000;
const STUDENT_ID = BASE + 1;
const ADMIN = { user_id: BASE + 3, role_id: 3, name: 'Test Admin' };
const INCHARGE = { user_id: BASE + 4, role_id: 4, name: 'Test Incharge' };
const STUDENT = { user_id: BASE + 1, role_id: 1, name: 'Test Student' };

const created = { items: [], requests: [] };
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

const addItem = async (name, qty) => {
  const [r] = await db.execute(
    `INSERT INTO inventory_items (category, item_name, unit, current_quantity, is_returnable, is_active)
     VALUES ('ZZ_TEST', ?, 'G', ?, 0, 1)`, [name, qty]);
  created.items.push(r.insertId);
  return r.insertId;
};
const addRequest = async (lines, status = 'PENDING') => {
  const [r] = await db.execute(
    `INSERT INTO inventory_requests (student_id, request_type, purpose_type, purpose, status)
     VALUES (?, 'BUY', 'PROJECT', 'request-item-edit test fixture', ?)`, [STUDENT_ID, status]);
  const rid = r.insertId;
  created.requests.push(rid);
  const lineIds = [];
  for (const l of lines) {
    const [li] = await db.execute(
      `INSERT INTO inventory_request_items (request_id, item_id, item_name, quantity, requested_quantity, unit)
       VALUES (?, ?, ?, ?, ?, 'G')`, [rid, l.item_id, l.name, l.qty, l.qty]);
    lineIds.push(li.insertId);
  }
  return { rid, lineIds };
};
const line = async (lid) => (await db.execute(`SELECT * FROM inventory_request_items WHERE line_id = ?`, [lid]))[0][0];
const reqRow = async (rid) => (await db.execute(`SELECT * FROM inventory_requests WHERE request_id = ?`, [rid]))[0][0];
const stockOf = async (iid) => Number((await db.execute(`SELECT current_quantity FROM inventory_items WHERE item_id = ?`, [iid]))[0][0].current_quantity);

const cleanup = async () => {
  if (created.requests.length) {
    const ph = created.requests.map(() => '?').join(',');
    await db.execute(`DELETE FROM inventory_obligations WHERE buy_request_id IN (${ph})`, created.requests);
    await db.execute(`DELETE FROM inventory_stock_txns WHERE request_id IN (${ph})`, created.requests);
    await db.execute(`DELETE FROM inventory_request_items WHERE request_id IN (${ph})`, created.requests);
    await db.execute(`DELETE FROM inventory_requests WHERE request_id IN (${ph})`, created.requests);
  }
  if (created.items.length) {
    const ph = created.items.map(() => '?').join(',');
    await db.execute(`DELETE FROM inventory_stock_txns WHERE item_id IN (${ph})`, created.items);
    await db.execute(`DELETE FROM inventory_items WHERE item_id IN (${ph})`, created.items);
  }
};

let server;
let before;
try {
  console.log('Booting db.js migration check against the TEST database…');
  const ok = await testConnection();
  if (!ok) throw new Error('testConnection failed');

  const [cols] = await db.execute('DESCRIBE inventory_request_items');
  const has = (f) => cols.some((c) => c.Field === f);
  check('T0 boot adds edited_by_user_id + edited_at', has('edited_by_user_id') && has('edited_at'));

  before = await counts();

  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api/inventory`;
  const tok = (u) => generateAccessToken({ ...u, reg_num: null, picture: null });
  const call = async (method, path, user, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (user) headers.Authorization = `Bearer ${tok(user)}`;
    const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let json = null; try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, json };
  };

  const itemA = await addItem('ZZ test item A', '100.00');
  const itemB = await addItem('ZZ test item B', '50.00');
  const itemC = await addItem('ZZ test item C', '20.00');

  console.log('\nRunning tests…');

  // T1 — raise within stock (incharge)
  {
    const { rid, lineIds: [l1] } = await addRequest([{ item_id: itemA, name: 'ZZ test item A', qty: 5 }]);
    const r = await call('PATCH', `/requests/${rid}/items/${l1}`, INCHARGE, { quantity: '12.5' });
    const row = await line(l1);
    check('T1 PATCH raise within stock → 200', r.status === 200, `got ${r.status} ${r.json?.message || ''}`);
    check('T1 value saved', Number(row.quantity) === 12.5, `quantity=${row.quantity}`);
    check('T1 edited_by_user_id + edited_at set', Number(row.edited_by_user_id) === INCHARGE.user_id && row.edited_at != null);
    check('T1 stock untouched', (await stockOf(itemA)) === 100);
  }

  // T2 — above stock
  {
    const { rid, lineIds: [l1] } = await addRequest([{ item_id: itemB, name: 'ZZ test item B', qty: 5 }]);
    const r = await call('PATCH', `/requests/${rid}/items/${l1}`, ADMIN, { quantity: 51 });
    const row = await line(l1);
    check('T2 PATCH above stock → 400', r.status === 400, `got ${r.status}`);
    check('T2 message carries available figure', /\b50\b/.test(r.json?.message || ''), r.json?.message);
    check('T2 quantity unchanged', Number(row.quantity) === 5 && row.edited_at == null);
  }

  // T3 — approved request
  {
    const { rid, lineIds: [l1, l2] } = await addRequest([
      { item_id: itemA, name: 'ZZ test item A', qty: 3 },
      { item_id: itemB, name: 'ZZ test item B', qty: 2 },
    ], 'APPROVED');
    const p = await call('PATCH', `/requests/${rid}/items/${l1}`, ADMIN, { quantity: 4 });
    const d = await call('DELETE', `/requests/${rid}/items/${l2}`, INCHARGE);
    check('T3 PATCH on APPROVED → 409', p.status === 409, `got ${p.status}`);
    check('T3 DELETE on APPROVED → 409', d.status === 409, `got ${d.status}`);
    const r1 = await line(l1); const r2 = await line(l2);
    check('T3 nothing changed', Number(r1.quantity) === 3 && r1.edited_at == null && !!r2);
  }

  // T4 — delete one of three
  {
    const { rid, lineIds: [l1, l2, l3] } = await addRequest([
      { item_id: itemA, name: 'ZZ test item A', qty: 1 },
      { item_id: itemB, name: 'ZZ test item B', qty: 1 },
      { item_id: itemC, name: 'ZZ test item C', qty: 1 },
    ]);
    const r = await call('DELETE', `/requests/${rid}/items/${l2}`, INCHARGE);
    const [[c]] = await db.execute('SELECT COUNT(*) AS n FROM inventory_request_items WHERE request_id = ?', [rid]);
    check('T4 DELETE one of three → 200', r.status === 200, `got ${r.status}`);
    check('T4 two lines remain', Number(c.n) === 2 && !!(await line(l1)) && !!(await line(l3)) && !(await line(l2)));
    check('T4 request still PENDING', (await reqRow(rid)).status === 'PENDING');
  }

  // T5 — delete last line
  {
    const stockBefore = await stockOf(itemC);
    const { rid, lineIds: [l1] } = await addRequest([{ item_id: itemC, name: 'ZZ test item C', qty: 2 }]);
    const r = await call('DELETE', `/requests/${rid}/items/${l1}`, ADMIN);
    const h = await reqRow(rid);
    check('T5 DELETE last line → 200', r.status === 200 && r.json?.data?.cancelled === true, `got ${r.status}`);
    check('T5 request cancelled (status REJECTED + Cancelled remark)', h.status === 'REJECTED' && /^Cancelled/.test(h.remarks || ''), `${h.status} / ${h.remarks}`);
    check('T5 stock untouched', (await stockOf(itemC)) === stockBefore);
  }

  // ═══ AUTO-CANCEL NO-APPROVER FIX — REMOVABLE (start) ═══
  // T9 / T10 — deleting the last line cancels WITHOUT writing approver fields
  {
    const { rid, lineIds: [l1] } = await addRequest([{ item_id: itemA, name: 'ZZ test item A', qty: 1 }]);
    const r = await call('DELETE', `/requests/${rid}/items/${l1}`, INCHARGE);
    const h = await reqRow(rid);
    check('T9 last-line delete → REJECTED, approver_user_id/approver_role/decided_at all NULL',
      r.status === 200 && h.status === 'REJECTED' && h.approver_user_id == null && h.approver_role == null && h.decided_at == null,
      `status=${h.status} approver_user_id=${h.approver_user_id} approver_role=${h.approver_role} decided_at=${h.decided_at}`);
    check('T10 line gone and remark contains "Cancelled"',
      !(await line(l1)) && /Cancelled/.test(h.remarks || ''), `remarks=${h.remarks}`);
  }

  // T11 — regression: a normal faculty REJECT still writes approver fields.
  // Uses the CURRENT effective PROJECT approver id (read-only; no settings written).
  {
    const { getApprovers } = await import('../src/features/inventory/inventory.services.js');
    const { project_approver_user_id: facultyId } = await getApprovers();
    const FACULTY = { user_id: facultyId, role_id: 2, name: 'Test Faculty' };
    const { rid } = await addRequest([{ item_id: itemB, name: 'ZZ test item B', qty: 1 }]);
    const r = await call('POST', `/buying/${rid}/reject`, FACULTY, { remarks: 'test reject' });
    const h = await reqRow(rid);
    check('T11 faculty reject still writes approver_user_id + decided_at',
      r.status === 200 && h.status === 'REJECTED' && Number(h.approver_user_id) === Number(facultyId)
        && Number(h.approver_role) === 2 && h.decided_at != null,
      `got ${r.status} ${r.json?.message || ''} approver_user_id=${h.approver_user_id} decided_at=${h.decided_at}`);
  }
  // ═══ AUTO-CANCEL NO-APPROVER FIX — REMOVABLE (end) ═══

  // T6 / T7 — role 1 → 403, no token → 401
  {
    const { rid, lineIds: [l1] } = await addRequest([{ item_id: itemA, name: 'ZZ test item A', qty: 2 }]);
    const p6 = await call('PATCH', `/requests/${rid}/items/${l1}`, STUDENT, { quantity: 3 });
    const d6 = await call('DELETE', `/requests/${rid}/items/${l1}`, STUDENT);
    check('T6 PATCH as student → 403', p6.status === 403, `got ${p6.status}`);
    check('T6 DELETE as student → 403', d6.status === 403, `got ${d6.status}`);
    const p7 = await call('PATCH', `/requests/${rid}/items/${l1}`, null, { quantity: 3 });
    const d7 = await call('DELETE', `/requests/${rid}/items/${l1}`, null);
    check('T7 PATCH without token → 401', p7.status === 401, `got ${p7.status}`);
    check('T7 DELETE without token → 401', d7.status === 401, `got ${d7.status}`);
    const row = await line(l1);
    check('T6/T7 line unchanged', !!row && Number(row.quantity) === 2 && row.edited_at == null);
  }

  // T8 — regression: approving an untouched request deducts exactly as before
  {
    const aBefore = await stockOf(itemA); const bBefore = await stockOf(itemB);
    const { rid } = await addRequest([
      { item_id: itemA, name: 'ZZ test item A', qty: 7 },
      { item_id: itemB, name: 'ZZ test item B', qty: 2.5 },
    ]);
    const r = await call('POST', `/buying/${rid}/approve`, ADMIN);
    const [txns] = await db.execute('SELECT item_id, change_qty FROM inventory_stock_txns WHERE request_id = ? ORDER BY item_id', [rid]);
    const [obls] = await db.execute('SELECT COUNT(*) AS n FROM inventory_obligations WHERE buy_request_id = ?', [rid]);
    check('T8 approve → 200, status APPROVED', r.status === 200 && (await reqRow(rid)).status === 'APPROVED', `got ${r.status} ${r.json?.message || ''}`);
    check('T8 stock deducted exactly', (await stockOf(itemA)) === aBefore - 7 && (await stockOf(itemB)) === bBefore - 2.5,
      `A ${aBefore}->${await stockOf(itemA)}, B ${bBefore}->${await stockOf(itemB)}`);
    check('T8 BUY_APPROVED txns + obligations written', txns.length === 2 && Number(txns[0].change_qty) === -7 && Number(obls[0].n) === 2);
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
