import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { NodeCard, bytes } from "./Metrics";
import { demoNodes, demoLive } from "../demo";
afterEach(cleanup);
describe("honest metric presentation", () => {
  it("formats IEC bytes and absent values", () => {
    expect(bytes(1024)).toBe("1.0 KiB");
    expect(bytes(1024, true)).toBe("1.0 KiB/s");
    expect(bytes(null)).toBe("—");
  });
  it("does not present cached offline data as current metrics", () => {
    const live = demoLive();
    live.online = [];
    render(<NodeCard node={demoNodes[0]} live={live} clock={Date.now()} />);
    expect(screen.getByText("离线")).toBeTruthy();
    expect(screen.queryByText("18.4%")).toBeNull();
  });
  it("identifies stale data and supports accessible detail navigation", () => {
    const live = demoLive();
    render(
      <NodeCard node={demoNodes[0]} live={live} clock={Date.now() + 16000} />,
    );
    expect(screen.getByText("数据过期")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "查看 Tokyo · 01" })
        .getAttribute("href"),
    ).toBe("#/nodes/tokyo");
  });
});
