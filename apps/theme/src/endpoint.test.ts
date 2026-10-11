import { describe, expect, it } from "vitest";
import {
  resolveKomariOrigin,
  publicApiUrl,
  publicSocketUrl,
  nativeAdminUrl,
} from "./endpoint";

describe("Vercel NAT Komari endpoint isolation", () => {
  it("preserves same-origin Komari theme mode", () => {
    expect(resolveKomariOrigin("komari", undefined, "http://localhost:25774"))
      .toBe("http://localhost:25774");
  });
  it("fails closed without a configured HTTPS tunnel", () => {
    expect(resolveKomariOrigin("vercel", undefined, "https://my-web.vercel.app")).toBeNull();
    expect(resolveKomariOrigin("vercel", "http://api.example.com", "https://my-web.vercel.app")).toBeNull();
    expect(resolveKomariOrigin("vercel", "javascript:alert(1)", "https://my-web.vercel.app")).toBeNull();
    expect(resolveKomariOrigin("vercel", "https://user:pass@api.example.com", "https://my-web.vercel.app")).toBeNull();
    expect(resolveKomariOrigin("vercel", "https://api.example.com/a", "https://my-web.vercel.app")).toBeNull();
  });
  it("builds public API, WS and native admin on the tunnel host", () => {
    const host=resolveKomariOrigin("vercel", "https://komari.example.com/", "https://front.example.com");
    expect(host).toBe("https://komari.example.com");
    expect(publicApiUrl(host!, "/api/nodes")).toBe("https://komari.example.com/api/nodes");
    expect(publicSocketUrl(host!)).toBe("wss://komari.example.com/api/clients");
    expect(nativeAdminUrl(host!)).toBe("https://komari.example.com/admin");
  });
  it("rejects non-API URL inputs", () => {
    expect(() => publicApiUrl("https://komari.example.com", "https://other.invalid/api/nodes")).toThrow();
    expect(() => publicApiUrl("https://komari.example.com", "/admin")).toThrow();
    expect(() => publicApiUrl("https://komari.example.com", "//other.invalid/api/nodes")).toThrow();
  });
});
