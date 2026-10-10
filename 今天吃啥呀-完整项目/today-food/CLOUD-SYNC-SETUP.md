# 单用户邮箱云同步 · 启用步骤

网站已添加「☁️ 开启跨设备同步」入口。**在创建 Supabase 项目并执行 SQL 前，不会自动同步**；原有本地功能继续可用。

1. 登录 https://supabase.com/dashboard ，新建项目（Free plan），保存数据库密码（不要发给任何人）。
2. 打开 SQL Editor，运行同目录的 `supabase-setup.sql`。
3. 在 Authentication > Providers > Email 中启用邮箱验证。为了让网站使用六位数字验证码，请到 Authentication > Email Templates > Magic Link，按 Supabase 当前文档将模板替换为包含 `{{ .Token }}` 的邮件内容；例如「验证码：{{ .Token }}」。否则默认可能发送的是登录链接，不能填入本网站的验证码框。
4. 在 Project Settings / Connect / API Keys 找到 Project URL 和 **publishable key**（旧项目可用 anon key）。不要使用 service_role / secret key。
5. 电脑打开网站，先到「设置」导出 JSON 备份，再打开「☁️ 开启跨设备同步」，输入 URL、publishable/anon key 和邮箱，发送验证码并登录。
6. 第一次登录且云端为空时，点击「首次迁移 / 手动上传本机数据」。手机打开同一网址，输入相同 Supabase URL 和 key，使用同一邮箱登录，按提示下载云端数据。
7. 后续修改在联网时自动上传；打开或切换回另一个设备时会检查云端。请避免两个设备同时离线编辑同一份数据；冲突时请先分别备份再决定保留哪个版本。

## 安全与限制

- Supabase RLS 限制每个账号只访问自己的数据；客户端使用公开的 publishable/anon key，不使用服务端密钥。
- 邮箱验证码与登录状态保存在该浏览器；邮箱验证码需在 Supabase 配置正确。
- 云端是单份完整 JSON 文档，冲突时不会智能合并两个设备的记录。自动同步有短暂延迟，网络中断时需等待恢复并检查状态。
- 由于没有后端，Supabase 项目配置需要项目所有者亲自完成。不要把 Supabase 数据库密码、secret/service_role key 提交到 GitHub。
- Supabase Free 计划有配额和项目暂停政策，实际以官方控制台为准。
