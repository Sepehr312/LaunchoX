#!/usr/bin/env node
/**
 * تست دسترسی شبکه به دیتابیس MongoDB
 *
 * اجرا:
 *   node 05-check-db-reach.js
 *
 * چه چیزی را ثابت می‌کند: مسیر شبکه تا سرور دیتابیس باز است.
 * چه چیزی را ثابت نمی‌کند: درست بودن رمز و کاربر (آن را Compass تست می‌کند).
 *
 * کنسول فقط لاتین نشان می‌دهد (Windows Terminal فارسی را برعکس می‌چیند)؛
 * متن فارسی در آخرین خط گزارش، در فایل last-result.txt نوشته می‌شود.
 */
'use strict';

const fs = require('fs');
const net = require('net');
const path = require('path');
const dns = require('dns').promises;

const envFile = path.join(__dirname, '02-env.production.txt');
const REPORT = path.join(__dirname, 'last-result.txt');

const results = [];
const ok = (name, fa) => results.push({ level: 'OK', name, fa });
const warn = (name, fa) => results.push({ level: 'WARN', name, fa });
const fail = (name, fa) => results.push({ level: 'FAIL', name, fa });

function readUri() {
  if (!fs.existsSync(envFile)) return '';
  const line = fs
    .readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('MONGODB_URI='));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
}

function parseUri(uri) {
  const m = uri.match(/^mongodb(\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)(\/[^?]*)?/);
  if (!m) return null;
  const hosts = m[2].split(',').map((h) => {
    const [host, port] = h.split(':');
    return { host, port: Number(port || 27017) };
  });
  return { srv: Boolean(m[1]), hosts, db: (m[3] || '').replace(/^\//, '') || '(بدون نام)' };
}

function tcpProbe(host, port, timeout = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ...result, ms: Date.now() - started });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, reason: 'زمان تمام شد (فایروال یا آدرس اشتباه)' }));
    socket.once('error', (err) => finish({ ok: false, reason: err.code || err.message }));
    socket.connect(port, host);
  });
}

function writeReport(extra) {
  const icon = { OK: '✔', WARN: '⚠', FAIL: '✖' };
  const lines = [
    'تست دسترسی به دیتابیس — LaunchoX',
    'زمان: ' + new Date().toISOString(),
    '─'.repeat(56),
  ];
  for (const r of results) {
    lines.push(`${icon[r.level]} [${r.level}] ${r.name}`);
    lines.push('   ' + r.fa);
  }
  lines.push('─'.repeat(56));
  const count = (l) => results.filter((r) => r.level === l).length;
  lines.push(`نتیجه: ${count('OK')} تأیید، ${count('WARN')} هشدار، ${count('FAIL')} خطا`);
  lines.push(extra);
  try {
    fs.writeFileSync(REPORT, '\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');
  } catch (_) { /* بی‌اهمیت */ }
  return count('FAIL');
}

(async () => {
  console.log('');
  console.log('DB REACHABILITY');

  const uri = readUri();
  if (!uri) {
    fail('MONGODB_URI', 'در فایل 02-env.production.txt خالی است. اول رشتهٔ اتصال را از پنل رانفلر بردار و همان‌جا بگذار.');
    const f = writeReport('اول رشتهٔ اتصال را در فایل env بگذار، بعد دوباره اجرا کن.');
    console.log('[FAIL]   MONGODB_URI (empty)');
    console.log(`RESULT: ${f} FAIL`);
    console.log('Persian details: last-result.txt');
    process.exit(1);
  }

  const parsed = parseUri(uri);
  if (!parsed) {
    fail('MONGODB_URI', 'رشتهٔ اتصال قابل خواندن نیست. باید با mongodb:// یا mongodb+srv:// شروع شود.');
    const f = writeReport('رشتهٔ اتصال را دوباره از پنل کپی کن.');
    console.log('[FAIL]   MONGODB_URI (unreadable)');
    console.log(`RESULT: ${f} FAIL`);
    console.log('Persian details: last-result.txt');
    process.exit(1);
  }

  ok('URI_FORMAT', `رشتهٔ اتصال خوانده شد. نوع: ${parsed.srv ? 'mongodb+srv (SRV)' : 'مستقیم'} — دیتابیس: ${parsed.db}`);

  let targets = parsed.hosts;

  if (parsed.srv) {
    const record = '_mongodb._tcp.' + parsed.hosts[0].host;
    try {
      const list = await dns.resolveSrv(record);
      ok('SRV_RECORD', `رکورد SRV پیدا شد: ${record} — ${list.length} میزبان`);
      targets = list.map((r) => ({ host: r.name, port: r.port }));
    } catch (e) {
      fail('SRV_RECORD', `رکورد SRV قابل خواندن نیست (${e.code || e.message})`);
      const f = writeReport('رشتهٔ اتصال یا دسترسی DNS را بررسی کن.');
      console.log('[FAIL]   SRV_RECORD');
      console.log(`RESULT: ${f} FAIL`);
      console.log('Persian details: last-result.txt');
      process.exit(1);
    }
  }

  let anyOk = false;
  for (const t of targets) {
    try {
      const ips = await dns.resolve4(t.host);
      ok('DNS_' + t.host, `آدرس resolve شد: ${ips.join(', ')}`);
    } catch (e) {
      warn('DNS_' + t.host, `نام resolve نشد (${e.code || e.message})`);
    }
    const probe = await tcpProbe(t.host, t.port);
    if (probe.ok) {
      anyOk = true;
      ok('TCP_' + t.host, `اتصال TCP برقرار شد به ${t.host}:${t.port} در ${probe.ms} میلی‌ثانیه`);
    } else {
      fail('TCP_' + t.host, `اتصال برقرار نشد به ${t.host}:${t.port} — ${probe.reason}`);
    }
  }

  const extra = anyOk
    ? 'مسیر شبکه باز است. مرحلهٔ بعد: تست کاربر و تراکنش در Compass با فایل 04-check-db.js.'
    : 'هیچ اتصالی برقرار نشد. احتمال‌ها: رشتهٔ اتصال اشتباه، بسته بودن دسترسی خارجی، یا فایروال.';
  const failCount = writeReport(extra) + (anyOk ? 0 : 1);

  for (const r of results) console.log(`[${r.level}]`.padEnd(9) + r.name);
  console.log('');
  console.log(anyOk ? 'RESULT: network path looks open' : 'RESULT: no connection');
  console.log('Persian details: last-result.txt');
  process.exit(anyOk ? 0 : 1);
})();
