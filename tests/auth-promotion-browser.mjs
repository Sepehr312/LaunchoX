import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.LAUNCHO_AUTH_TEST_URL ?? "http://localhost:3000";
assert(
  process.env.BROWSER_PATH,
  "Set BROWSER_PATH to an installed Chromium browser",
);
const profile = await mkdtemp(join(tmpdir(), "launchox-login-"));
const browser = spawn(
  process.env.BROWSER_PATH,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      port = (
        await readFile(join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {
      await delay(500);
    }
  }
  assert(port, "Browser debugging port did not become ready");
  const targets = await (
    await fetch(`http://localhost:${port}/json/list`)
  ).json();
  socket = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  const browserErrors = [];
  const loaded = new Set();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (
      message.method === "Page.lifecycleEvent" &&
      message.params.name === "load"
    )
      loaded.add(message.params.loaderId);
    if (message.method === "Runtime.exceptionThrown")
      browserErrors.push(
        message.params.exceptionDetails.exception?.description ??
          message.params.exceptionDetails.text,
      );
    if (
      message.method === "Runtime.consoleAPICalled" &&
      message.params.type === "error"
    )
      browserErrors.push(
        message.params.args
          .map((arg) => arg.description ?? arg.value ?? "")
          .join(" "),
      );
    if (message.id) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
  };
  async function call(method, params = {}) {
    const id = ++sequence;
    const response = new Promise((resolve) => pending.set(id, resolve));
    socket.send(JSON.stringify({ id, method, params }));
    const message = await Promise.race([
      response,
      delay(90000, undefined, { ref: false }).then(() => {
        throw new Error(`Timeout: ${method}`);
      }),
    ]);
    assert(!message.error, JSON.stringify(message.error));
    return message.result;
  }
  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await call("Page.enable");
  await call("Page.setLifecycleEventsEnabled", { enabled: true });
  await call("Runtime.enable");
  await call("Network.enable");
  await call("Network.setExtraHTTPHeaders", {
    headers: {
      "x-forwarded-for": `127.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
    },
  });
  async function ready(expression) {
    for (let i = 0; i < 120; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(250);
    }
    throw new Error(`Condition failed: ${expression}`);
  }
  async function navigate(path) {
    const { loaderId, errorText } = await call("Page.navigate", {
      url: base + path,
    });
    assert(!errorText, errorText);
    for (let i = 0; !loaded.has(loaderId); i++) {
      assert(i < 240, `Navigation timeout: ${path}`);
      await delay(250);
    }
    await ready("document.readyState === 'complete'");
    console.log(`Loaded ${path}`);
  }
  async function formReady() {
    await ready(
      "document.querySelector('form') && Object.keys(document.querySelector('form')).some(k => k.startsWith('__reactProps'))",
    );
  }
  async function fill(id, value) {
    await evaluate(`(() => {
      const input = document.getElementById(${JSON.stringify(id)});
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
  }
  async function submit() {
    await evaluate("document.querySelector('button[type=submit]').click()");
  }
  async function session() {
    return evaluate("fetch('/api/auth/session').then(r => r.json())");
  }
  async function logout() {
    await navigate("/account");
    await ready(
      "[...document.querySelectorAll('button')].some(b => /^خروج(?: از حساب)?$/.test(b.textContent.trim()))",
    );
    await evaluate(
      "[...document.querySelectorAll('button')].find(b => /^خروج(?: از حساب)?$/.test(b.textContent.trim())).click()",
    );
    await ready("location.pathname === '/'");
    assert(!(await session())?.user);
  }
  const promoted = process.env.LAUNCHO_PROMOTED === "1";
  if (process.env.LAUNCHO_VISUAL_ONLY !== "1") {
    await navigate("/account");
    await ready("location.pathname === '/login'");
    await formReady();
    assert.equal(
      await evaluate("document.querySelector('[name=callbackUrl]').value"),
      "/account",
    );
    await fill("email", "missing-promotion@launchox.local");
    await fill("password", "Wrong123!");
    await submit();
    await ready(
      "document.querySelector('form [role=alert]')?.textContent.includes('ایمیل یا رمز عبور اشتباه است')",
    );
    assert(!(await session())?.user);
    await navigate("/register?callbackUrl=/account/addresses");
    await formReady();
    const email = `promotion-${Date.now()}@launchox.local`;
    try {
      await fill("name", "کاربر آزمایشی");
      await fill("email", email);
      await fill("password", "Customer123!");
      await fill("confirmPassword", "Different123!");
      await submit();
      await ready("document.querySelector('#confirmPassword-error')");
      assert.equal(
        await evaluate("document.querySelector('#email').value"),
        email,
      );
      await fill("confirmPassword", "Customer123!");
      if (promoted) {
        await ready(
          "document.querySelectorAll('form .lucide-snowflake').length === 4",
        );
      }
      await call("Network.enable");
      await call("Network.emulateNetworkConditions", {
        offline: false,
        latency: 400,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await submit();
      await ready(
        "document.querySelector('form')?.getAttribute('aria-busy') === 'true' && document.querySelector('button[type=submit]').disabled",
      );
      await call("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await ready("location.pathname === '/account/addresses'");
      const data = await session();
      assert.equal(data.user.email, email);
      assert.equal(data.user.role, "customer");
      assert(data.user.id);
      assert(!JSON.stringify(data).includes("passwordHash"));
      await navigate("/login");
      await ready("location.pathname === '/account'");
      await logout();
      await navigate("/login?callbackUrl=/account/addresses");
      await formReady();
      await fill("email", email);
      await fill("password", "Customer123!");
      await submit();
      await ready("location.pathname === '/account/addresses'");
      assert.equal((await session()).user.email, email);
      await logout();
      await navigate("/register");
      await formReady();
      await fill("name", "کاربر آزمایشی");
      await fill("email", email);
      await fill("password", "Customer123!");
      await fill("confirmPassword", "Customer123!");
      await submit();
      await ready(
        "document.querySelector('form [role=alert]')?.textContent.includes('این ایمیل قبلاً ثبت شده است')",
      );
      console.log(
        "PASS: development registration, auto-login, login, logout, session, callback redirect, guest and signed-in guards, validation, duplicate email, incorrect credentials and pending state.",
      );
    } finally {
      const { execFileSync } = await import("node:child_process");
      execFileSync(
        process.execPath,
        [
          "node_modules/tsx/dist/cli.mjs",
          "--conditions=react-server",
          "--env-file=.env.local",
          "-e",
          `import mongoose from 'mongoose'; import { connectDB } from './src/lib/db'; import { User } from './src/models/user'; async function cleanup() { try { await connectDB(); await User.deleteOne({ email: ${JSON.stringify(email)}, name: 'کاربر آزمایشی' }); } finally { await mongoose.disconnect(); } } cleanup().catch(() => { process.exitCode = 1; });`,
        ],
        { windowsHide: true, stdio: "pipe" },
      );
    }
  }
  if (promoted) {
    for (const width of [360, 390, 768, 1024, 1440]) {
      await call("Emulation.setDeviceMetricsOverride", {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      for (const [preview, production] of [
        ["/test/login", "/login"],
        ["/test/signup", "/register"],
      ]) {
        const snapshots = [];
        for (const route of [preview, production]) {
          await navigate(route);
          await formReady();
          await ready(
            "getComputedStyle(document.querySelector('section')).maxWidth === '520px'",
          );
          await evaluate("document.fonts.ready");
          await delay(200);
          assert(
            await evaluate(
              "document.documentElement.scrollWidth <= innerWidth",
            ),
            `Overflow: ${route} at ${width}`,
          );
          assert(
            await evaluate(
              "(() => { const r = document.querySelector('section').getBoundingClientRect(); return r.x >= 0 && r.right <= innerWidth; })()",
            ),
            `Card outside viewport: ${route}`,
          );
          snapshots.push(
            await evaluate(`(() => {
            const root = document.querySelector('header').parentElement;
            return [root, ...root.querySelectorAll('*')].map(element => {
              const rect = element.getBoundingClientRect();
              return { tag: element.tagName, text: element.children.length ? '' : element.textContent,
                geometry: [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n * 100) / 100),
                styles: [null, '::before', '::after'].map(pseudo => {
                  const style = getComputedStyle(element, pseudo);
                  return Object.fromEntries([...style].map(key => [key, style.getPropertyValue(key)]));
                }) };
            });
          })()`),
          );
          if (route === production) {
            const link = await evaluate(
              "document.querySelector('form + p a').getAttribute('href')",
            );
            assert(
              link.startsWith(
                production === "/login" ? "/register?" : "/login?",
              ),
            );
            assert.equal(
              await evaluate(
                "document.querySelectorAll('a[href^=\"/test/\"]').length",
              ),
              0,
            );
            const capture = await call("Page.captureScreenshot", {
              format: "png",
              captureBeyondViewport: false,
            });
            await writeFile(
              join(
                tmpdir(),
                `launchox-production-${production.slice(1)}-${width}.png`,
              ),
              Buffer.from(capture.data, "base64"),
            );
          }
        }
        assert.deepEqual(
          snapshots[1],
          snapshots[0],
          `${production} differs from ${preview} at ${width}px`,
        );
      }
      console.log(
        `PASS: exact DOM text, geometry and all computed styles including backgrounds/pseudo-elements match previews at ${width}px; production links and overflow checked.`,
      );
    }
    await navigate(
      "/login?callbackUrl=/account&error=CredentialsSignin&code=rate_limit",
    );
    await formReady();
    await ready(
      "document.querySelector('[role=alert]')?.textContent.includes('۱۵ دقیقه')",
    );
    await navigate("/login?callbackUrl=https://example.com");
    await formReady();
    assert.equal(
      await evaluate("document.querySelector('[name=callbackUrl]').value"),
      "/account",
    );
  }
  assert.deepEqual(browserErrors, []);
  await call("Browser.close");
} finally {
  socket?.close();
  browser.kill();
  browser.unref();
  await delay(1000);
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 500,
  }).catch(() => {});
}
