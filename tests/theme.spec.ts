import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const widths = [320, 375, 390, 430, 768, 1440];
test("responsive overview, no overflow, accessible nodes and original design", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#/overview");
    await expect(
      page.getByRole("heading", { name: "服务器总览" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "查看 Tokyo · 01" }),
    ).toBeVisible();
    await expect(
      page.getByText("设计预览 · 所有节点与指标均为演示数据"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `evidence/${info.project.name}-overview-${width}.png`,
        fullPage: true,
      });
  }
  expect(errors).toEqual([]);
});
test("search, status, group, reset, list, details and history", async ({
  page,
}) => {
  await page.goto("/#/nodes");
  await expect(page.getByRole("link", { name: /查看 .* · 01/ })).toHaveCount(6);
  await page.getByRole("button", { name: "离线", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "查看 Frankfurt · 01" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /查看 .* · 01/ })).toHaveCount(1);
  await page.getByRole("button", { name: "全部节点", exact: true }).click();
  await page.getByLabel("搜索节点").fill("missing");
  await expect(page.getByText("没有匹配的节点")).toBeVisible();
  await page.getByRole("button", { name: "重置筛选" }).click();
  await page.getByLabel("节点分组").selectOption("北美");
  await expect(page.getByRole("link", { name: /查看 .* · 01/ })).toHaveCount(2);
  await page.getByLabel("节点分组").selectOption("全部分组");
  await page.getByRole("button", { name: "列表视图" }).click();
  await expect(page.locator(".node-grid")).toHaveClass(/list-view/);
  await page.getByRole("link", { name: "查看 Tokyo · 01" }).click();
  await expect(page.getByRole("heading", { name: "节点信息" })).toBeVisible();
  await expect(page.getByRole("img", { name: "CPU 历史折线图" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "实时资源" })).toBeVisible();
  await page.getByLabel("历史时间范围").selectOption("24");
});
test("navigation skeleton, mobile menu, theme persistence, design system", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/overview");
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("link", { name: "网络", exact: true }).click();
  await expect(
    page.getByText("页面骨架已完成，网络数据不在此阶段展示。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "打开导航" }).click();
  await page.getByRole("link", { name: "告警", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "让重要变化，及时被看见" }),
  ).toBeVisible();
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `evidence/${info.project.name}-settings-dark.png`,
    fullPage: true,
  });
  await page.goto("/#/design");
  await expect(
    page.getByRole("heading", { name: "OioProbe 设计语言" }),
  ).toBeVisible();
  await page.goto("/#/nodes/not-found");
  await expect(
    page.getByRole("heading", { name: "节点不存在或不可访问" }),
  ).toBeVisible();
});
test("live errors never silently become demo, private-site error, empty state", async ({
  page,
}) => {
  await page.route("**/api/nodes", (r) =>
    r.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"status":"error"}',
    }),
  );
  await page.route("**/api/public", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: '{"status":"success","data":{"private_site":true}}',
    }),
  );
  await page.goto("http://127.0.0.1:4174/#/overview");
  await expect(
    page.getByRole("heading", { name: "无法读取监控数据" }),
  ).toBeVisible();
  await expect(page.getByText("此站点需要登录")).toBeVisible();
  await expect(page.getByRole("link", { name: "查看 Tokyo · 01" })).toHaveCount(
    0,
  );
  await page.route("**/api/nodes", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: '{"status":"success","data":[]}',
    }),
  );
  await page.getByRole("button", { name: "重试连接" }).click();
  await expect(page.getByText("尚未接入节点")).toBeVisible();
});
test("live nested v2 data, stale reports never shown as current", async ({
  page,
}) => {
  await page.route("**/api/public", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: { sitename: "Lab" } }),
    }),
  );
  await page.route("**/api/nodes", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: [
          { uuid: "lab", name: "TestLab", mem_total: 1024, disk_total: 2048 },
        ],
      }),
    }),
  );
  await page.routeWebSocket("**/api/clients", (ws) => {
    ws.onMessage((message) => {
      if (message === "get")
        ws.send(
          JSON.stringify({
            status: "success",
            data: {
              online: ["lab"],
              data: {
                lab: {
                  cpu: { usage: 25 },
                  ram: { used: 512 },
                  disk: { used: 1024 },
                  network: { up: 100, down: 200 },
                  updated_at: new Date(Date.now() - 20000).toISOString(),
                },
              },
            },
          }),
        );
    });
  });
  await page.goto("http://127.0.0.1:4174/#/nodes");
  await expect(page.getByText("数据过期", { exact: true })).toBeVisible();
  await expect(page.getByText("25.0%")).toHaveCount(0);
});

test("keyboard focus, navigation landmarks and light/dark WCAG AA baseline", async ({
  page,
}) => {
  await page.goto("/#/overview");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到主内容" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page.getByRole("heading", { name: "服务器总览" })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "切换深色主题" }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});

test("public probe layout, geographic filter, collapse, zoom and globe", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/overview");
  await expect(page.locator(".site-header")).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "节点情况", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "网络概况", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "全球节点地理地图", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "筛选日本节点", exact: true }).click();
  await expect(page.getByRole("link", { name: /查看 .* · 01/ })).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "查看 Tokyo · 01" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /地区：JP/ }).click();
  await expect(page.getByRole("link", { name: /查看 .* · 01/ })).toHaveCount(6);
  const initialPath = await page.locator(".geo-land").getAttribute("d");
  await page.getByRole("button", { name: "放大地图", exact: true }).click();
  expect(await page.locator(".geo-land").getAttribute("d")).not.toBe(
    initialPath,
  );
  await page.getByRole("button", { name: "重置地图视角", exact: true }).click();
  await expect(page.locator(".geo-land")).toHaveAttribute("d", initialPath!);
  await page.getByRole("button", { name: "切换 3D 地球", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "全球节点球面投影地图", exact: true }),
  ).toBeVisible();
  const globePath = await page.locator(".geo-land").getAttribute("d");
  await page.getByRole("button", { name: "向左旋转地球", exact: true }).click();
  expect(await page.locator(".geo-land").getAttribute("d")).not.toBe(globePath);
  await page.getByRole("button", { name: "重置地图视角", exact: true }).click();
  await page.screenshot({
    path: `evidence/${info.project.name}-globe.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "地图筛选日本节点", exact: true })
    .click();
  await expect(page.getByRole("link", { name: /查看 .* · 01/ })).toHaveCount(1);
  await page.getByRole("button", { name: "收起地图", exact: true }).click();
  await expect(page.locator(".geo-canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "展开地图", exact: true }).click();
  await expect(page.locator(".geo-canvas")).toBeVisible();
});

test("denser cards retain byte units, resource quantities and native uptime; sorting", async ({
  page,
}) => {
  await page.goto("/#/nodes");
  const tokyo = page.getByRole("link", {
    name: "查看 Tokyo · 01",
    exact: true,
  });
  await expect(
    tokyo.getByText("3.4 GiB / 8.0 GiB", { exact: true }),
  ).toBeVisible();
  await expect(
    tokyo.getByText("累计 322.0 GiB", { exact: true }),
  ).toBeVisible();
  await expect(tokyo.getByText("已运行 12 天", { exact: true })).toBeVisible();
  const offline = page.getByRole("link", {
    name: "查看 Frankfurt · 01",
    exact: true,
  });
  await expect(offline.getByText("运行时间 —", { exact: true })).toBeVisible();
  await expect(
    offline.getByText("累计 322.0 GiB", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("节点排序").selectOption("cpu");
  await expect(page.locator(".node-card").first()).toHaveAttribute(
    "aria-label",
    "查看 Singapore · 01",
  );
});

test("system theme default, status counts, remembered view, menu escape", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/#/settings");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "跟随系统", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "浅色", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/nodes");
  const tabs = page.getByRole("group", { name: "节点状态筛选" });
  await expect(
    tabs.getByRole("button", { name: "离线", exact: true }),
  ).toContainText("1");
  await page.getByLabel("搜索节点").fill("tokyo");
  await expect(
    tabs.getByRole("button", { name: "全部节点", exact: true }),
  ).toContainText("1");
  await page.getByLabel("搜索节点").fill("");
  await page.getByRole("button", { name: "列表视图" }).click();
  await page.reload();
  await expect(page.locator(".node-grid")).toHaveClass(/list-view/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(
    page.getByRole("link", { name: "告警", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("link", { name: "告警", exact: true }),
  ).toBeHidden();
});

test("detail, list and settings pages meet WCAG AA in both themes", async ({
  page,
}) => {
  await page.goto("/#/nodes");
  await page.getByRole("button", { name: "列表视图" }).click();
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme as "light" | "dark" });
    for (const hash of ["#/nodes", "#/nodes/tokyo", "#/settings"]) {
      await page.goto(`/${hash}`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".panel, .node-card").first()).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          hash,
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
  }
});

test("CPU history chart shows a crosshair tooltip on hover", async ({
  page,
}) => {
  await page.goto("/#/nodes/tokyo");
  const chart = page.getByRole("img", { name: "CPU 历史折线图" });
  await expect(page.locator(".chart-tooltip")).toHaveCount(0);
  await chart.hover();
  await expect(page.locator(".chart-tooltip")).toContainText(/CPU \d+\.\d%/);
  await page.getByRole("heading", { name: "CPU 历史" }).hover();
  await expect(page.locator(".chart-tooltip")).toHaveCount(0);
});
