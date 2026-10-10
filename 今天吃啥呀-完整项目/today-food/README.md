# 今天吃啥呀 🍜

全中文、无后端的个人饮食选择助手。React 19 + TypeScript 5 + Vite 6 + Tailwind CSS 4 + Motion + Lucide React。运行时没有外部接口、远程字体或付费服务。

## Windows 启动（PowerShell）

1. 安装 Node.js 22 LTS 或更新的兼容版本。
2. 解压项目，在含 package.json 的 today-food 文件夹打开 PowerShell。
3. 依次执行：

```powershell
npm.cmd install
npm.cmd run dev
```

打开终端显示的 http://127.0.0.1:5173/ 。使用 npm.cmd 可避免 PowerShell 的 npm.ps1 执行策略错误。

生产构建与本地预览：

```powershell
npm.cmd run build
npm.cmd run preview
```

预览默认 http://127.0.0.1:4173/ 。不要双击 dist/index.html；请通过静态服务器访问。想用同一局域网手机访问开发服务器，可运行 `npm.cmd run dev -- --host 0.0.0.0`，开放 Windows 防火墙对应端口，用电脑的局域网 IP 访问。正式微信使用应部署 HTTPS。

## 目录结构

```text
today-food/
  .github/workflows/deploy.yml   自动构建与 Pages 部署
  src/
    App.tsx                    页面、记录与交互
    Wheel.tsx                  SVG幸运转盘
    model.ts                   类型、参考食物、语录、计算和备份校验
    model.test.ts              核心逻辑测试
    main.tsx                   入口
    style.css                  奶油糖果主题与移动布局
  tests/browser.mjs            Chromium 功能与布局验收
  index.html
  vite.config.ts
  tsconfig.json
  package.json
  package-lock.json
  README.md
  验收报告.md
```

## 功能

- 午餐/晚餐独立 SVG 转盘，约3秒减速、固定指针、均匀随机、旋转锁、结果确认、再次抽取。
- 空菜单提示、单食物支持、长名称截断；超过16项时稀疏显示编号，完整结果可见。每菜单最多100项。
- 食物增改删、双向复制、防重复、可选 Emoji、分量和热量。
- 自动完整名称匹配10种本地食物参考热量；未知食物手动填写。可维护 src/model.ts 的 reference。
- 直接填写热量或每100克×实际克数计算，非负有限数值校验；每餐多食物、编辑和确认保存。
- 选择与实际食用分离；今日记录、按日期历史、最近7天、过去记录编辑和删除。
- 北京时间日期与时钟、每日100句内置原创组合语录、自定义编辑删除、收藏副本与独立收藏入口。
- 同日语录快照保持不变；内置语录按日期循环，默认100天不重复。自定义语录纳入次日候选池；修改候选池可能改变后续顺序。
- localStorage 持久化、JSON 导出/校验恢复、覆盖和删除确认、偏好设置、历史清空。
- 全中文、320–430px纵向布局、安全区域、滚动弹窗、系统减少动态效果与手动减少动画。

## GitHub Pages 部署

当前没有指定目标仓库，项目尚未上线，不提供虚构网址。

1. 在 GitHub 建立空仓库，例如 today-food（免费 Pages 通常选择公开仓库）。
2. 上传项目全部源码，尤其 `.github/workflows/deploy.yml`、package-lock.json；不要上传 node_modules。网页上传时隐藏目录容易遗漏，推荐 Git 推送。
3. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
4. 如果用 Git，首次推送示例（替换为你自己的真实仓库地址）：

```powershell
git init
git add .
git commit -m "创建今天吃啥呀"
git branch -M main
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

5. 查看 Actions 中「构建与部署网页」。工作流自动 npm ci、测试、类型检查、构建与部署。
6. 成功后进入 Pages 复制显示的真实 HTTPS 地址，发到微信再点击打开。组织策略、Pages 权限或 Actions 设置可能需要调整。

工作流按仓库名设置 Vite base：普通仓库 `/仓库名/`，用户主页仓库 `/`。没有客户端路由，因此无需路由回退配置。

迁移到其他静态托管：运行 `npm run build`，上传 dist 目录全部内容。默认相对路径 `./`。若托管有固定子路径，可设置 VITE_BASE_PATH 后构建。更换域名后本地数据不会自动迁移，先备份再导入。

## 测试

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:browser
```

浏览器测试自动启动本地 Vite，在5189端口测试。请先关闭使用该端口的开发服务器。默认 Chromium 模拟手机尺寸；不替代真机微信和 Safari 测试。

## 使用和限制

- 抽取结果仅表示决定吃什么，实际吃过后在「今天吃了什么」点「记录」，添加食物，最后点「确认吃过，保存记录」。
- 热量是粗略参考，不是实测数据；一份外卖的分量、用油和配料差异很大。以包装或实际食材为准。
- 没有默认热量上限、账号、云同步、拍照识别、声音或体重分析。
- 记录只在当前网址、当前浏览器中保存。清理微信缓存或更换手机可能丢失，请定期在设置导出 JSON。
- 微信可能限制文件下载或导入选择器，可用系统浏览器处理备份。真机行为尚未验证。
- 日期与语录基于设备时间并转换为北京时间，设备时钟错误时会影响日期。
- GitHub Pages 在中国大陆部分网络环境不稳定；项目可迁移到支持 HTTPS 的国内静态托管。
- 后续建议：扩展有来源和分量说明的食物库、提供更精细语录排列、完善真机键盘与文件下载测试。
