#!/usr/bin/env node
/**
 * بررسی متغیرهای محیطی قبل از وارد کردن در پنل رانفلر
 *
 * اجرا:
 *   node 03-check-env.js
 *   node 03-check-env.js "C:\path\to\env.txt"
 *
 * چرا کنسول فقط انگلیسی نشان می‌دهد:
 *   Windows Terminal الگوریتم دوجهته (bidi) ندارد و فارسی را برعکس می‌چیند.
 *   پس کنسول فقط نام فیلد و وضعیت را با حروف لاتین نشان می‌دهد و متن فارسی
 *   در فایل last-result.txt نوشته می‌شود که Notepad درست نمایشش می‌دهد.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const file = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '02-env.production.txt');

const REPORT = path.join(__dirname, 'last-result.txt');
const results = []; // { level, name, fa }

const ok = (name, fa) => results.push({ level: 'OK', name, fa });
const warn = (name, fa) => results.push({ level: 'WARN', name, fa });
const fail = (name, fa) => results.push({ level: 'FAIL', name, fa });

function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const maskUri = (uri) => uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:****@');

function checkUrl(name, value, required) {
  if (!value) {
    if (required) fail(name, 'خالی است و الزامی است');
    else warn(name, 'خالی است');
    return;
  }
  if (value.includes('your-domain')) return fail(name, 'هنوز مقدار نمونه (your-domain.com) داخلش است');
  if (value.endsWith('/')) return fail(name, 'انتهای آدرس نباید اسلش داشته باشد');
  if (!value.startsWith('https://')) return fail(name, 'باید با https:// شروع شود');
  if (value.includes('localhost') || value.includes('127.0.0.1')) {
    return fail(name, 'روی سرور، localhost یعنی خود سرور؛ باید دامنهٔ واقعی باشد');
  }
  const rest = value.slice('https://'.length);
  if (rest.includes('/')) return warn(name, 'مسیر اضافه دارد؛ فقط دامنه لازم است');
  ok(name, value);
}

// ---------------------------------------------------------------- checks
let fatal = false;
if (!fs.existsSync(file)) {
  console.log('');
  console.log('[FAIL] ENV FILE');
  console.log('       ' + file);
  console.log('       file not found');
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(file, 'utf8'));

// ساختار رشتهٔ اتصال را واقعاً می‌شکافد؛ صرفاً «با mongodb شروع می‌شود» کافی نیست.
function analyzeUri(uri) {
  const m = String(uri).match(/^mongodb(\+srv)?:\/\/(?:([^:@/]+):([^@/]*)@)?([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!m) {
    return { error: 'ساختار نامعتبر است؛ قالب درست: mongodb://user:pass@host:27017/db' };
  }
  const srv = Boolean(m[1]);
  const user = m[2];
  const hostPart = m[4] || '';
  const dbPath = (m[5] || '').replace(/^\//, '');

  if (!user) {
    return { error: 'بخش «کاربر:رمز@» پیدا نشد. رشته باید شبیه mongodb://user:pass@host:27017/db باشد' };
  }
  for (const h of hostPart.split(',')) {
    const [host, port] = h.split(':');
    if (!host) return { error: 'نام میزبان خالی است' };
    if (!/^[A-Za-z0-9._-]+$/.test(host)) return { error: 'نام میزبان نامعتبر است: ' + host };
    if (port !== undefined) {
      if (srv) return { error: 'در حالت mongodb+srv نباید پورت بنویسی' };
      if (!/^\d+$/.test(port)) return { error: 'پورت نامعتبر است: ' + port };
      const n = Number(port);
      if (n < 1 || n > 65535) return { error: 'پورت خارج از بازهٔ مجاز است: ' + port };
    }
  }
  return { ok: true, srv, user, db: dbPath, hosts: hostPart };
}

// ۱) دیتابیس
const uri = env.MONGODB_URI || '';
if (!uri) {
  fail('MONGODB_URI', 'خالی است؛ رشتهٔ اتصال دیتابیس را بگذار');
} else {
  const info = analyzeUri(uri);
  if (info.error) {
    fail('MONGODB_URI', info.error + ' — مقدار فعلی: ' + maskUri(uri));
  } else if (/localhost|127\.0\.0\.1/.test(uri)) {
    fail('MONGODB_URI', 'به localhost اشاره می‌کند؛ روی سرور باید آدرس واقعی دیتابیس باشد');
  } else if (!info.db) {
    warn('MONGODB_URI', 'نام دیتابیس در مسیر نیست (مثل /ldb) — ' + maskUri(uri));
  } else {
    ok('MONGODB_URI', maskUri(uri) + ` — دیتابیس: ${info.db}`);
  }
}

// ۲) سکرت
const secret = env.AUTH_SECRET || '';
if (!secret) fail('AUTH_SECRET', 'خالی است');
else if (secret === 'replace-with-a-generated-secret') fail('AUTH_SECRET', 'مقدار نمونهٔ پروژه است و در production رد می‌شود');
else if (secret.length < 32) fail('AUTH_SECRET', `فقط ${secret.length} کاراکتر است؛ حداقل ۳۲ لازم است`);
else ok('AUTH_SECRET', `تأیید شد (${secret.length} کاراکتر)`);

// ۳) آدرس‌ها
checkUrl('AUTH_URL', env.AUTH_URL || '', true);
checkUrl('NEXT_PUBLIC_SITE_URL', env.NEXT_PUBLIC_SITE_URL || '', true);
if (env.AUTH_URL && env.NEXT_PUBLIC_SITE_URL && env.AUTH_URL !== env.NEXT_PUBLIC_SITE_URL) {
  fail('SITE_URLS_MATCH', 'AUTH_URL و NEXT_PUBLIC_SITE_URL باید دقیقاً یکی باشند');
}

// ۴) نام سایت
if (!env.NEXT_PUBLIC_SITE_NAME) warn('NEXT_PUBLIC_SITE_NAME', 'خالی است؛ نام پیش‌فرض نمایش داده می‌شود');
else ok('NEXT_PUBLIC_SITE_NAME', env.NEXT_PUBLIC_SITE_NAME);

// ۵) حساب ادمین
const email = env.SEED_ADMIN_EMAIL || '';
if (!email) fail('SEED_ADMIN_EMAIL', 'خالی است؛ بدون آن seed حساب ادمین نمی‌سازد');
else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('SEED_ADMIN_EMAIL', 'شکل ایمیل درست نیست');
else if (/@launchox\.local$/i.test(email)) warn('SEED_ADMIN_EMAIL', 'ایمیل نمونهٔ پروژه است؛ ایمیل واقعی بگذار');
else ok('SEED_ADMIN_EMAIL', email);

const pass = env.SEED_ADMIN_PASSWORD || '';
if (!pass) fail('SEED_ADMIN_PASSWORD', 'خالی است');
else if (pass === 'ChangeMe123!') fail('SEED_ADMIN_PASSWORD', 'مقدار نمونهٔ پروژه است؛ عوضش کن');
else if (pass.length < 8) fail('SEED_ADMIN_PASSWORD', 'کمتر از ۸ کاراکتر است');
else if (Buffer.byteLength(pass, 'utf8') > 72) fail('SEED_ADMIN_PASSWORD', 'بیشتر از ۷۲ بایت است (محدودیت bcrypt)');
else ok('SEED_ADMIN_PASSWORD', 'تأیید شد');

// ۶) درگاه پرداخت
if ((env.PAYMENT_PROVIDER || '') !== 'fake') warn('PAYMENT_PROVIDER', 'در این پروژه فقط fake پیاده‌سازی شده است');
else ok('PAYMENT_PROVIDER', 'fake (درست برای پروژهٔ آموزشی)');

// ۷) اعداد فروشگاه
for (const key of ['SHIPPING_FLAT_FEE', 'FREE_SHIPPING_THRESHOLD']) {
  const v = env[key];
  if (!v) warn(key, 'خالی است؛ مقدار پیش‌فرض استفاده می‌شود');
  else if (!/^\d+$/.test(v)) fail(key, 'باید عدد صحیح (تومان) باشد');
  else ok(key, v);
}

// ۸) موارد تکمیلی
const origins = env.IMAGE_INTERNAL_ORIGINS || '';
if (origins) {
  const bad = origins.split(',').map((s) => s.trim()).filter((s) => !/^https?:\/\/[^/]+$/.test(s));
  if (bad.length) fail('IMAGE_INTERNAL_ORIGINS', 'فقط origin مجاز است، بدون مسیر: ' + bad.join(' , '));
  else ok('IMAGE_INTERNAL_ORIGINS', origins);
}

const trust = env.AUTH_TRUST_PROXY_HEADERS || '';
if (trust && !['true', 'false'].includes(trust)) fail('AUTH_TRUST_PROXY_HEADERS', 'فقط true یا false');
else if (trust === 'true') warn('AUTH_TRUST_PROXY_HEADERS', 'true گذاشته‌ای؛ مطمئن شو پراکسی آدرس واقعی کاربر را بازنویسی می‌کند');
else ok('AUTH_TRUST_PROXY_HEADERS', 'خالی یا false (امن‌ترین پیش‌فرض)');

// ---------------------------------------------------------------- console (ASCII only)
console.log('');
console.log('ENV CHECK');
console.log('file: ' + file);
for (const r of results) {
  console.log(`[${r.level}]`.padEnd(9) + r.name);
}

const count = (l) => results.filter((r) => r.level === l).length;
const failCount = count('FAIL');

// ---------------------------------------------------------------- persian report
const icon = { OK: '✔', WARN: '⚠', FAIL: '✖' };
const faLines = [];
faLines.push('بررسی متغیرهای محیطی — LaunchoX');
faLines.push('فایل: ' + file);
faLines.push('زمان: ' + new Date().toISOString());
faLines.push('─'.repeat(56));
for (const r of results) {
  faLines.push(`${icon[r.level]} [${r.level}] ${r.name}`);
  faLines.push('   ' + r.fa);
}
faLines.push('─'.repeat(56));
faLines.push(`نتیجه: ${count('OK')} تأیید، ${count('WARN')} هشدار، ${failCount} خطا`);
faLines.push(failCount === 0
  ? 'این مقادیر را می‌توانی در پنل رانفلر وارد کنی.'
  : 'قبل از استقرار، خطاها را رفع کن.');

try {
  fs.writeFileSync(REPORT, '\uFEFF' + faLines.join('\r\n') + '\r\n', 'utf8');
} catch (_) { /* بی‌اهمیت */ }

console.log('');
console.log(`RESULT: ${count('OK')} OK, ${count('WARN')} WARN, ${failCount} FAIL`);
console.log('Persian details: last-result.txt');
process.exit(failCount === 0 ? 0 : 1);
