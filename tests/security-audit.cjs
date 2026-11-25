const { chromium, request } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SUARA_TEST_BASE || 'http://127.0.0.1:8010/';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Local targets only');
const directory = path.join(__dirname, '..', '.runtime');
fs.mkdirSync(directory, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(process.env.SUARA_SECURITY_FIXTURE || path.join(directory, 'security-fixture.json')));
const results = [], contexts = [];
const payload = '<img src=x onerror="window.__securityCanary=1">';
async function check(name, action) {
  try { await action(); results.push({ name, pass: true }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, pass: false, evidence: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
}
async function client() {
  const ctx = await request.newContext({ baseURL: base }); contexts.push(ctx);
  let state = await (await ctx.get('api/index.php')).json();
  return { ctx, get state() { return state; }, async post(data, options = {}) {
    const response = await ctx.post('api/index.php', { headers: { 'X-CSRF-Token': state.csrf, ...options.headers }, data, ...options });
    const body = await response.json(); if (response.ok()) state = body;
    return { status: response.status(), body, headers: response.headers() };
  }};
}
async function expectStatus(client, data, status) { const response = await client.post(data); assert.equal(response.status, status, JSON.stringify(response)); return response; }
(async () => {
  let browser;
  try {
    const guest = await client();
    await check('Unauthenticated API hides reports and notifications', async () => {
      assert.equal(guest.state.user, null); assert.deepEqual(guest.state.reports, []); assert.deepEqual(guest.state.notifications, []);
    });
    await check('Known shipped admin credential is rejected', async () => {
      const c = await client(); const r = await c.post({ action: 'login', identifier: 'admin@gmail.com', password: 'admin123' });
      assert.notEqual(r.status, 200, 'Default admin login succeeded');
    });
    await check('SQL injection cannot bypass login', async () => {
      for (const identifier of ["' OR 1=1 -- ", "admin@gmail.com' OR '1'='1", "H1' UNION SELECT 1,2,3,4 -- "]) {
        await expectStatus(guest, { action: 'login', identifier, password: 'NotThePassword123!' }, 401);
      }
    });
    await check('CSRF missing/wrong token and form submissions rejected', async () => {
      for (const token of ['', 'wrong-token']) {
        const r = await guest.ctx.post('api/index.php', { headers: { 'X-CSRF-Token': token }, data: { action: 'register' } }); assert.equal(r.status(), 403);
      }
      const form = await guest.ctx.post('api/index.php', { form: { action: 'login' } }); assert.equal(form.status(), 415);
    });
    await check('Invalid JSON, method, identifier type and oversized request rejected', async () => {
      const bad = await guest.ctx.post('api/index.php', { headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': guest.state.csrf }, data: '{' }); assert.equal(bad.status(), 400);
      assert.equal((await guest.ctx.put('api/index.php')).status(), 405);
      await expectStatus(guest, { action: 'login', identifier: ['admin@gmail.com'], password: 'badpassword' }, 422);
      const large = await guest.ctx.post('api/index.php', { headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': guest.state.csrf }, data: JSON.stringify({ action: 'login', padding: 'x'.repeat(4 * 1024 * 1024 + 32769) }) }); assert.equal(large.status(), 413);
    });
    const stamp = Date.now().toString(36).toUpperCase(), password = 'AuditStudentOnly-384!';
    const a = await client(), b = await client(), admin = await client();
    await expectStatus(a, { action: 'register', name: payload, nim: 'AUDITA' + stamp, email: 'a-' + stamp + '@example.test', password, role: 'admin' }, 200);
    await expectStatus(b, { action: 'register', name: 'Audit student B', nim: 'AUDITB' + stamp, email: 'b-' + stamp + '@example.test', password }, 200);
    await expectStatus(a, { action: 'login', identifier: 'AUDITA' + stamp, password }, 200);
    await expectStatus(b, { action: 'login', identifier: 'AUDITB' + stamp, password }, 200);
    await expectStatus(admin, { action: 'login', ...fixture }, 200);
    await check('Duplicate email and NIM rejected, including case and surrounding spaces', async () => {
      const registration = { action: 'register', name: 'Audit duplicate', nim: 'AUDITC' + stamp, email: 'a-' + stamp + '@example.test', password };
      await expectStatus(guest, registration, 409);
      await expectStatus(guest, { ...registration, email: '  A-' + stamp + '@EXAMPLE.TEST  ' }, 409);
      await expectStatus(guest, { ...registration, nim: 'AUDITA' + stamp, email: 'unique-' + stamp + '@example.test' }, 409);
      await expectStatus(guest, { ...registration, nim: ('  AUDITA' + stamp + '  ').toLowerCase(), email: 'other-' + stamp + '@example.test' }, 409);
      await expectStatus(guest, { ...registration, name: payload, nim: 'AUDITC' + stamp, email: 'c-' + stamp + '@example.test' }, 200);
    });
    await check('Invalid email, NIM, field types, control characters and invisible names rejected', async () => {
      const registration = { action: 'register', name: 'Audit input', nim: 'AUDITD' + stamp, email: 'd-' + stamp + '@example.test', password };
      for (const invalid of [{ email: 'not-an-email' }, { nim: 'NIM/../1' }, { name: ['array'] }, { name: 'bad\0name' }, { name: '\u200b\u00a0' }]) {
        await expectStatus(guest, { ...registration, ...invalid }, 422);
      }
      const array = await guest.ctx.post('api/index.php', { headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': guest.state.csrf }, data: '[]' }); assert.equal(array.status(), 400);
      const wrongType = await guest.ctx.post('api/index.php', { headers: { 'Content-Type': 'application/json-evil', 'X-CSRF-Token': guest.state.csrf }, data: '{}' }); assert.equal(wrongType.status(), 415);
    });
    await check('Registration cannot grant administrator role', async () => assert.equal(a.state.user.role, 'mahasiswa'));
    const report = { action: 'create', type: 'Aspirasi', category: 'Lainnya', title: payload, description: payload, location: payload };
    const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1kAAAAASUVORK5CYII=';
    const created = await expectStatus(a, { ...report, photo, user_id: b.state.user.id, status: 'Selesai', method: 'direct' }, 200);
    const code = created.body.reportId;
    await check('Report owner/status cannot be overwritten via extra fields', async () => {
      const saved = a.state.reports.find(r => r.id === code); assert.equal(saved.owner, a.state.user.id); assert.equal(saved.status, 'Menunggu Verifikasi');
    });
    await check('Cross-account read/edit/delete and photo access rejected', async () => {
      const ownPhoto = await a.ctx.get('api/index.php?photo=' + code); assert.equal(ownPhoto.status(), 200); assert.equal(ownPhoto.headers()['content-type'], 'image/png');
      assert.ok(!b.state.reports.some(r => r.id === code));
      await expectStatus(b, { ...report, action: 'edit', id: code }, 404);
      await expectStatus(b, { action: 'delete', id: code }, 404);
      assert.equal((await b.ctx.get('api/index.php?photo=' + code)).status(), 404);
      assert.equal((await guest.ctx.get('api/index.php?photo=' + code)).status(), 404);
    });
    await check('Student cannot change status or create/delete public agendas', async () => {
      await expectStatus(a, { action: 'follow-up', id: code, status: 'Selesai', method: 'direct', response: 'forged admin' }, 403);
      await expectStatus(a, { action: 'event-create' }, 403); await expectStatus(a, { action: 'event-delete', id: 1 }, 403);
    });
    await check('Guest cannot submit reports; admin cannot use student-only mutations', async () => {
      await expectStatus(guest, report, 401);
      await expectStatus(admin, report, 403);
      await expectStatus(admin, { action: 'delete', id: code }, 403);
    });
    await check('Boolean/float/array/null IDs and malformed actions are rejected', async () => {
      for (const id of [true, false, 1.5, [], {}, null, -1, '1 OR 1=1', '4294967296']) {
        await expectStatus(admin, { action: 'event-delete', id }, 422);
        await expectStatus(admin, { action: 'notifications-read', id }, 422);
      }
      for (const action of [null, [], {}, true, 'bad\0action']) await expectStatus(admin, { action }, 422);
    });
    await check('Executable/SVG/mislabeled/oversized photo uploads rejected', async () => {
      for (const photo of ['data:image/svg+xml;base64,' + Buffer.from('<svg onload="alert(1)"></svg>').toString('base64'), 'data:image/png;base64,' + Buffer.from('<?php echo "bad"; ?>').toString('base64'), 'data:image/jpeg;base64,' + Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64')]) {
        await expectStatus(a, { ...report, photo }, 422);
      }
    });
    await check('Malformed IDs and overlong fields rejected without SQL errors', async () => {
      await expectStatus(a, { action: 'delete', id: 'ST-1 OR 1=1' }, 404);
      await expectStatus(a, { ...report, title: 'x'.repeat(151) }, 422);
    });
    const agenda = { action: 'event-create', type: 'Forum Advokasi', title: payload, topics: payload, building: payload, room: payload, eventDate: '2026-11-28', startTime: '09:00', endTime: '10:00', status: 'draft' };
    await check('Invalid agenda dates, time ranges, types and statuses are rejected', async () => {
      for (const invalid of [{ eventDate: '2026-02-30' }, { startTime: '25:00' }, { endTime: '08:00' }, { type: 'Other event' }, { status: 'admin' }, { topics: [] }]) {
        await expectStatus(admin, { ...agenda, ...invalid }, 422);
      }
    });
    await expectStatus(admin, agenda, 200);
    const event = admin.state.events.at(-1);
    await check('Draft agenda stays private', async () => { const fresh = await client(); assert.ok(!fresh.state.events.some(e => e.id === event.id)); });
    await expectStatus(admin, { ...agenda, action: 'event-edit', id: event.id, status: 'published' }, 200);
    await check('Stored XSS is escaped in account, report, agenda and detail dialog', async () => {
      browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
      const context = await browser.newContext({ storageState: await a.ctx.storageState() }); const page = await context.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) errors.push(message.text()); });
      for (const hash of ['dashboard', 'riwayat', 'laporan/' + code, 'beranda']) {
        await page.goto(base + '#' + hash); await page.waitForFunction(() => csrf.length > 0); await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => window.__securityCanary), undefined); assert.equal(await page.locator('[onerror]').count(), 0);
      }
      await page.locator(`[data-agenda-detail="${event.id}"]`).click();
      assert.equal(await page.locator('#agenda-detail-dialog [onerror]').count(), 0); assert.deepEqual(errors, []); await context.close();
    });
    await check('Cross-account notification mark-read cannot change recipient notifications', async () => {
      const freshAdmin = await (await admin.ctx.get('api/index.php')).json(); const note = freshAdmin.notifications.find(n => !Number(n.isRead)); assert.ok(note);
      await expectStatus(b, { action: 'notifications-read', id: note.id }, 200);
      const after = await (await admin.ctx.get('api/index.php')).json(); assert.equal(Number(after.notifications.find(n => n.id === note.id).isRead), 0);
    });
    await check('Invalid status transition rejected; finished report cannot be edited', async () => {
      await expectStatus(admin, { action: 'follow-up', id: code, method: 'direct', status: 'Telah Dibahas', response: 'invalid' }, 409);
      await expectStatus(admin, { action: 'follow-up', id: code, method: 'direct', status: 'Selesai', response: 'Audit close' }, 200);
      await expectStatus(a, { ...report, action: 'edit', id: code }, 409);
    });
    await check('Session cookie hardened and identifier rotates on login/logout', async () => {
      const c = await client(); const before = (await c.ctx.storageState()).cookies.find(c => c.name === 'suara_teknik');
      assert.ok(before.httpOnly); assert.equal(before.sameSite, 'Lax');
      await expectStatus(c, { action: 'login', ...fixture }, 200); const after = (await c.ctx.storageState()).cookies.find(c => c.name === 'suara_teknik'); assert.notEqual(before.value, after.value);
      await expectStatus(c, { action: 'logout' }, 200); assert.equal(c.state.user, null); assert.deepEqual(c.state.reports, []);
      await expectStatus(c, { action: 'delete', id: code }, 401);
    });
    await check('Private SQL/config paths and encoded traversal blocked', async () => {
      for (const path of ['database/suara_teknik.sql', 'DATABASE/suara_teknik.sql', 'database%5csuara_teknik.sql', 'private/.htaccess', 'scripts/import-database.php', 'SCRIPTS/import-database.php', '.git', '.env', '.runtime/sessions/', '.RUNTIME/security-audit-canary.txt', '%64atabase/suara_teknik.sql', '%2e%2e/database/suara_teknik.sql']) {
        const r = await guest.ctx.get(path); assert.ok([403,404].includes(r.status()), path + ' HTTP ' + r.status());
      }
    });
    await check('Page has CSP and clickjacking protection', async () => {
      const r = await guest.ctx.get('/'); assert.ok(r.headers()['content-security-policy']?.includes("frame-ancestors 'none'")); assert.equal(r.headers()['x-frame-options'], 'DENY');
    });
    await check('Login guessing is throttled even with new session and spoofed proxy IP', async () => {
      let blocked;
      for (let i = 0; i < 12; i++) {
        const c = await client(); const r = await c.post({ action: 'login', identifier: 'guess-' + stamp + '@example.test', password: 'WrongPassword123!' }, { headers: { 'X-CSRF-Token': c.state.csrf, 'X-Forwarded-For': '192.0.2.' + i } });
        if (r.status === 429) { blocked = r; break; } assert.equal(r.status, 401);
      }
      assert.ok(blocked, '12 login guesses accepted without throttling'); assert.ok(Number(blocked.headers['retry-after']) > 0);
    });
    await check('Registration spam is throttled', async () => {
      let blocked;
      for (let i = 0; i < 21; i++) { const r = await guest.post({ action: 'register' }); if (r.status === 429) { blocked = r; break; } assert.equal(r.status, 422); }
      assert.ok(blocked); assert.ok(Number(blocked.headers['retry-after']) > 0);
    });
  } finally {
    if (browser) await browser.close(); for (const ctx of contexts) await ctx.dispose();
    const phase = process.env.SUARA_AUDIT_PHASE || 'baseline';
    fs.writeFileSync(path.join(directory, 'security-' + phase + '.json'), JSON.stringify({ base, date: new Date().toISOString(), results }, null, 2));
    console.log(`RESULT ${results.filter(r => r.pass).length}/${results.length} checks passed`);
    if (results.some(r => !r.pass)) process.exitCode = 1;
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
