#!/usr/bin/env node
/**
 * دستیار راه‌اندازی LaunchoX — سرور محلی
 *
 * این برنامه فقط روی همین کامپیوتر (127.0.0.1) گوش می‌دهد و هیچ داده‌ای
 * به اینترنت نمی‌فرستد. کارش: گرفتن اطلاعات، نوشتن فایل تنظیمات، و تست‌ها.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const dns = require('dns').promises;
const { exec } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '02-env.production.txt');
const STATE_FILE = path.join(__dirname, 'state.json');
const UI_FILE = path.join(__dirname, 'ui.html');
const FONT_DIR = path.join(__dirname, 'fonts');

const KEY_ORDER = [
  'MONGODB_URI',
  'AUTH_SECRET',
  'AUTH_TRUST_PROXY_HEADERS',
  'AUTH_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SITE_NAME',
  'IMAGE_INTERNAL_ORIGINS',
  'PAYMENT_PROVIDER',
  'SHIPPING_FLAT_FEE',
  'FREE_SHIPPING_THRESHOLD',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
  'CONTACT_PHONE',
  'CONTACT_EMAIL',
  'CONTACT_ADDRESS',
];

// --------------------------------------------------------------- env file
function readEnv() {
  const map = {};
  if (!fs.existsSync(ENV_FILE)) return map;
  for (const raw of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    map[line.slice(0, i).trim()] = v;
  }
  return map;
}

function writeEnv(updates) {
  const current = readEnv();
  const merged = { ...current, ...updates };
  const lines = [
    '# متغیرهای محیطی production — LaunchoX',
    '# ساخته‌شده با دستیار راه‌اندازی. این فایل فقط روی کامپیوتر خودت است.',
    '',
  ];
  for (const key of KEY_ORDER) {
    lines.push(`${key}=${merged[key] === undefined ? '' : merged[key]}`);
  }
  const extras = Object.keys(merged).filter((k) => !KEY_ORDER.includes(k));
  if (extras.length) {
    lines.push('');
    for (const k of extras) lines.push(`${k}=${merged[k]}`);
  }
  fs.writeFileSync(ENV_FILE, lines.join('\r\n') + '\r\n', 'utf8');
  return merged;
}

// --------------------------------------------------------------- checks
const maskUri = (uri) => String(uri).replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

function normalizeUrl(value) {
  let v = String(value || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  return v.replace(/\/+$/, '');
}

// ساختار رشتهٔ اتصال را واقعاً می‌شکافد؛ «با mongodb شروع می‌شود» معیار کافی نیست.
function analyzeUri(uri) {
  const m = String(uri).match(/^mongodb(\+srv)?:\/\/(?:([^:@/]+):([^@/]*)@)?([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!m) return { error: 'ساختار نامعتبر؛ قالب: mongodb://user:pass@host:27017/db' };
  const srv = Boolean(m[1]);
  const user = m[2];
  const hostPart = m[4] || '';
  const dbPath = (m[5] || '').replace(/^\//, '');
  if (!user) return { error: 'بخش «کاربر:رمز@» پیدا نشد' };
  for (const h of hostPart.split(',')) {
    const [host, port] = h.split(':');
    if (!host) return { error: 'نام میزبان خالی است' };
    if (!/^[A-Za-z0-9._-]+$/.test(host)) return { error: 'نام میزبان نامعتبر: ' + host };
    if (port !== undefined) {
      if (srv) return { error: 'در حالت mongodb+srv نباید پورت بنویسی' };
      if (!/^\d+$/.test(port)) return { error: 'پورت نامعتبر: ' + port };
      const n = Number(port);
      if (n < 1 || n > 65535) return { error: 'پورت خارج از بازه: ' + port };
    }
  }
  return { ok: true, db: dbPath, user, hosts: hostPart };
}

function validateEnv(map) {
  const items = [];
  const push = (level, name, title, fa) => items.push({ level, name, title, fa });

  const uri = map.MONGODB_URI || '';
  if (!uri) push('FAIL', 'MONGODB_URI', 'رشتهٔ اتصال دیتابیس', 'خالی است. از پنل رانفلر، سرویس دیتابیس، Connection String را کپی کن.');
  else {
    const info = analyzeUri(uri);
    if (info.error) push('FAIL', 'MONGODB_URI', 'رشتهٔ اتصال دیتابیس', info.error + ' — مقدار فعلی: ' + maskUri(uri));
    else if (/localhost|127\.0\.0\.1/.test(uri)) push('FAIL', 'MONGODB_URI', 'رشتهٔ اتصال دیتابیس', 'به localhost اشاره می‌کند؛ روی سرور باید آدرس واقعی دیتابیس باشد.');
    else if (!info.db) push('WARN', 'MONGODB_URI', 'رشتهٔ اتصال دیتابیس', 'نام دیتابیس در مسیر نیست (مثل /ldb).');
    else push('OK', 'MONGODB_URI', 'رشتهٔ اتصال دیتابیس', maskUri(uri) + ' — دیتابیس: ' + info.db);
  }

  const secret = map.AUTH_SECRET || '';
  if (!secret) push('FAIL', 'AUTH_SECRET', 'کلید امنیتی نشست', 'خالی است؛ دکمهٔ «تولید کلید» را بزن.');
  else if (secret === 'replace-with-a-generated-secret') push('FAIL', 'AUTH_SECRET', 'کلید امنیتی نشست', 'مقدار نمونهٔ پروژه است؛ در production رد می‌شود.');
  else if (secret.length < 32) push('FAIL', 'AUTH_SECRET', 'کلید امنیتی نشست', `فقط ${secret.length} کاراکتر است؛ حداقل ۳۲ لازم است.`);
  else push('OK', 'AUTH_SECRET', 'کلید امنیتی نشست', `${secret.length} کاراکتر — مناسب`);

  const site = map.NEXT_PUBLIC_SITE_URL || '';
  if (!site) push('FAIL', 'NEXT_PUBLIC_SITE_URL', 'آدرس سایت', 'خالی است. دامنه یا آدرس موقت سرویس را بگذار.');
  else if (site.includes('your-domain')) push('FAIL', 'NEXT_PUBLIC_SITE_URL', 'آدرس سایت', 'هنوز مقدار نمونه داخلش است.');
  else if (!site.startsWith('https://')) push('FAIL', 'NEXT_PUBLIC_SITE_URL', 'آدرس سایت', 'باید با https:// شروع شود.');
  else push('OK', 'NEXT_PUBLIC_SITE_URL', 'آدرس سایت', site);

  if (map.AUTH_URL && map.NEXT_PUBLIC_SITE_URL && map.AUTH_URL !== map.NEXT_PUBLIC_SITE_URL) {
    push('FAIL', 'SITE_MATCH', 'هم‌خوانی آدرس‌ها', 'AUTH_URL و NEXT_PUBLIC_SITE_URL باید یکی باشند.');
  }

  const email = map.SEED_ADMIN_EMAIL || '';
  if (!email) push('FAIL', 'SEED_ADMIN_EMAIL', 'ایمیل ادمین', 'خالی است؛ بدون آن حساب ادمین ساخته نمی‌شود.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) push('FAIL', 'SEED_ADMIN_EMAIL', 'ایمیل ادمین', 'شکل ایمیل درست نیست.');
  else if (/@launchox\.local$/i.test(email)) push('WARN', 'SEED_ADMIN_EMAIL', 'ایمیل ادمین', 'ایمیل نمونهٔ پروژه است؛ بهتر است ایمیل واقعی بگذاری.');
  else push('OK', 'SEED_ADMIN_EMAIL', 'ایمیل ادمین', email);

  const pass = map.SEED_ADMIN_PASSWORD || '';
  if (!pass) push('FAIL', 'SEED_ADMIN_PASSWORD', 'رمز ادمین', 'خالی است.');
  else if (pass === 'ChangeMe123!') push('FAIL', 'SEED_ADMIN_PASSWORD', 'رمز ادمین', 'مقدار نمونهٔ پروژه است؛ عوضش کن.');
  else if (pass.length < 8) push('FAIL', 'SEED_ADMIN_PASSWORD', 'رمز ادمین', 'کمتر از ۸ کاراکتر است.');
  else if (Buffer.byteLength(pass, 'utf8') > 72) push('FAIL', 'SEED_ADMIN_PASSWORD', 'رمز ادمین', 'بیشتر از ۷۲ بایت است (محدودیت bcrypt).');
  else push('OK', 'SEED_ADMIN_PASSWORD', 'رمز ادمین', 'تنظیم شده (نمایش داده نمی‌شود)');

  if (!map.NEXT_PUBLIC_SITE_NAME) push('WARN', 'NEXT_PUBLIC_SITE_NAME', 'نام فروشگاه', 'خالی است؛ نام پیش‌فرض نمایش داده می‌شود.');
  else push('OK', 'NEXT_PUBLIC_SITE_NAME', 'نام فروشگاه', map.NEXT_PUBLIC_SITE_NAME);

  return items;
}

// --------------------------------------------------------------- network
function tcpProbe(host, port, timeout = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ...r, ms: Date.now() - started });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, reason: 'زمان تمام شد' }));
    socket.once('error', (err) => finish({ ok: false, reason: err.code || err.message }));
    socket.connect(port, host);
  });
}

function parseMongoUri(uri) {
  const m = String(uri).match(/^mongodb(\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(\/[^?]*)?/);
  if (!m) return null;
  const hosts = m[2].split(',').map((h) => {
    const [host, port] = h.split(':');
    return { host, port: Number(port || 27017) };
  });
  return { srv: Boolean(m[1]), hosts, db: (m[3] || '').replace(/^\//, '') || '(نامشخص)' };
}

async function testDatabase(uri) {
  const out = [];
  if (!uri) {
    out.push({ level: 'FAIL', name: 'DB_URI', title: 'دیتابیس', fa: 'رشتهٔ اتصال خالی است.' });
    return out;
  }
  const parsed = parseMongoUri(uri);
  if (!parsed) {
    out.push({ level: 'FAIL', name: 'DB_URI', title: 'دیتابیس', fa: 'رشتهٔ اتصال قابل خواندن نیست.' });
    return out;
  }
  out.push({ level: 'OK', name: 'DB_URI', title: 'رشتهٔ اتصال', fa: `دیتابیس مقصد: ${parsed.db}` });

  let targets = parsed.hosts;
  if (parsed.srv) {
    try {
      const list = await dns.resolveSrv('_mongodb._tcp.' + parsed.hosts[0].host);
      targets = list.map((r) => ({ host: r.name, port: r.port }));
      out.push({ level: 'OK', name: 'DB_SRV', title: 'رکورد SRV', fa: `${targets.length} میزبان پیدا شد` });
    } catch (e) {
      out.push({ level: 'FAIL', name: 'DB_SRV', title: 'رکورد SRV', fa: `خوانده نشد (${e.code || e.message})` });
      return out;
    }
  }

  for (const t of targets) {
    const probe = await tcpProbe(t.host, t.port);
    if (probe.ok) out.push({ level: 'OK', name: 'DB_TCP_' + t.host, title: `اتصال به ${t.host}`, fa: `برقرار شد در ${probe.ms} میلی‌ثانیه` });
    else out.push({ level: 'FAIL', name: 'DB_TCP_' + t.host, title: `اتصال به ${t.host}`, fa: `برقرار نشد — ${probe.reason}` });
  }
  return out;
}

// صفحهٔ پیش‌فرض رانفلر روی هر مسیری ۲۰۰ برمی‌گرداند؛ نباید سالم حساب شود.
function isRunflareDefault(body) {
  return /runflare default webpage|Welcome to Runflare/i.test(String(body || ''));
}

async function fetchInfo(url, follow) {  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: follow ? 'follow' : 'manual',
      signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'LaunchoX-wizard' },
    });
    let body = '';
    if (follow) body = (await res.text()).slice(0, 300);
    return { ok: true, status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type'), body, ms: Date.now() - started };
  } catch (e) {
    const cause = e.cause ? e.cause.code || e.cause.message : e.message;
    return { ok: false, reason: cause, ms: Date.now() - started };
  }
}

async function testSite(siteUrl) {
  const out = [];
  if (!siteUrl) {
    out.push({ level: 'WARN', name: 'SITE_URL', title: 'آدرس سایت', fa: 'آدرس سایت خالی است.' });
    return out;
  }
  const url = normalizeUrl(siteUrl);
  let host = '';
  try { host = new URL(url).hostname; } catch (_) { host = ''; }

  if (host && !host.includes('runflare')) {
    try {
      const ips = await dns.resolve4(host);
      out.push({ level: 'OK', name: 'DNS', title: 'DNS دامنه', fa: `${host} → ${ips.join(', ')}` });
    } catch (e) {
      out.push({ level: 'FAIL', name: 'DNS', title: 'DNS دامنه', fa: `${host} resolve نشد (${e.code || e.message})` });
    }
  }

  const home = await fetchInfo(url + '/', true);
  if (!home.ok) out.push({ level: 'FAIL', name: 'HOME', title: 'صفحهٔ اصلی', fa: `باز نشد: ${home.reason}` });
  else if (isRunflareDefault(home.body)) out.push({ level: 'FAIL', name: 'HOME', title: 'صفحهٔ اصلی', fa: 'صفحهٔ پیش‌فرض رانفلر است، نه فروشگاه — برنامه هنوز مستقر نشده' });
  else if (home.status !== 200) out.push({ level: 'FAIL', name: 'HOME', title: 'صفحهٔ اصلی', fa: `کد پاسخ ${home.status}` });
  else out.push({ level: 'OK', name: 'HOME', title: 'صفحهٔ اصلی', fa: `۲۰۰ در ${home.ms} میلی‌ثانیه` });

  const health = await fetchInfo(url + '/api/health', true);
  if (!health.ok) out.push({ level: 'FAIL', name: 'HEALTH', title: 'سلامت سرویس', fa: `باز نشد: ${health.reason}` });
  else if (isRunflareDefault(health.body)) out.push({ level: 'FAIL', name: 'HEALTH', title: 'سلامت سرویس', fa: 'صفحهٔ پیش‌فرض رانفلر جواب داده، نه برنامه — استقرار انجام نشده' });
  else if (health.status !== 200) out.push({ level: 'WARN', name: 'HEALTH', title: 'سلامت سرویس', fa: `کد پاسخ ${health.status} — اگر تازه ساخته شده، ممکن است هنوز بالا نیامده باشد` });
  else out.push({ level: 'OK', name: 'HEALTH', title: 'سلامت سرویس', fa: `/api/health → ۲۰۰ (اتصال دیتابیس برقرار است)` });

  return out;
}

// --------------------------------------------------------------- state
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return { tasks: {} }; }
}
function writeState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8'); } catch (_) { /* بی‌اهمیت */ }
}

// --------------------------------------------------------------- helpers
// باز کردن فایل یا آدرس با برنامهٔ پیش‌فرض ویندوز.
// خطا نباید برنامه را بکشد (مثلاً وقتی در محیط محدود اجرا می‌شود).
function openExternal(target) {
  try {
    const child = require('child_process').exec(`start "" "${target}"`, { shell: 'cmd.exe' });
    child.on('error', () => {});
    child.stdout && child.stdout.on('error', () => {});
    child.stderr && child.stderr.on('error', () => {});
  } catch (_) { /* بی‌اهمیت */ }
}

// --------------------------------------------------------------- http
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 200000) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (_) { resolve({}); }
    });
  });
}

function serveFile(res, file, type) {
  if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;

  if (req.method === 'GET' && (p === '/' || p === '/index.html')) return serveFile(res, UI_FILE, 'text/html; charset=utf-8');
  if (req.method === 'GET' && p.startsWith('/fonts/')) {
    const name = path.basename(p);
    return serveFile(res, path.join(FONT_DIR, name), name.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');
  }

  if (req.method === 'GET' && p === '/api/state') {
    const env = readEnv();
    return sendJson(res, 200, {
      env: {
        mongodbUri: env.MONGODB_URI || '',
        siteUrl: env.NEXT_PUBLIC_SITE_URL || '',
        email: env.SEED_ADMIN_EMAIL || '',
        siteName: env.NEXT_PUBLIC_SITE_NAME || '',
        secret: env.AUTH_SECRET || '',
        password: env.SEED_ADMIN_PASSWORD || '',
        hasPassword: Boolean(env.SEED_ADMIN_PASSWORD),
      },
      checks: validateEnv(env),
      tasks: readState().tasks || {},
    });
  }

  if (req.method === 'POST' && p === '/api/save') {
    const body = await readBody(req);
    const siteUrl = normalizeUrl(body.siteUrl);
    const updates = {
      MONGODB_URI: String(body.mongodbUri || '').trim(),
      AUTH_SECRET: String(body.secret || '').trim(),
      AUTH_URL: siteUrl,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      NEXT_PUBLIC_SITE_NAME: String(body.siteName || '').trim() || 'لانچو ایکس',
      SEED_ADMIN_EMAIL: String(body.email || '').trim(),
    };
    if (body.password) updates.SEED_ADMIN_PASSWORD = String(body.password);
    const merged = writeEnv(updates);
    const checks = validateEnv(merged);
    return sendJson(res, 200, { ok: !checks.some((c) => c.level === 'FAIL'), checks, siteUrl });
  }

  if (req.method === 'POST' && p === '/api/secret') {
    const secret = require('crypto').randomBytes(32).toString('hex');
    writeEnv({ AUTH_SECRET: secret });
    return sendJson(res, 200, { secret });
  }

  if (req.method === 'POST' && p === '/api/tests') {
    const env = readEnv();
    const [db, site] = await Promise.all([testDatabase(env.MONGODB_URI), testSite(env.NEXT_PUBLIC_SITE_URL)]);
    return sendJson(res, 200, { db, site });
  }

  if (req.method === 'POST' && p === '/api/task') {
    const body = await readBody(req);
    const state = readState();
    state.tasks = state.tasks || {};
    state.tasks[String(body.id)] = Boolean(body.done);
    writeState(state);
    return sendJson(res, 200, { ok: true, tasks: state.tasks });
  }

  if (req.method === 'POST' && p === '/api/open') {
    const body = await readBody(req);
    const targets = {
      pdf: path.join(ROOT, 'راهنمای-میزبانی-و-دامنه.pdf'),
      folder: ROOT,
    };
    const target = targets[body.what];
    if (target && fs.existsSync(target)) {
      openExternal(target);
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 200, { ok: false, error: 'not found' });
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

// --------------------------------------------------------------- start
let port = Number(process.env.WIZARD_PORT || 7717);
let tries = 0;

function listen() {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && tries < 20) {
      tries += 1;
      port += 1;
      listen();
    } else {
      console.log('[FAIL] cannot start wizard:', err.code || err.message);
      process.exit(1);
    }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/`;
    console.log('');
    console.log('LaunchoX Setup Wizard');
    console.log('open: ' + url);
    console.log('(close this window to stop the wizard)');
    openExternal(url);
  });
}

listen();
