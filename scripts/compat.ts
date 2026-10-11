/** Isolated native-kernel integration. Spawns ONLY a verified local binary on loopback. */
import WebSocket from "ws";
import { chromium } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { readFile, mkdir, mkdtemp, cp, writeFile, rm } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import {
  KomariClient,
  parseLive,
  unwrap,
} from "../packages/komari-client/src/index";
const root = resolve(import.meta.dirname, "..");
const lock = JSON.parse(
  await readFile(resolve(root, "komari.lock.json"), "utf8"),
);
const binary = resolve(
  process.env.KOMARI_BINARY ?? resolve(root, ".local/komari-linux-amd64"),
);
assert.equal(
  createHash("sha256")
    .update(await readFile(binary))
    .digest("hex"),
  lock.linuxAmd64.sha256,
  "unverified kernel binary",
);
await mkdir(resolve(root, ".local"), { recursive: true });
const cwd = await mkdtemp(resolve(root, ".local/compat-"));
// Disable the upstream GeoIP provider before startup; its default uses an
// external service. This fixture is a disposable SQLite database, not user data.
await mkdir(resolve(cwd, "data"), { recursive: true });
const seed = spawnSync(
  "python3",
  [
    "-c",
    `
import sqlite3, sys
with sqlite3.connect(sys.argv[1]) as db:
    db.execute('CREATE TABLE configs (key TEXT PRIMARY KEY, value TEXT)')
    db.executemany('INSERT INTO configs (key, value) VALUES (?, ?)', [
        ('geo_ip_enabled', 'false'), ('geo_ip_provider', '"empty"')
    ])
`,
    resolve(cwd, "data/komari.db"),
  ],
  { encoding: "utf8" },
);
assert.equal(seed.status, 0, seed.stderr || "failed to seed isolated settings");
const listener = createServer();
await new Promise<void>((res) => listener.listen(0, "127.0.0.1", res));
const address = listener.address();
assert(address && typeof address === "object");
const port = address.port;
await new Promise<void>((res) => listener.close(() => res()));
const base = `http://127.0.0.1:${port}`;
const kernel = spawn(binary, ["server", "--listen", `127.0.0.1:${port}`], {
  cwd,
  // Fail closed for upstream HTTP(S) calls; all test traffic uses loopback.
  env: {
    ...process.env,
    HTTP_PROXY: "http://127.0.0.1:9",
    HTTPS_PROXY: "http://127.0.0.1:9",
    http_proxy: "http://127.0.0.1:9",
    https_proxy: "http://127.0.0.1:9",
    NO_PROXY: "127.0.0.1,localhost,::1",
    no_proxy: "127.0.0.1,localhost,::1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
kernel.stdout.on("data", (d) => (logs += d));
kernel.stderr.on("data", (d) => (logs += d));
kernel.on("error", (e) => {
  logs += e.message;
});
const checks: { name: string; passed: boolean }[] = [];
const check = (name: string) => {
  checks.push({ name, passed: true });
  console.log(`PASS ${name}`);
};
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
async function ready(path: string) {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(base + path, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return;
    } catch {
      /* retry isolated startup */
    }
    await wait(100);
  }
  throw new Error(`Kernel startup timeout ${path}\n${logs}`);
}
const password = `Local${randomBytes(16).toString("hex")}A9`;
let cookie = "";
async function raw(path: string, body?: unknown, auth = false) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const json = await response.json();
  assert(response.ok, `${path}: HTTP ${response.status}`);
  return json;
}
const guest = new KomariClient((input, init) =>
  fetch(base + String(input), init),
);
try {
  await ready("/api/install/status");
  await raw("/api/install/complete", {
    username: "oioprobe-local",
    password,
    sitename: "OioProbe Local",
    description: "Disposable compatibility test",
    metric_dsn: "./data/metrics.db",
  });
  await ready("/api/version");
  assert.equal((await guest.version()).version, lock.version);
  check("pinned native 1.5.1 version");
  assert.equal((await guest.site()).name, "OioProbe Local");
  check("public settings envelope");
  assert.deepEqual(await guest.nodes(), []);
  check("empty node list");
  const login = await fetch(base + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "oioprobe-local", password }),
  });
  assert.equal(login.status, 200);
  cookie = login.headers
    .getSetCookie()
    .map((x) => x.split(";")[0])
    .join("; ");
  assert(cookie);
  check("native HttpOnly session login");
  const settings = unwrap(
    await raw("/api/admin/settings/", undefined, true),
  ) as Record<string, unknown>;
  assert.equal(settings.geo_ip_enabled, false);
  assert.equal(settings.geo_ip_provider, "empty");
  check("isolated fixture disables external GeoIP before startup");
  const visible = await raw(
    "/api/admin/client/add",
    { name: "OioProbe Synthetic" },
    true,
  );
  const hidden = await raw(
    "/api/admin/client/add",
    { name: "Hidden Synthetic" },
    true,
  );
  assert(visible.uuid && visible.token && hidden.uuid);
  await raw(
    `/api/admin/client/${visible.uuid}/edit`,
    {
      uuid: visible.uuid,
      region: "JP",
      group: "Lab",
      cpu_cores: 2,
      cpu_name: "Synthetic CPU",
      mem_total: 1024,
      disk_total: 2048,
      ipv4: "203.0.113.12",
      remark: "private note",
    },
    true,
  );
  await raw(
    `/api/admin/client/${hidden.uuid}/edit`,
    { uuid: hidden.uuid, hidden: true },
    true,
  );
  const publicNodes = await raw("/api/nodes");
  assert.equal(publicNodes.data.length, 1);
  assert(
    !publicNodes.data[0].token &&
      !publicNodes.data[0].ipv4 &&
      !publicNodes.data[0].remark,
  );
  assert.equal((await guest.nodes())[0].memoryTotal, 1024);
  check("visible list, hidden filtering and secret redaction");
  const rpc = await raw("/api/rpc2", {
    jsonrpc: "2.0",
    id: 1,
    method: "public:getNodesInformation",
  });
  assert.deepEqual(rpc.result, publicNodes.data);
  check("REST and public RPC2 parity");
  const report = {
    cpu: { usage: 42 },
    ram: { used: 512, total: 1024 },
    swap: { used: 0, total: 0 },
    disk: { used: 1024, total: 2048 },
    load: { load1: 0.5, load5: 0.4, load15: 0.3 },
    network: { up: 123, down: 456, totalUp: 789, totalDown: 1024 },
    connections: { tcp: 1, udp: 0 },
    uptime: 100,
    process: 2,
    updated_at: new Date().toISOString(),
  };
  const post = await raw(
    "/api/clients/v2/rpc?token=" + encodeURIComponent(visible.token),
    { jsonrpc: "2.0", id: 2, method: "agent.report", params: { report } },
  );
  assert(!post.error);
  check("synthetic v2 report ingestion");

  const hiddenReport = await raw(
    "/api/clients/v2/rpc?token=" + encodeURIComponent(hidden.token),
    { jsonrpc: "2.0", id: 3, method: "agent.report", params: { report } },
  );
  assert(!hiddenReport.error);

  const frame = await new Promise<unknown>((res, rej) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/clients`, {
      origin: base,
    });
    const timer = setTimeout(() => {
      ws.close();
      rej(new Error("WS timeout"));
    }, 5000);
    ws.onopen = () => ws.send("get");
    ws.onmessage = (e) => {
      clearTimeout(timer);
      try {
        res(JSON.parse(String(e.data)));
      } catch (err) {
        rej(err);
      }
      ws.close();
    };
    ws.onerror = () => {
      clearTimeout(timer);
      rej(new Error("WS error"));
    };
  });
  const live = parseLive(unwrap(frame));
  assert(live.online.includes(visible.uuid));
  assert(!live.online.includes(hidden.uuid));
  assert(
    !live.reports[hidden.uuid],
    "hidden report must not reach guest WebSocket",
  );
  assert.equal(live.reports[visible.uuid].cpu, 42);
  assert.equal(live.reports[visible.uuid].memory, 512);
  assert.equal(live.reports[visible.uuid].down, 456);
  check("native WS get envelope, online IDs and byte metric values");
  let history = await guest.history(visible.uuid);
  for (let i = 0; i < 40 && !history.some((point) => point.cpu === 42); i++) {
    await wait(250);
    history = await guest.history(visible.uuid);
  }
  assert(Array.isArray(history));
  assert(
    history.some((point) => point.cpu === 42),
    "synthetic CPU must survive native historical query",
  );
  check("native historical load response");
  await guest.ping(visible.uuid);
  check("native ping history response");
  await guest.pingTasks();
  check("native ping tasks response");
  await cp(
    resolve(root, "apps/theme/dist"),
    resolve(cwd, "data/theme/oioprobe/dist"),
    { recursive: true },
  );
  await cp(
    resolve(root, "apps/theme/komari-theme.json"),
    resolve(cwd, "data/theme/oioprobe/komari-theme.json"),
  );
  await raw("/api/admin/theme/set?theme=oioprobe", undefined, true);
  const html = await (await fetch(base + "/")).text();
  assert(html.includes("OioProbe · VPS 监控"));
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(
    (m) => m[1],
  );
  assert(assets.length >= 2);
  for (const asset of assets) {
    const res = await fetch(base + asset);
    assert.equal(res.status, 200);
    assert(!res.headers.get("content-type")?.includes("text/html"));
  }
  check("native theme selection, HTML and JS/CSS asset serving");
  assert.equal((await fetch(base + "/favicon.svg")).status, 200);
  check("theme favicon serving");
  const adminHtml = await (await fetch(base + "/admin/dashboard")).text();
  assert(!adminHtml.includes("OioProbe · VPS 监控"));
  check("native admin UI remains available");

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto(base + "/#/nodes");
    await page.getByRole("link", { name: "查看 OioProbe Synthetic" }).waitFor();
    await page.getByText("42.0%", { exact: true }).waitFor();
    assert.equal(await page.locator(".node-card .status.online").count(), 1);
    await page.screenshot({
      path: resolve(root, "evidence/native-browser-nodes.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "查看 OioProbe Synthetic" }).click();
    await page.getByRole("img", { name: "CPU 历史折线图" }).waitFor();
    assert.deepEqual(pageErrors, []);
    check(
      "Chromium end-to-end: native installed theme, live CPU, detail history and no page errors",
    );
  } finally {
    await browser.close();
  }

  await raw("/api/admin/settings/", { private_site: true }, true); // Correct route verified against the baseline router.
  const privateResponse = await fetch(base + "/api/nodes");
  assert.equal(privateResponse.status, 401);
  check("private site blocks unauthenticated nodes");
  await mkdir(resolve(root, "evidence"), { recursive: true });
  await writeFile(
    resolve(root, "evidence/native-compat.json"),
    JSON.stringify(
      {
        kernel: lock.version,
        commit: lock.commit,
        scope:
          "loopback disposable kernel; GeoIP disabled before startup; external HTTP(S) fails closed; synthetic nodes; no real agent or production",
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${checks.length} native compatibility checks passed`);
} catch (e) {
  await writeFile(
    resolve(root, "evidence/native-failure.txt"),
    String(e) + "\n" + logs,
  );
  throw e;
} finally {
  kernel.kill("SIGTERM");
  await Promise.race([
    new Promise((res) => kernel.once("exit", res)),
    wait(3000),
  ]);
  if (kernel.exitCode === null) kernel.kill("SIGKILL");
  await rm(cwd, { recursive: true, force: true });
}
