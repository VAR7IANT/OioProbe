import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const SHOTS = "evidence/grok-ui";
const DEMO = "演示数据。服务器、流量、延迟与丢包均为本地模拟";

async function settle(page: Page) {
  await expect(page.getByText(DEMO)).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

async function overflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      overflow: root.scrollWidth - root.clientWidth,
    };
  });
}

async function expectNoOverflow(page: Page) {
  const box = await overflow(page);
  expect(box.overflow, `horizontal overflow ${box.scrollWidth} > ${box.clientWidth}`).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => {
  await mkdir(SHOTS, { recursive: true });
});

test("public status UI renders, filters, and charts", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) return;
    failed.push(`${request.failure()?.errorText ?? "failed"} ${url}`);
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await settle(page);
  await expect(page.getByRole("link", { name: "hk-edge-01" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "列表视图" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${SHOTS}/desktop-1440.png` });
  await expectNoOverflow(page);

  await page.getByLabel("搜索节点、线路或服务商").fill("hk-edge-01");
  await expect(page.getByText("显示")).toBeVisible();
  await expect(page.getByRole("link", { name: "hk-edge-01" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "tyo-iij-01" })).toHaveCount(0);
  await page.getByRole("button", { name: "清除" }).click();
  await expect(page.getByRole("link", { name: "tyo-iij-01" })).toBeVisible();

  await page.getByRole("navigation", { name: "地区" }).getByRole("button", { name: "香港" }).click();
  await expect(page).toHaveURL(/region=hk/);
  await expect(page.getByRole("link", { name: "hk-gia-02" })).toBeVisible();
  await expect(page.getByRole("link", { name: "tyo-iij-01" })).toHaveCount(0);

  await page.getByRole("button", { name: /^离线/ }).click();
  await expect(page).toHaveURL(/status=offline/);
  await expect(page.getByRole("link", { name: "hk-bgp-04" })).toBeVisible();
  await expect(page.getByRole("link", { name: "hk-edge-01" })).toHaveCount(0);
  await page.getByRole("button", { name: "清除" }).click();

  await page.getByRole("button", { name: "卡片视图" }).click();
  await expect(page).toHaveURL(/view=cards/);
  await expect(page.getByRole("button", { name: "卡片视图" })).toHaveAttribute("aria-pressed", "true");
  await settle(page);
  await page.screenshot({ path: `${SHOTS}/cards-1440.png` });
  await expectNoOverflow(page);

  await page.getByRole("button", { name: "列表视图" }).click();
  await page.getByRole("link", { name: "hk-edge-01" }).first().click();
  await expect(page).toHaveURL(/\/nodes\/hk-edge-01/);
  await expect(page.getByRole("heading", { name: "hk-edge-01" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "处理器与内存" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "网络吞吐" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "延迟与丢包" })).toBeVisible();
  await expect(page.locator(".recharts-surface")).toHaveCount(3);
  await settle(page);
  await page.screenshot({ path: `${SHOTS}/detail-1440.png` });
  await expectNoOverflow(page);

  await page.getByRole("tab", { name: "1 小时" }).click();
  await expect(page).toHaveURL(/range=1h/);
  await expect(page.getByRole("tab", { name: "1 小时" })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".recharts-surface")).toHaveCount(3);
  await page.getByRole("tab", { name: "7 天" }).click();
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.locator(".recharts-surface")).toHaveCount(3);

  await page.getByRole("link", { name: "返回总览" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.getByRole("button", { name: "列表视图" })).toBeVisible();

  await page.getByRole("button", { name: "同步" }).click();
  await expect(page.getByText("正在同步演示源")).toBeVisible();
  await expect(page.getByRole("link", { name: "hk-edge-01" }).first()).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await settle(page);
  await expect(page.getByRole("link", { name: "hk-edge-01" }).first()).toBeVisible();
  await page.getByRole("button", { name: /^东京/ }).click();
  await expect(page).toHaveURL(/region=tyo/);
  await expect(page.getByRole("link", { name: "tyo-iij-01" })).toBeVisible();
  await expectNoOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await settle(page);
  await expect(page.getByRole("link", { name: "hk-edge-01" }).first()).toBeVisible();
  await expectNoOverflow(page);
  await page.screenshot({ path: `${SHOTS}/mobile-390.png`, fullPage: true });

  await page.getByRole("link", { name: "hk-edge-01" }).first().click();
  await expect(page.getByRole("heading", { name: "hk-edge-01" })).toBeVisible();
  await expect(page.locator(".recharts-surface")).toHaveCount(3);
  await expectNoOverflow(page);
  await page.getByRole("tab", { name: "24 小时" }).click();
  await expect(page).toHaveURL(/range=24h/);
  await page.getByRole("link", { name: "返回总览" }).click();
  await expect(page.getByText(DEMO)).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(failed, failed.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
