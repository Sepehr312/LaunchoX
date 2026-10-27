import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.LAUNCHO_AUTH_TEST_URL ?? "http://localhost:3000";
assert(
  process.env.BROWSER_PATH,
  "Set BROWSER_PATH to an installed Chromium browser",
);
const credentials = JSON.parse(
  await readFile(
    new URL("../tmp/dashboard-customer.json", import.meta.url),
    "utf8",
  ),
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
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
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
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 180; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await delay(500);
    }
    throw new Error(`Condition failed: ${expression}`);
  }
  await call("Page.enable");
  await call("Runtime.enable");

  await call("Page.navigate", { url: `${base}/test/dashboard` });
  await waitFor(
    "location.pathname === '/login' && document.querySelector('#email')",
  );
  assert.equal(
    await evaluate("new URL(location.href).searchParams.get('callbackUrl')"),
    "/test/dashboard",
  );
  await evaluate(`(async () => {
    const csrf = await (await fetch('/api/auth/csrf')).json();
    const response = await fetch('/api/auth/callback/credentials', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' },
      body: new URLSearchParams({csrfToken: csrf.csrfToken, email: ${JSON.stringify(credentials.email)}, password: ${JSON.stringify(credentials.password)}, callbackUrl: '/test/dashboard'})
    });
    const result = await response.json();
    if (result.url.includes('error=')) throw new Error('Customer login failed');
  })()`);
  await mkdir(new URL("../tmp/dashboard-review/", import.meta.url), {
    recursive: true,
  });
  for (const width of [360, 768, 1024, 1440]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await call("Page.navigate", { url: `${base}/test/dashboard` });
    await waitFor(
      "document.querySelector('#latest-order-title') && document.fonts.status === 'loaded'",
    );
    assert(
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
      `Overflow at ${width}`,
    );
    assert.equal(
      await evaluate("document.querySelectorAll('header').length"),
      1,
    );
    assert.equal(
      await evaluate("document.querySelectorAll('footer').length"),
      1,
    );
    assert(
      await evaluate(
        `document.querySelector('main').textContent.includes(${JSON.stringify(credentials.email)})`,
      ),
    );
    const images = await evaluate(
      "Promise.all([...document.querySelector('main').querySelectorAll('img')].map(img => img.complete ? img.naturalWidth > 0 : new Promise(resolve => { img.onload = () => resolve(true); img.onerror = () => resolve(false); })))",
    );
    assert(images.every(Boolean), "Product images must load");
    if (width === 360) {
      await evaluate(
        "document.querySelector('[aria-controls=dashboard-menu]').click()",
      );
      await waitFor("document.querySelector('#dashboard-menu').open");
      await call("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Escape",
        code: "Escape",
        windowsVirtualKeyCode: 27,
      });
      await call("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Escape",
        code: "Escape",
        windowsVirtualKeyCode: 27,
      });
      await waitFor("!document.querySelector('#dashboard-menu').open");
      assert.equal(
        await evaluate("document.activeElement.getAttribute('aria-controls')"),
        "dashboard-menu",
      );
    }
    const screenshot = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      new URL(
        `../tmp/dashboard-review/dashboard-${width}.png`,
        import.meta.url,
      ),
      Buffer.from(screenshot.data, "base64"),
    );
  }
  const detail = await evaluate(
    "document.querySelector('a[href^=\"/account/orders/\"]').href",
  );
  await call("Page.navigate", { url: detail });
  await waitFor(
    "location.pathname.startsWith('/account/orders/') && document.querySelector('main')?.textContent.includes('LX-')",
  );
  assert(!browserErrors.length, JSON.stringify(browserErrors));
  console.log(
    "Customer dashboard browser checks passed: real login, callback, shared header/footer, responsive widths, loaded product images, mobile menu Escape/focus and order details.",
  );
  await call("Browser.close");
} finally {
  socket?.close();
  browser.kill();
  browser.unref();
  // The generated profile is constrained to the OS temporary directory.
  assert(profile.startsWith(join(tmpdir(), "launchox-login-")));
  await delay(1000);
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 500,
  }).catch(() => {});
}
