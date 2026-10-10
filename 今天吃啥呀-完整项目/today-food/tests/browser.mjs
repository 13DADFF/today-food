import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5189",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
await new Promise((r) => setTimeout(r, 1500));
process.on("exit", () => server.kill());
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
await page.goto("http://127.0.0.1:5189");
await page.getByRole("heading", { name: "今天吃啥呀", exact: true }).waitFor();
for (const width of [320, 375, 390, 430]) {
  await page.setViewportSize({ width, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    `宽度${width}无横向滚动`,
  );
}
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "mobile-preview.png", fullPage: true });
const spins = page.getByRole("button", { name: "帮我选一个！" });
await spins.first().click();
assert(await page.getByRole("button", { name: "幸运正在转动…" }).isDisabled());
await page
  .getByRole("button", { name: "好！就吃这个" })
  .waitFor({ timeout: 6000 });
await page.getByRole("button", { name: "好！就吃这个" }).click();
let state = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("today-food-v1")),
);
assert(state.choices[Object.keys(state.choices)[0]].lunch);
assert.equal(Object.keys(state.records).length, 0);
await page.getByRole("button", { name: "帮我选一个！" }).last().click();
await page
  .getByRole("button", { name: "好！就吃这个" })
  .waitFor({ timeout: 6000 });
await page.getByRole("button", { name: "好！就吃这个" }).click();
await page.getByRole("button", { name: "管理午餐菜单" }).click();
await page.getByLabel("食物名称", { exact: true }).fill("测试营养饭");
await page.getByLabel("参考热量（可选）").fill("520");
await page.getByRole("button", { name: "添加到菜单" }).click();
await page.getByRole("button", { name: "复制测试营养饭到另一菜单" }).click();
await page.getByRole("button", { name: "编辑测试营养饭", exact: true }).click();
await page.getByLabel("食物名称", { exact: true }).fill("测试蔬菜饭");
await page.getByRole("button", { name: "保存修改" }).click();
await page.getByRole("button", { name: "删除测试蔬菜饭", exact: true }).click();
await page.getByRole("button", { name: "关闭弹窗" }).click();
await page.getByRole("button", { name: "记录", exact: true }).first().click();
await page.getByLabel("食物名称", { exact: true }).fill("番茄牛腩饭");
assert.equal(await page.getByLabel("这份食物热量（kcal）").inputValue(), "650");
await page.getByRole("button", { name: "加入这一餐" }).click();
await page.getByLabel("食物名称", { exact: true }).fill("小点心");
await page.getByRole("button", { name: "按克数计算" }).click();
await page.getByLabel("每100克热量").fill("200");
await page.getByLabel("实际食用克数").fill("50");
await page.getByRole("button", { name: "加入这一餐" }).click();
await page.getByRole("button", { name: "确认吃过，保存记录" }).click();
state = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("today-food-v1")),
);
assert.equal(
  Object.values(state.records)[0].lunch.reduce((a, i) => a + i.kcal, 0),
  750,
);
const quote = await page.locator(".energy p").innerText();
await page.reload();
assert.equal(await page.locator(".energy p").innerText(), quote);
await page.getByRole("button", { name: "收藏今日语录" }).click();
await page.getByRole("button", { name: "我的收藏" }).click();
assert(await page.getByText(quote, { exact: true }).last().isVisible());
await page.getByRole("button", { name: "关闭弹窗" }).click();
await page.getByRole("button", { name: "给生活加一句温柔" }).click();
await page.getByLabel("写给自己的话").fill("今天也要认真照顾自己。");
await page.getByRole("button", { name: "添加我的语录" }).click();
await page.getByRole("button", { name: "编辑语录", exact: true }).click();
await page.getByLabel("写给自己的话").fill("今天也要安心吃饭。");
await page.getByRole("button", { name: "保存修改" }).click();
await page.getByRole("button", { name: "收藏语录", exact: true }).click();
await page.getByRole("button", { name: "删除语录", exact: true }).click();
await page.getByRole("button", { name: "关闭弹窗" }).click();
await page.getByRole("button", { name: "历史记录", exact: true }).click();
assert(
  await page
    .getByText("实际食用：番茄牛腩饭（650 kcal）、小点心（100 kcal）")
    .isVisible(),
);
await page.getByRole("button", { name: "编辑记录" }).first().click();
await page.getByRole("button", { name: "编辑记录小点心" }).click();
await page.getByLabel("这份食物热量（kcal）").fill("120");
await page.getByRole("button", { name: "更新这项食物" }).click();
await page.getByRole("button", { name: "确认吃过，保存记录" }).click();
await page.getByRole('button',{name:'历史记录',exact:true}).click();
await page.getByLabel('查看日期').fill('2026-10-09');
await page.getByRole('button',{name:'编辑记录'}).last().click();
await page.getByLabel('食物名称',{exact:true}).fill('昨日晚餐');
await page.getByLabel('这份食物热量（kcal）').fill('450');
await page.getByRole('button',{name:'加入这一餐'}).click();
await page.getByRole('button',{name:'确认吃过，保存记录'}).click();
state=await page.evaluate(()=>JSON.parse(localStorage.getItem('today-food-v1')));
assert.equal(state.records['2026-10-09'].dinner[0].kcal,450);
await page.getByRole("button", { name: "设置与备份" }).click();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出数据备份" }).click();
const download = await downloadPromise;
const path = await download.path();
await page.getByRole("button", { name: "清空历史记录" }).click();
await page.locator("input[type=file]").setInputFiles(path);
await page.getByText("备份恢复成功", { exact: true }).waitFor();
state = await page.evaluate(() =>
  JSON.parse(localStorage.getItem("today-food-v1")),
);
assert.equal(
  Object.values(state.records)[0].lunch.reduce((a, i) => a + i.kcal, 0),
  770,
);
await page
  .locator("input[type=file]")
  .setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
await page.getByRole("alert").waitFor();
assert.equal(errors.length, 0, errors.join(";"));
await page.getByRole("button", { name: "关闭弹窗" }).click();
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("today-food-v1"));
  s.menus.lunch = [];
  s.menus.dinner = [s.menus.dinner[0]];
  s.preferences.quiet = true;
  localStorage.setItem("today-food-v1", JSON.stringify(s));
});
await page.reload();
assert(await page.getByText("菜单空空的，添加一道喜欢的菜").isVisible());
assert(
  await page.getByRole("button", { name: "帮我选一个！" }).first().isDisabled(),
);
await page.getByRole("button", { name: "帮我选一个！" }).last().click();
await page.getByRole("button", { name: "好！就吃这个" }).waitFor();
await page.getByRole("button", { name: "好！就吃这个" }).click();
await page.clock.install({ time: new Date("2026-10-10T15:59:59Z") });
await page.reload();
const before = await page.locator(".energy p").innerText();
await page.clock.fastForward(2000);
assert((await page.locator(".date-line").innerText()).includes("11日"));
await page.waitForFunction(
  (text) => document.querySelector(".energy p")?.textContent !== text,
  before,
);
assert.notEqual(await page.locator(".energy p").innerText(), before);
assert.equal(errors.length, 0, errors.join(";"));
await browser.close();
server.kill();
console.log(
  "通过：双转盘、旋转锁、选择/食用分离、菜单增改删复制、热量与多食物、历史编辑、持久化、语录与收藏、JSON往返/非法导入、320–430px布局、无运行错误",
);
