// ══ ITEM DELETE — REMOVABLE (whole file) ══
// Fixture-only HTTP tests for
//   DELETE /api/inventory/items/:itemId
//   POST   /api/inventory/items/:itemId/restore
//   GET    /api/inventory/stock?include_deleted=1
// plus the live-list vs history split: a removed item must vanish from the
// stock list and item search but stay in the consumption report.
//
// SAFETY: never runs against the DB in server/.env. It needs an explicit
// TEST_DB_* target, refuses a non-local host unless TEST_ALLOW_REMOTE=1, and
// signs its own tokens with a throwaway secret. It boots db.js's migration
// check against that target (which is how the two new columns get there).
// Fixtures use ids/names far from real data and are deleted at the end; the run
// fails if any touched table's row count differs from its starting count.
//
// Run (from server/):
//   TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=root TEST_DB_PASSWORD=... \
//   TEST_DB_NAME=pbl_test node tests/inventoryItemDelete.test.js

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
process.env.ACCESS_TOKEN_SECRET = 'inventory-item-delete-test-secret';
process.env.ACCESS_TOKEN_EXPIRY = '15m';

const { default: db, testConnection } = await import('../src/config/db.js');
const { default: app } = await import('../src/app.js');
const { generateAccessToken } = await import('../src/utils/jwt.js');

const TABLES = ['inventory_items', 'inventory_requests', 'inventory_request_items', 'inventory_stock_txns',
  'inventory_obligations', 'lab_purchases', 'labs', 'students', 'users'];
const CAT = 'ZZ_ITEMDEL_TEST';
const BASE = 991000000;
const STUDENT = { user_id: BASE + 1, role_id: 1, name: 'ZZ Del Student' };
const FACULTY = { user_id: BASE + 2, role_id: 2, name: 'ZZ Del Faculty' };
const ADMIN = { user_id: BASE + 3, role_id: 3, name: 'ZZ Del Admin' };
const INCHARGE = { user_id: BASE + 4, role_id: 4, name: 'ZZ Del Incharge' };
const MEMBER = { user_id: BASE + 5, role_id: 5, name: 'ZZ Del Member' };
const PAST_DAY = '2026-01-15';

const created = { items: [], requests: [], labs: [], studentId: null, userRow: false, extraStudents: [], extraUsers: [] };
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
     VALUES (?, ?, 'pcs', ?, 0, 1)`, [CAT, name, qty]);
  created.items.push(r.insertId);
  return r.insertId;
};
const addRequest = async (itemId, name, status, decidedAt = null, studentId = created.studentId) => {
  const [r] = await db.execute(
    `INSERT INTO inventory_requests (student_id, request_type, purpose_type, purpose, status, decided_at, created_at)
     VALUES (?, 'BUY', 'PROJECT', 'item-delete test fixture', ?, ?, COALESCE(?, NOW()))`,
    [studentId, status, decidedAt, decidedAt]);
  created.requests.push(r.insertId);
  const [li] = await db.execute(
    `INSERT INTO inventory_request_items (request_id, item_id, item_name, quantity, requested_quantity, unit)
     VALUES (?, ?, ?, 2, 2, 'pcs')`, [r.insertId, itemId, name]);
  return { rid: r.insertId, lineId: li.insertId };
};
const addObligation = async (itemId, name, rid, lineId, status, studentId = created.studentId, taken = 2) => {
  await db.execute(
    `INSERT INTO inventory_obligations (student_id, buy_request_id, buy_line_id, item_id, item_name, category, unit,
                                       taken_quantity, returned_quantity, is_returnable, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pcs', ?, ?, 0, ?)`,
    [studentId, rid, lineId, itemId, name, CAT, taken, status === 'CLEARED' ? taken : 0, status]);
};
const addLabPurchase = async (itemId, name, labId, { completed = false, createdAt = null,
  buyerUserId = MEMBER.user_id, buyerName = 'ZZ Del Member', qty = 1 } = {}) => {
  await db.execute(
    `INSERT INTO lab_purchases (lab_id, item_id, item_name, quantity, unit, buyer_user_id, buyer_name, created_at, completed_at)
     VALUES (?, ?, ?, ?, 'pcs', ?, ?, COALESCE(?, NOW()), ${completed ? 'NOW()' : 'NULL'})`,
    [labId, itemId, name, qty, buyerUserId, buyerName, createdAt]);
};
const addPerson = async (n, roleId, studentName) => {
  const userId = BASE + 100 + n;
  await db.execute(`INSERT INTO users (user_id, role_id, email, is_active) VALUES (?, ?, ?, 1)`,
    [userId, roleId, `zz-itemdel-${n}@test.invalid`]);
  created.extraUsers.push(userId);
  let studentId = null;
  if (studentName != null) {
    const [st] = await db.execute(`INSERT INTO students (user_id, reg_num, name, is_active) VALUES (?, ?, ?, 1)`,
      [userId, `ZZDEL${String(100 + n)}`, studentName]);
    studentId = st.insertId;
    created.extraStudents.push(studentId);
  }
  return { userId, studentId, email: `zz-itemdel-${n}@test.invalid`, reg: `ZZDEL${String(100 + n)}` };
};
const itemRow = async (id) => (await db.execute(`SELECT * FROM inventory_items WHERE item_id = ?`, [id]))[0][0];
const snapshot = async (id) => {
  const r = await itemRow(id);
  return r ? JSON.stringify({ q: Number(r.current_quantity), d: r.deleted_at, b: r.deleted_by_user_id, a: r.is_active }) : null;
};

const cleanup = async () => {
  const del = async (sql, ids) => { if (ids.length) await db.execute(sql.replace('(?)', `(${ids.map(() => '?').join(',')})`), ids); };
  await del(`DELETE FROM lab_purchases WHERE item_id IN (?)`, created.items);
  await del(`DELETE FROM inventory_obligations WHERE buy_request_id IN (?)`, created.requests);
  await del(`DELETE FROM inventory_stock_txns WHERE request_id IN (?)`, created.requests);
  await del(`DELETE FROM inventory_request_items WHERE request_id IN (?)`, created.requests);
  await del(`DELETE FROM inventory_requests WHERE request_id IN (?)`, created.requests);
  await del(`DELETE FROM inventory_stock_txns WHERE item_id IN (?)`, created.items);
  await del(`DELETE FROM inventory_items WHERE item_id IN (?)`, created.items);
  await del(`DELETE FROM labs WHERE lab_id IN (?)`, created.labs);
  if (created.studentId) await db.execute(`DELETE FROM students WHERE student_id = ?`, [created.studentId]);
  await del(`DELETE FROM students WHERE student_id IN (?)`, created.extraStudents);
  await del(`DELETE FROM users WHERE user_id IN (?)`, created.extraUsers);
  if (created.userRow) await db.execute(`DELETE FROM users WHERE user_id = ?`, [STUDENT.user_id]);
};

let server;
let before;
try {
  console.log('Booting db.js migration check against the TEST database…');
  if (!(await testConnection())) throw new Error('testConnection failed');

  const [cols] = await db.execute('DESCRIBE inventory_items');
  const has = (f) => cols.some((c) => c.Field === f);
  check('T0 boot adds deleted_at + deleted_by_user_id', has('deleted_at') && has('deleted_by_user_id'));

  before = await counts();

  // ── Fixtures ──
  await db.execute(`INSERT INTO users (user_id, role_id, email, is_active) VALUES (?, 1, 'zz-itemdel-student@test.invalid', 1)`, [STUDENT.user_id]);
  created.userRow = true;
  const [st] = await db.execute(
    `INSERT INTO students (user_id, reg_num, name, is_active) VALUES (?, 'ZZDEL0001', 'ZZ Del Student', 1)`, [STUDENT.user_id]);
  created.studentId = st.insertId;
  const [lab] = await db.execute(`INSERT INTO labs (lab_name, lab_code) VALUES ('ZZ Del Lab', 'ZZD')`);
  created.labs.push(lab.insertId);
  const LAB_ID = lab.insertId;

  const N = {
    clean: 'ZZDEL clean item', stocked: 'ZZDEL stocked item', owed: 'ZZDEL owed item', pend: 'ZZDEL pending item',
    two: 'ZZDEL two-reasons item', lab: 'ZZDEL open-lab item', hist: 'ZZDEL history item', reg: 'ZZDEL regular item',
  };
  const iClean = await addItem(N.clean, '0.00');
  const iStocked = await addItem(N.stocked, '5.00');
  const iOwed = await addItem(N.owed, '0.00');
  const iPend = await addItem(N.pend, '0.00');
  const iTwo = await addItem(N.two, '3.00');
  const iLab = await addItem(N.lab, '0.00');
  const iHist = await addItem(N.hist, '0.00');
  const iReg = await addItem(N.reg, '10.00');

  { const { rid, lineId } = await addRequest(iOwed, N.owed, 'APPROVED', `${PAST_DAY} 10:00:00`);
    await addObligation(iOwed, N.owed, rid, lineId, 'OPEN'); }
  await addRequest(iPend, N.pend, 'PENDING');
  { const { rid, lineId } = await addRequest(iTwo, N.two, 'APPROVED', `${PAST_DAY} 10:00:00`);
    await addObligation(iTwo, N.two, rid, lineId, 'OPEN'); }
  await addLabPurchase(iLab, N.lab, LAB_ID);
  // History item: a past APPROVED student request (obligation CLEARED) and a past
  // lab purchase marked completed — nothing outstanding, so it CAN be removed.
  { const { rid, lineId } = await addRequest(iHist, N.hist, 'APPROVED', `${PAST_DAY} 11:00:00`);
    await addObligation(iHist, N.hist, rid, lineId, 'CLEARED'); }
  await addLabPurchase(iHist, N.hist, LAB_ID, { completed: true, createdAt: `${PAST_DAY} 12:00:00` });

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
  const stockIds = async (user, extra = '') => {
    const r = await call('GET', `/stock?category=${encodeURIComponent(CAT)}${extra}`, user);
    return { status: r.status, rows: r.json?.data?.items || [] };
  };
  const searchIds = async (user, extra = '') => {
    const r = await call('GET', `/items?category=${encodeURIComponent(CAT)}${extra}`, user);
    return (r.json?.data?.items || []).map((x) => Number(x.item_id));
  };

  // Pre-feature column set of a GET /stock row — used by the regression check.
  const LEGACY_KEYS = ['item_id', 'category', 'subcategory', 'item_name', 'sub_name', 'unit', 'current_quantity',
    'rack_location', 'is_returnable', 'is_active', 'created_at', 'updated_at'].sort().join(',');

  console.log('\nRunning tests…');

  // T1 — clean item → 200, columns set, row still there
  {
    const r = await call('DELETE', `/items/${iClean}`, ADMIN);
    const row = await itemRow(iClean);
    check('T1 delete clean item → 200', r.status === 200, `got ${r.status} ${r.json?.message || ''}`);
    check('T1 deleted_at set + deleted_by_user_id = acting admin',
      row && row.deleted_at != null && Number(row.deleted_by_user_id) === ADMIN.user_id);
    check('T1 row still present in inventory_items', !!row);
  }

  // T2 — stock > 0 → 409 naming the quantity, nothing changed
  {
    const snap = await snapshot(iStocked);
    const r = await call('DELETE', `/items/${iStocked}`, INCHARGE);
    check('T2 stocked item → 409', r.status === 409, `got ${r.status}`);
    check('T2 message names the quantity', /Still has 5 pcs in stock\. Clear the stock first\./.test(r.json?.message || ''), r.json?.message);
    check('T2 nothing changed', (await snapshot(iStocked)) === snap);
  }

  // T3 — owed by a student → 409 naming the count
  {
    const r = await call('DELETE', `/items/${iOwed}`, ADMIN);
    check('T3 owed item → 409', r.status === 409, `got ${r.status}`);
    check('T3 message names the count', (r.json?.message || '').includes('1 student(s) still owe this item: ZZ Del Student (ZZDEL0001, 2 pcs)'), r.json?.message);
    check('T3 still active', (await itemRow(iOwed)).deleted_at == null);
  }

  // T4 — on a PENDING request → 409 ; open lab purchase → 409
  {
    const r = await call('DELETE', `/items/${iPend}`, INCHARGE);
    check('T4 pending-request item → 409', r.status === 409 && (r.json?.message || '').includes('1 pending request(s) include this item: #'), `${r.status} ${r.json?.message}`);
    check('T4 still active', (await itemRow(iPend)).deleted_at == null);
    const r2 = await call('DELETE', `/items/${iLab}`, ADMIN);
    check('T4b open lab purchase → 409', r2.status === 409 && (r2.json?.message || '').includes('1 lab purchase(s) still open on this item: ZZ Del Member (1 pcs)'), `${r2.status} ${r2.json?.message}`);
  }

  // T5 — two failing checks → both reasons
  {
    const r = await call('DELETE', `/items/${iTwo}`, ADMIN);
    const reasons = r.json?.reasons || [];
    check('T5 two-reason item → 409', r.status === 409, `got ${r.status}`);
    check('T5 both reasons in the message', (r.json?.message || '').includes('Still has 3 pcs in stock') && (r.json?.message || '').includes('1 student(s) still owe this item: ZZ Del Student'), r.json?.message);
    check('T5 reasons[] has exactly 2 entries', reasons.length === 2, JSON.stringify(reasons));
  }

  // T6 — gone from live lists, still in history
  {
    const r = await call('DELETE', `/items/${iHist}`, INCHARGE);
    check('T6 delete history item → 200', r.status === 200, `got ${r.status} ${r.json?.message || ''}`);
    const stock = await stockIds(ADMIN);
    check('T6 ABSENT from GET /inventory/stock', !stock.rows.some((x) => Number(x.item_id) === iHist));
    check('T6 ABSENT from student item search', !(await searchIds(STUDENT)).includes(iHist));
    check('T6 ABSENT from role-5 item search', !(await searchIds(MEMBER)).includes(iHist));
    const rep = await call('GET', `/reports/consumption?from=${PAST_DAY}&to=${PAST_DAY}`, ADMIN);
    const details = rep.json?.data?.details || [];
    check('T6 consumption report → 200', rep.status === 200, `got ${rep.status} ${rep.json?.message || ''}`);
    check('T6 PRESENT in consumption report (student request)',
      details.some((d) => d.item_name === N.hist && d.member_type === 'STUDENT'));
    check('T6 PRESENT in consumption report (lab purchase)',
      details.some((d) => d.item_name === N.hist && d.member_type !== 'STUDENT'));
  }

  // T7 — include_deleted honoured only for roles 3/4
  {
    for (const [label, user] of [['admin', ADMIN], ['incharge', INCHARGE]]) {
      const s = await stockIds(user, '&include_deleted=1');
      const row = s.rows.find((x) => Number(x.item_id) === iHist);
      check(`T7 include_deleted=1 as ${label} → item present + flagged`,
        s.status === 200 && row && Number(row.is_deleted) === 1 && row.deleted_at != null);
      const live = s.rows.find((x) => Number(x.item_id) === iReg);
      check(`T7 include_deleted=1 as ${label} → live item flagged not-deleted`, live && Number(live.is_deleted) === 0);
    }
    for (const [label, user] of [['student', STUDENT], ['role 5', MEMBER]]) {
      const s = await stockIds(user, '&include_deleted=1');
      check(`T7 include_deleted=1 as ${label} on /stock → 403, nothing exposed`, s.status === 403 && s.rows.length === 0, `got ${s.status}`);
      check(`T7 include_deleted=1 as ${label} on item search → still hidden`, !(await searchIds(user, '&include_deleted=1')).includes(iHist));
    }
  }

  // T8 — restore
  {
    const r = await call('POST', `/items/${iHist}/restore`, INCHARGE);
    const row = await itemRow(iHist);
    check('T8 restore → 200', r.status === 200, `got ${r.status} ${r.json?.message || ''}`);
    check('T8 both columns NULL again', row.deleted_at == null && row.deleted_by_user_id == null);
    check('T8 back in normal stock list', (await stockIds(ADMIN)).rows.some((x) => Number(x.item_id) === iHist));
    check('T8 back in student item search', (await searchIds(STUDENT)).includes(iHist));
    const again = await call('POST', `/items/${iHist}/restore`, ADMIN);
    check('T8 restore of a non-removed item → 409', again.status === 409, `got ${again.status}`);
  }

  // T9 — auth
  {
    const snap = await snapshot(iReg);
    const snapClean = await snapshot(iClean);
    for (const [label, user] of [['role 1', STUDENT], ['role 2', FACULTY], ['role 5', MEMBER]]) {
      const d = await call('DELETE', `/items/${iReg}`, user);
      const rs = await call('POST', `/items/${iClean}/restore`, user);
      check(`T9 DELETE as ${label} → 403`, d.status === 403, `got ${d.status}`);
      check(`T9 restore as ${label} → 403`, rs.status === 403, `got ${rs.status}`);
    }
    const d0 = await call('DELETE', `/items/${iReg}`, null);
    const r0 = await call('POST', `/items/${iClean}/restore`, null);
    check('T9 DELETE no token → 401', d0.status === 401, `got ${d0.status}`);
    check('T9 restore no token → 401', r0.status === 401, `got ${r0.status}`);
    check('T9 nothing changed by refused calls', (await snapshot(iReg)) === snap && (await snapshot(iClean)) === snapClean);
  }

  // T10 — regression on a normal, never-deleted item
  {
    const s = await stockIds(INCHARGE);
    const row = s.rows.find((x) => Number(x.item_id) === iReg);
    check('T10 regular item listed in /stock', !!row);
    check('T10 /stock row has exactly the pre-feature columns', row && Object.keys(row).sort().join(',') === LEGACY_KEYS,
      row ? Object.keys(row).sort().join(',') : 'missing');
    check('T10 regular item in student item search', (await searchIds(STUDENT)).includes(iReg));
    const cats = await call('GET', '/categories', STUDENT);
    check('T10 category still listed', (cats.json?.data?.items || []).some((c) => c.category === CAT));
    const add = await call('POST', `/stock/${iReg}/add`, INCHARGE, { quantity: 2 });
    check('T10 Add stock still works', add.status === 200 && Number(add.json?.data?.current_quantity) === 12, `${add.status} ${JSON.stringify(add.json?.data)}`);
    const one = await call('GET', `/items/${iReg}`, STUDENT);
    check('T10 GET /items/:id unchanged', one.status === 200 && Number(one.json?.data?.item_id) === iReg);
    const ov = await call('GET', '/admin/overview', ADMIN);
    check('T10 admin overview still 200', ov.status === 200, `got ${ov.status}`);
    check('T10 regular item never touched by delete columns', (await itemRow(iReg)).deleted_at == null);
  }

  // ── Write guard on a removed item (T11–T14) ──
  const REMOVED_MSG = 'This item has been removed from the inventory. Restore it first.';
  const fullRow = async (id) => {
    const r = await itemRow(id);
    return JSON.stringify({ c: r.category, s: r.subcategory, n: r.item_name, sn: r.sub_name, u: r.unit,
      q: Number(r.current_quantity), rk: r.rack_location, rt: Number(r.is_returnable), a: Number(r.is_active),
      d: r.deleted_at ? new Date(r.deleted_at).toISOString() : null, b: r.deleted_by_user_id });
  };
  const txnCount = async (id) => Number((await db.execute(
    `SELECT COUNT(*) AS n FROM inventory_stock_txns WHERE item_id = ?`, [id]))[0][0].n);
  const editPayload = (name, qty, rack) => ({ category: CAT, item_name: name, unit: 'pcs', current_quantity: qty,
    rack_location: rack, is_returnable: false });
  const iRem = await addItem('ZZDEL write-guard item', '0.00');
  {
    const d = await call('DELETE', `/items/${iRem}`, ADMIN);
    check('T11 setup: item removed', d.status === 200, `got ${d.status} ${d.json?.message || ''}`);
  }

  // T11 — Add stock to a removed item
  {
    const qBefore = Number((await itemRow(iRem)).current_quantity);
    const tBefore = await txnCount(iRem);
    const r = await call('POST', `/stock/${iRem}/add`, INCHARGE, { quantity: 4 });
    check('T11 Add stock to removed item → 409', r.status === 409, `got ${r.status}`);
    check('T11 message', r.json?.message === REMOVED_MSG, r.json?.message);
    check('T11 quantity unchanged in DB', Number((await itemRow(iRem)).current_quantity) === qBefore);
    check('T11 no stock txn written', (await txnCount(iRem)) === tBefore);
  }

  // T12 — Edit a removed item
  {
    const rowBefore = await fullRow(iRem);
    const tBefore = await txnCount(iRem);
    const r = await call('PUT', `/items/${iRem}`, ADMIN, editPayload('ZZDEL renamed while removed', 7, 'Z-9'));
    check('T12 Edit removed item → 409', r.status === 409, `got ${r.status}`);
    check('T12 message', r.json?.message === REMOVED_MSG, r.json?.message);
    check('T12 row unchanged', (await fullRow(iRem)) === rowBefore);
    check('T12 no stock txn written', (await txnCount(iRem)) === tBefore);
  }

  // T13 — restore, then both writes succeed as normal
  {
    const rs = await call('POST', `/items/${iRem}/restore`, INCHARGE);
    check('T13 restore → 200', rs.status === 200, `got ${rs.status}`);
    const add = await call('POST', `/stock/${iRem}/add`, INCHARGE, { quantity: 4 });
    check('T13 Add stock after restore → 200, qty 4',
      add.status === 200 && Number(add.json?.data?.current_quantity) === 4, `${add.status} ${add.json?.message || ''}`);
    const ed = await call('PUT', `/items/${iRem}`, ADMIN, editPayload('ZZDEL write-guard item', 6, 'R-1'));
    const row = await itemRow(iRem);
    check('T13 Edit after restore → 200', ed.status === 200, `${ed.status} ${ed.json?.message || ''}`);
    check('T13 edit applied (qty 6, rack R-1)', Number(row.current_quantity) === 6 && row.rack_location === 'R-1');
    check('T13 two txns logged (STOCK_ADD +4, STOCK_EDIT +2)', (await txnCount(iRem)) === 2);
  }

  // T14 — regression on a normal active item
  {
    const q0 = Number((await itemRow(iReg)).current_quantity);
    const t0 = await txnCount(iReg);
    const add = await call('POST', `/stock/${iReg}/add`, ADMIN, { quantity: 3 });
    check('T14 Add stock on active item → 200 and +3',
      add.status === 200 && Number(add.json?.data?.current_quantity) === q0 + 3, `${add.status} ${JSON.stringify(add.json?.data)}`);
    const ed = await call('PUT', `/items/${iReg}`, INCHARGE, editPayload('ZZDEL regular item', q0 + 3, 'B-2'));
    const row = await itemRow(iReg);
    check('T14 field-only Edit on active item → 200', ed.status === 200, `${ed.status} ${ed.json?.message || ''}`);
    check('T14 rack updated, qty unchanged', row.rack_location === 'B-2' && Number(row.current_quantity) === q0 + 3);
    check('T14 field-only edit logs no txn (only the STOCK_ADD)', (await txnCount(iReg)) === t0 + 1);
    const ed2 = await call('PUT', `/items/${iReg}`, INCHARGE, editPayload('ZZDEL regular item', q0, 'B-2'));
    check('T14 qty Edit → 200 and logs a STOCK_EDIT', ed2.status === 200
      && Number((await itemRow(iReg)).current_quantity) === q0 && (await txnCount(iReg)) === t0 + 2);
    const missing = await call('POST', `/stock/999999999999/add`, ADMIN, { quantity: 1 });
    check('T14 Add stock on unknown item still 404', missing.status === 404, `got ${missing.status}`);
  }

  // T15 — adjustStock (POST /stock/:id/edit) on a removed item
  {
    // iRem holds 6 after T13, and a delete requires zero stock: zero it, then remove.
    const z = await call('POST', `/stock/${iRem}/edit`, ADMIN, { quantity: 0 });
    const d = await call('DELETE', `/items/${iRem}`, INCHARGE);
    check('T15 setup: zeroed then removed', z.status === 200 && d.status === 200, `${z.status} / ${d.status} ${d.json?.message || ''}`);
    const qBefore = Number((await itemRow(iRem)).current_quantity);
    const tBefore = await txnCount(iRem);
    const r = await call('POST', `/stock/${iRem}/edit`, INCHARGE, { quantity: 9 });
    check('T15 adjustStock on removed item → 409', r.status === 409, `got ${r.status}`);
    check('T15 message', r.json?.message === REMOVED_MSG, r.json?.message);
    check('T15 quantity unchanged in DB', Number((await itemRow(iRem)).current_quantity) === qBefore);
    check('T15 no stock txn written', (await txnCount(iRem)) === tBefore);
  }

  // T16 — restore, then adjustStock succeeds as normal
  {
    const rs = await call('POST', `/items/${iRem}/restore`, ADMIN);
    check('T16 restore → 200', rs.status === 200, `got ${rs.status}`);
    const tBefore = await txnCount(iRem);
    const r = await call('POST', `/stock/${iRem}/edit`, INCHARGE, { quantity: 9 });
    check('T16 adjustStock after restore → 200, qty 9',
      r.status === 200 && Number(r.json?.data?.current_quantity) === 9 && Number((await itemRow(iRem)).current_quantity) === 9,
      `${r.status} ${r.json?.message || ''}`);
    check('T16 one STOCK_EDIT txn logged', (await txnCount(iRem)) === tBefore + 1);
  }

  // ── Named blockers (T17–T21) ──
  const pA = await addPerson(1, 1, 'ZZ Alpha');
  const pB = await addPerson(2, 1, 'ZZ Beta');
  const owe = async (itemId, name, person, taken) => {
    const { rid, lineId } = await addRequest(itemId, name, 'APPROVED', `${PAST_DAY} 09:00:00`, person.studentId);
    await addObligation(itemId, name, rid, lineId, 'OPEN', person.studentId, taken);
  };
  const blockedMsg = async (itemId) => {
    const r = await call('DELETE', `/items/${itemId}`, ADMIN);
    return { status: r.status, msg: r.json?.message || '', reasons: r.json?.reasons || [] };
  };

  // T17 — two students owe → both names + reg numbers
  {
    const it = await addItem('ZZDEL two owers', '0.00');
    await owe(it, 'ZZDEL two owers', pA, 5);
    await owe(it, 'ZZDEL two owers', pB, 2);
    const r = await blockedMsg(it);
    check('T17 → 409', r.status === 409, `got ${r.status}`);
    check('T17 both names, reg numbers and amounts listed',
      r.msg.includes(`2 student(s) still owe this item: ZZ Alpha (${pA.reg}, 5 pcs), ZZ Beta (${pB.reg}, 2 pcs)`), r.msg);
  }

  // T18 — six students owe → 5 names + "+1 more"
  {
    const it = await addItem('ZZDEL six owers', '0.00');
    for (let i = 1; i <= 6; i += 1) await owe(it, 'ZZDEL six owers', await addPerson(2 + i, 1, `ZZ Six ${i}`), 1);
    const r = await blockedMsg(it);
    const owedReason = r.reasons.find((x) => x.startsWith('6 student(s) still owe this item:')) || '';
    const listed = [1, 2, 3, 4, 5].every((i) => owedReason.includes(`ZZ Six ${i} (`));
    check('T18 → 409 with count 6', r.status === 409 && !!owedReason, r.msg);
    check('T18 five names listed', listed, owedReason);
    check('T18 sixth name NOT listed, "+1 more" appended', !owedReason.includes('ZZ Six 6') && owedReason.endsWith(' +1 more'), owedReason);
  }

  // T19 — no name row → email, never blank
  {
    const it = await addItem('ZZDEL nameless', '0.00');
    const member = await addPerson(9, 5, null);           // users row only: no profile/faculty/student
    await addLabPurchase(it, 'ZZDEL nameless', LAB_ID, { buyerUserId: member.userId, buyerName: null, qty: 3 });
    const blank = await addPerson(10, 1, '');             // student row with an empty name
    await owe(it, 'ZZDEL nameless', blank, 1);
    const r = await blockedMsg(it);
    check('T19 → 409', r.status === 409, `got ${r.status}`);
    check('T19 lab buyer with no name row shown by email',
      r.msg.includes(`1 lab purchase(s) still open on this item: ${member.email} (3 pcs)`), r.msg);
    check('T19 student with blank name shown by email', r.msg.includes(`${blank.email} (${blank.reg}, 1 pcs)`), r.msg);
    check('T19 no blank label', !/: \(|, \(|:\s*$/.test(r.msg), r.msg);
  }

  // T20 — pending request → request id + student name
  {
    const it = await addItem('ZZDEL pending named', '0.00');
    const { rid } = await addRequest(it, 'ZZDEL pending named', 'PENDING', null, pA.studentId);
    const r = await blockedMsg(it);
    check('T20 → 409', r.status === 409, `got ${r.status}`);
    check('T20 request id + name + reg listed',
      r.msg.includes(`1 pending request(s) include this item: #${rid} ZZ Alpha (${pA.reg})`), r.msg);
  }

  // T21 — thousand separators on the stock reason
  {
    const it = await addItem('ZZDEL big stock', '10000000.00');
    const r = await blockedMsg(it);
    check('T21 → 409', r.status === 409, `got ${r.status}`);
    check('T21 "Still has 10,000,000 pcs in stock"', r.msg.includes('Still has 10,000,000 pcs in stock. Clear the stock first.'), r.msg);
    check('T21 stock reason otherwise unchanged (no names appended)', r.reasons.length === 1, JSON.stringify(r.reasons));
  }

  // T22 — role-5 buyer: no profile/faculty/student row, but a stored buyer_name → that name, not the email
  {
    const it = await addItem('ZZDEL snapshot buyer', '0.00');
    const member = await addPerson(11, 5, null);          // users row only
    await addLabPurchase(it, 'ZZDEL snapshot buyer', LAB_ID, { buyerUserId: member.userId, buyerName: 'ZZ Snapshot Selva', qty: 10 });
    const r = await blockedMsg(it);
    check('T22 → 409', r.status === 409, `got ${r.status}`);
    check('T22 stored buyer_name shown', r.msg.includes('1 lab purchase(s) still open on this item: ZZ Snapshot Selva (10 pcs)'), r.msg);
    check('T22 email NOT shown', !r.msg.includes(member.email), r.msg);
  }

  // T23 — buyer with no name anywhere → email, as before
  {
    const it = await addItem('ZZDEL no-name buyer', '0.00');
    const member = await addPerson(12, 5, null);
    await addLabPurchase(it, 'ZZDEL no-name buyer', LAB_ID, { buyerUserId: member.userId, buyerName: '  ', qty: 2 });
    const r = await blockedMsg(it);
    check('T23 → 409', r.status === 409, `got ${r.status}`);
    check('T23 email shown', r.msg.includes(`1 lab purchase(s) still open on this item: ${member.email} (2 pcs)`), r.msg);
  }
} catch (err) {
  fail += 1;
  console.error('  ERROR', err);
} finally {
  if (server) await new Promise((r) => server.close(r));
  try { await cleanup(); } catch (e) { fail += 1; console.error('  CLEANUP ERROR', e); }
  if (before) {
    const after = await counts();
    const same = TABLES.every((t) => after[t] === before[t]);
    check('Cleanup: every table back to its starting row count', same, JSON.stringify({ before, after }));
  }
  await db.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
