const { request } = require('playwright');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const base = process.env.SUARA_TEST_BASE || 'http://127.0.0.1:8015/';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)
    || !/^suara_teknik_security_[a-z0-9_]+$/.test(process.env.SUARA_DB_NAME || '')) {
  throw Error('A local URL and isolated security database are required');
}
function php(args, input, expected = 0) {
  const result = spawnSync('php', args, { cwd: root, input, encoding: 'utf8', env: process.env });
  assert.equal(result.status, expected, result.stderr);
  return result.stdout;
}
(async () => {
  const stamp = Date.now().toString(36), password = randomBytes(20).toString('hex');
  const adminEmail = `cli-admin-${stamp}@example.test`, studentEmail = `cli-student-${stamp}@example.test`, nim = 'CLIAUDIT' + stamp.toUpperCase();
  php(['scripts/set-account.php', 'admin', 'CLI audit admin', adminEmail], password + '\n');
  php(['scripts/set-account.php', 'mahasiswa', 'CLI audit student', studentEmail, nim], password + '\n');
  php(['scripts/set-account.php', 'admin', 'CLI weak password', 'weak-' + adminEmail], 'short\n', 1);
  php(['scripts/set-account.php', 'mahasiswa', 'Duplicate NIM', 'duplicate-' + studentEmail, nim], password + '\n', 1);
  console.log('PASS CLI account creation, strong password requirement and duplicate NIM');
  const ctx = await request.newContext({ baseURL: base });
  try {
    let state = await (await ctx.get('api/index.php')).json();
    const login = await ctx.post('api/index.php', { headers: { 'X-CSRF-Token': state.csrf }, data: { action: 'login', identifier: adminEmail, password } });
    assert.equal(login.status(), 200); state = await login.json(); assert.equal(state.user.role, 'admin');
    const id = state.user.id;
    php(['scripts/set-account.php', 'admin', 'CLI updated admin', adminEmail], password + '\n');
    state = await (await ctx.get('api/index.php')).json(); assert.equal(state.user.id, id); assert.equal(state.user.name, 'CLI updated admin');
    console.log('PASS CLI updates preserve account ID');
    const externalHost = await ctx.get('api/index.php', { headers: { Host: 'suara.example.test', 'X-Forwarded-Proto': 'https' } });
    assert.equal(externalHost.status(), 403); assert.match((await externalHost.json()).error, /HTTPS/);
    console.log('PASS external-host HTTP rejected; spoofed proxy header does not bypass HTTPS');
    if (process.env.SUARA_SECURITY_SESSION_DIR) {
      const cookie = (await ctx.storageState()).cookies.find(c => c.name === 'suara_teknik'); assert.ok(cookie);
      assert.match(cookie.value, /^[a-zA-Z0-9,-]+$/);
      const sessionFile = path.join(process.env.SUARA_SECURITY_SESSION_DIR, 'sess_' + cookie.value);
      const session = fs.readFileSync(sessionFile, 'utf8'); assert.match(session, /authenticated_at\|i:\d+;/);
      fs.writeFileSync(sessionFile, session.replace(/authenticated_at\|i:\d+;/, 'authenticated_at|i:1;'));
      const expired = await (await ctx.get('api/index.php')).json(); assert.equal(expired.user, null); assert.deepEqual(expired.reports, []);
      console.log('PASS expired eight-hour session loses access');
    }
  } finally { await ctx.dispose(); }
  const probe = php([], `<?php
require 'api/config.php';
function verify($condition) { if (!$condition) throw new RuntimeException('Hosting policy check failed'); }
putenv('SUARA_ENV=production');
putenv('SUARA_OPEN_REGISTRATION');
verify(!appIsLocal() && !registrationIsOpen() && minimumPasswordLength() === 15);
verify(!passwordIsValid('short', 15) && passwordIsValid('A-long-test-password-2026', 15));
$_SERVER['HTTPS'] = 'off'; $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https'; putenv('SUARA_TLS_TERMINATED');
verify(!requestUsesHttps());
putenv('SUARA_TLS_TERMINATED=1'); verify(requestUsesHttps());
putenv('SUARA_OPEN_REGISTRATION=1'); verify(registrationIsOpen());
putenv('SUARA_DB_USER=root');
try { connectDatabase(); throw new LogicException('Database root was accepted'); }
catch (RuntimeException $error) { verify(str_contains($error->getMessage(), 'produksi')); }
echo 'PASS production registration policy, password minimum, trusted TLS configuration and dedicated DB requirement';
`);
  console.log(probe);
})().catch(error => { console.error(error); process.exitCode = 1; });
