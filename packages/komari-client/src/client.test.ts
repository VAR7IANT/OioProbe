import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ApiError,
  KomariClient,
  parseNodes,
  parseLive,
  parseHistory,
  percent,
  nodeStatus,
  subscribeLive,
  type SocketLike,
} from "./index";
const node = {
  uuid: "test",
  name: "Local",
  region: "JP",
  group: "lab",
  tags: "KVM;NVMe",
  cpu_cores: 2,
  mem_total: 1024,
  disk_total: 2048,
  token: "secret",
  ipv4: "203.0.113.9",
  remark: "private",
};
const rawReport = {
  cpu: { usage: 42 },
  ram: { used: 512 },
  disk: { used: 1024 },
  network: { up: 123, down: 456, totalUp: 789, totalDown: 1024 },
  uptime: 10,
  updated_at: new Date().toISOString(),
};
describe("Komari contract and privacy boundary", () => {
  it("whitelists public fields and splits tags", () => {
    const n = parseNodes([node])[0];
    expect(n.tags).toEqual(["KVM", "NVMe"]);
    expect(n).not.toHaveProperty("token");
    expect(n).not.toHaveProperty("ipv4");
    expect(n).not.toHaveProperty("remark");
  });
  it("accepts an empty list", () => expect(parseNodes([])).toEqual([]));
  it.each([null, {}, [{}]])("rejects incompatible nodes %j", (v) =>
    expect(() => parseNodes(v)).toThrow(ApiError),
  );
  it("preserves byte units and nested v2 report fields", () => {
    const r = parseLive({ online: ["test"], data: { test: rawReport } }).reports
      .test;
    expect(r.memory).toBe(512);
    expect(r.down).toBe(456);
    expect(r.totalDown).toBe(1024);
  });
  it("does not turn missing metrics into zero", () =>
    expect(
      parseLive({
        online: [],
        data: { x: { cpu: {}, ram: {}, disk: {}, network: {} } },
      }).reports.x.cpu,
    ).toBeNull());
  it.each([
    { online: "bad", data: {} },
    { online: [], data: [] },
    { online: [], data: { x: {} } },
  ])("rejects invalid live payload %j", (v) =>
    expect(() => parseLive(v)).toThrow(ApiError),
  );
  it("handles empty persisted history", () =>
    expect(parseHistory({ records: null, count: 0 })).toEqual([]));
  it("maps flat history metric fields", () =>
    expect(
      parseHistory({
        records: [
          { time: "2026-01-01", cpu: 3, ram: 4, net_in: 5, net_out: 6 },
        ],
      }),
    ).toEqual([
      { time: "2026-01-01", cpu: 3, memory: 4, disk: null, up: 6, down: 5 },
    ]));
  it.each([
    [512, 1024, 50],
    [0, 1024, 0],
    [1025, 1024, 100],
    [null, 1024, null],
    [1, 0, null],
  ])("percentage %s / %s", (used, total, result) =>
    expect(percent(used as number | null, total as number)).toBe(result),
  );
  it("distinguishes online, stale, offline, unknown", () => {
    const now = Date.now(),
      live = parseLive({ online: ["test"], data: { test: rawReport } });
    expect(nodeStatus("test", live, now)).toBe("online");
    expect(nodeStatus("test", live, now + 16000)).toBe("stale");
    expect(nodeStatus("absent", live, now)).toBe("offline");
    expect(nodeStatus("test", null, now)).toBe("unknown");
  });
  it("rejects future reports as stale", () =>
    expect(
      nodeStatus(
        "test",
        parseLive({
          online: ["test"],
          data: { test: { ...rawReport, updated_at: "2099-01-01" } },
        }),
      ),
    ).toBe("stale"));
  it("surfaces private-site errors without mock fallback", async () => {
    const c = new KomariClient(
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: "error", message: "Private site" }),
          ),
        ),
    );
    await expect(c.nodes()).rejects.toThrow("Private site");
  });
  it("surfaces HTTP and non-JSON errors", async () => {
    await expect(
      new KomariClient(
        vi.fn().mockResolvedValue(new Response("", { status: 401 })),
      ).nodes(),
    ).rejects.toThrow("需要登录");
    await expect(
      new KomariClient(
        vi.fn().mockResolvedValue(new Response("<html>")),
      ).nodes(),
    ).rejects.toThrow("JSON");
  });
  it("encodes UUID and validates history range", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: "success", data: { records: [] } }),
        ),
      );
    await new KomariClient(fn).history("a/b?secret", 4);
    expect(fn.mock.calls[0][0]).toContain("uuid=a%2Fb%3Fsecret");
    await expect(new KomariClient(fn).history("x", 0)).rejects.toThrow(
      "时间范围",
    );
  });
});
class Socket implements SocketLike {
  readyState = 1;
  send = vi.fn();
  onopen: WebSocket["onopen"] = null;
  onmessage: WebSocket["onmessage"] = null;
  onerror: WebSocket["onerror"] = null;
  onclose: WebSocket["onclose"] = null;
  close = vi.fn(() => {
    this.readyState = 3;
    this.onclose?.call(this as unknown as WebSocket, new CloseEvent("close"));
  });
  open() {
    this.onopen?.call(this as unknown as WebSocket, new Event("open"));
  }
  message(value: unknown) {
    this.onmessage?.call(
      this as unknown as WebSocket,
      new MessageEvent("message", { data: JSON.stringify(value) }),
    );
  }
}
describe("request-response WebSocket lifecycle", () => {
  afterEach(() => vi.useRealTimers());
  it("sends get on open and each second, cleans up on dispose", () => {
    vi.useFakeTimers();
    const s = new Socket(),
      fn = vi.fn(),
      state = vi.fn(),
      stop = subscribeLive(fn, state, {
        url: "ws://127.0.0.1/api/clients",
        factory: () => s,
      });
    s.open();
    expect(s.send).toHaveBeenCalledWith("get");
    s.message({ status: "success", data: { online: [], data: {} } });
    expect(fn).toHaveBeenCalledWith({ online: [], reports: {} });
    vi.advanceTimersByTime(2000);
    expect(s.send).toHaveBeenCalledTimes(3);
    stop();
    vi.advanceTimersByTime(60000);
    expect(s.send).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("reconnects after close with backoff, no reconnect after dispose", () => {
    vi.useFakeTimers();
    const a = new Socket(),
      b = new Socket(),
      factory = vi.fn().mockReturnValueOnce(a).mockReturnValue(b);
    const stop = subscribeLive(vi.fn(), vi.fn(), {
      url: "ws://127.0.0.1",
      factory,
    });
    a.open();
    a.close();
    vi.advanceTimersByTime(999);
    expect(factory).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(factory).toHaveBeenCalledTimes(2);
    stop();
    vi.advanceTimersByTime(30000);
    expect(factory).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed frames and reconnects", () => {
    vi.useFakeTimers();
    const a = new Socket(),
      state = vi.fn(),
      data = vi.fn(),
      stop = subscribeLive(data, state, {
        url: "ws://127.0.0.1",
        factory: () => a,
      });
    a.open();
    a.message({ status: "success", data: { online: "bad" } });
    expect(data).not.toHaveBeenCalled();
    expect(state).toHaveBeenCalledWith("error");
    expect(a.close).toHaveBeenCalled();
    stop();
  });
  it("closes a socket whose server stops responding", () => {
    vi.useFakeTimers();
    const a = new Socket(),
      stop = subscribeLive(vi.fn(), vi.fn(), {
        url: "ws://127.0.0.1",
        factory: () => a,
      });
    a.open();
    vi.advanceTimersByTime(13000);
    expect(a.close).toHaveBeenCalled();
    stop();
  });
});
