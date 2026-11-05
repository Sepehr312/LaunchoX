// بررسی دیتابیس LaunchoX — این فایل را در mongosh داخل Compass اجرا کن
// Compass > اتصال به کلاستر > پایین صفحه: _MONGOSH (Ctrl+` برای باز کردن)
// کل این فایل را کپی کن و یک‌جا در پنجرهٔ mongosh پیست کن.

// ---------- ۱) آیا رپلیکاست است؟ ----------
// اگر setName برگشت، رپلیکاست است. اگر نبود، تک‌سرور است و تراکنش کار نمی‌کند.
const h = db.hello();
print("=== REPLICA SET CHECK ===");
print("setName       : " + (h.setName || "ندارد (تک‌سرور)"));
print("isWritablePrimary : " + h.isWritablePrimary);
print("hosts         : " + JSON.stringify(h.hosts || []));

// ---------- ۲) آیا تراکنش واقعاً کار می‌کند؟ ----------
print("=== TRANSACTION CHECK ===");
try {
  const s = db.getMongo().startSession();
  s.startTransaction();
  s.getDatabase("ldb")._tx_probe.insertOne({ at: new Date(), source: "deploy-check" });
  s.commitTransaction();
  s.endSession();
  print("TRANSACTION : OK");
} catch (e) {
  print("TRANSACTION : FAILED -> " + e.message);
}

// ---------- ۳) دسترسی نوشتن روی دیتابیس اپ ----------
print("=== WRITE CHECK (ldb) ===");
try {
  db.getSiblingDB("ldb")._tx_probe.insertOne({ probe: "write", at: new Date() });
  print("WRITE ldb   : OK");
} catch (e) {
  print("WRITE ldb   : FAILED -> " + e.message);
}

// ---------- ۴) پاک‌سازی probes ----------
try {
  db.getSiblingDB("ldb")._tx_probe.drop();
  db.getSiblingDB("ldb")._probe.drop();
  print("CLEANUP     : done");
} catch (e) {
  print("CLEANUP     : skipped -> " + e.message);
}

// ---------- ۵) نسخه و وضعیت ----------
print("=== SERVER ===");
print("version     : " + db.version());
print("dbName      : " + db.getName());
printjson(db.adminCommand({ connectionStatus: 1 }).authInfo);
