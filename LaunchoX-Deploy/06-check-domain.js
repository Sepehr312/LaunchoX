#!/usr/bin/env node
/**
 * تست دامنه بعد از ثبت رکورد DNS
 *
 * اجرا:
 *   node 06-check-domain.js launchox.ir
 *
 * چه چیزی را چک می‌کند: انتشار DNS، باز شدن سایت، سلامت دیتابیس، ریدایرکت http به https
 * و ریدایرکت www به دامنهٔ اصلی.
 *
 * کنسول فقط لاتین نشان می‌دهد (Windows Terminal فارسی را برعکس می‌چیند)؛
 * متن فارسی در فایل last-result.txt نوشته می‌شود.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

const REPORT = path.join(__dirname, 'last-result.txt');
const domain = (process.argv[2] || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

const results = [];
const ok = (name, fa) => results.push({ level: 'OK', name, fa });
const warn = (name, fa) => results.push({ level: 'WARN', name, fa });
const fail = (name, fa) => results.push({ level: 'FAIL', name, fa });

async function resolve4(name) {
  try { return await dns.resolve4(name); } catch (e) { return null; }
}
async function resolveCname(name) {
  try { return await dns.resolveCname(name); } catch (e) { return null; }
}

// صفحهٔ پیش‌فرض رانفلر روی هر مسیری ۲۰۰ برمی‌گرداند؛ نباید آن را «سایت سالم» حساب کنیم.
function isRunflareDefault(body) {
  return /runflare default webpage|Welcome to Runflare/i.test(String(body || ''));
}

async function fetchInfo(url, followRedirect) {  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: followRedirect ? 'follow' : 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { 'user-agent': 'LaunchoX-deploy-check' },
    });
    let body = '';
    if (followRedirect) body = (await res.text()).slice(0, 400);
    return {
      ok: true,
      status: res.status,
      location: res.headers.get('location'),
      type: res.headers.get('content-type'),
      body,
      ms: Date.now() - started,
    };
  } catch (e) {
    const cause = e.cause ? e.cause.code || e.cause.message : e.message;
    return { ok: false, reason: cause, ms: Date.now() - started };
  }
}

function writeReport(extra) {
  const icon = { OK: '✔', WARN: '⚠', FAIL: '✖' };
  const lines = [
    'تست دامنه — LaunchoX',
    'دامنه: ' + domain,
    'زمان: ' + new Date().toISOString(),
    '─'.repeat(56),
  ];
  for (const r of results) {
    lines.push(`${icon[r.level]} ${r.name}`);
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
  console.log('DOMAIN CHECK');
  if (!domain) {
    console.log('usage: node 06-check-domain.js your-domain.com');
    process.exit(1);
  }
  console.log('domain: ' + domain);

  // ۱) DNS دامنهٔ اصلی
  const apex = await resolve4(domain);
  if (apex) ok('DNS_APEX', 'رکورد A پیدا شد: ' + apex.join(', '));
  else fail('DNS_APEX', 'رکورد A پیدا نشد؛ رکورد ثبت نشده یا هنوز منتشر نشده است');

  // ۲) www
  const wwwA = await resolve4('www.' + domain);
  const wwwCname = await resolveCname('www.' + domain);
  if (wwwA) ok('DNS_WWW', 'رکورد A برای www: ' + wwwA.join(', '));
  else if (wwwCname) ok('DNS_WWW', 'رکورد CNAME برای www: ' + wwwCname.join(', '));
  else warn('DNS_WWW', 'رکورد www پیدا نشد (اگر www نمی‌خواهی، طبیعی است)');

  // ۳) سلامت سرویس و اتصال دیتابیس
  const health = await fetchInfo(`https://${domain}/api/health`, true);
  if (!health.ok) fail('API_HEALTH', 'درخواست ناموفق: ' + health.reason);
  else if (isRunflareDefault(health.body)) {
    fail('API_HEALTH', 'پاسخ ۲۰۰ آمده، اما این صفحهٔ پیش‌فرض رانفلر است؛ یعنی برنامه هنوز روی این آدرس مستقر نشده است');
  } else if (health.status !== 200) fail('API_HEALTH', `کد پاسخ ${health.status} بود، نه ۲۰۰. بدنه: ${health.body.slice(0, 200)}`);
  else ok('API_HEALTH', `پاسخ ۲۰۰ در ${health.ms} میلی‌ثانیه: ${health.body.slice(0, 160)}`);

  // ۴) صفحهٔ اصلی
  const home = await fetchInfo(`https://${domain}/`, true);
  if (!home.ok) fail('HOME_PAGE', 'درخواست ناموفق: ' + home.reason);
  else if (isRunflareDefault(home.body)) {
    fail('HOME_PAGE', 'این صفحهٔ پیش‌فرض رانفلر است، نه فروشگاه. سرویس ساخته شده ولی کد روی آن اجرا نشده');
  } else if (home.status !== 200) fail('HOME_PAGE', `کد پاسخ ${home.status}`);
  else if (!String(home.type || '').includes('text/html')) fail('HOME_PAGE', 'پاسخ HTML نیست: ' + home.type);
  else ok('HOME_PAGE', `صفحهٔ اصلی باز شد (۲۰۰) در ${home.ms} میلی‌ثانیه`);

  // ۵) ریدایرکت http → https
  const http = await fetchInfo(`http://${domain}/`, false);
  if (!http.ok) warn('HTTP_REDIRECT', 'درخواست http ناموفق: ' + http.reason);
  else if ([301, 302, 307, 308].includes(http.status) && String(http.location || '').startsWith('https://')) {
    ok('HTTP_REDIRECT', `درست است: ${http.status} به ${http.location}`);
  } else if (http.status === 200) {
    warn('HTTP_REDIRECT', 'بدون ریدایرکت باز می‌شود؛ بهتر است http به https هدایت شود');
  } else {
    warn('HTTP_REDIRECT', 'پاسخ غیرمنتظره: ' + http.status);
  }

  // ۶) ریدایرکت www → دامنهٔ اصلی
  if (wwwA || wwwCname) {
    const w = await fetchInfo(`https://www.${domain}/`, false);
    if (!w.ok) warn('WWW_REDIRECT', 'درخواست ناموفق: ' + w.reason);
    else if ([301, 302, 307, 308].includes(w.status)) ok('WWW_REDIRECT', `${w.status} به ${w.location}`);
    else if (w.status === 200) warn('WWW_REDIRECT', 'نسخهٔ www بدون ریدایرکت باز می‌شود؛ دو نسخهٔ فعال داریم');
    else warn('WWW_REDIRECT', 'پاسخ غیرمنتظره: ' + w.status);
  }

  const count = (l) => results.filter((r) => r.level === l).length;
  const failCount = count('FAIL');
  const extra = failCount === 0
    ? 'همه‌چیز درست است. این آدرس را می‌توانی به دیگران بدهی.'
    : 'موارد قرمز را ببین؛ جدول عیب‌یابی در دفترچهٔ PDF (بخش ۱۱) همان موارد را توضیح داده است.';
  writeReport(extra);

  for (const r of results) console.log(`[${r.level}]`.padEnd(9) + r.name);
  console.log('');
  console.log(`RESULT: ${count('OK')} OK, ${count('WARN')} WARN, ${failCount} FAIL`);
  console.log('Persian details: last-result.txt');
  process.exit(failCount === 0 ? 0 : 1);
})();
