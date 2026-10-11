import { useEffect, useRef, useState } from "react";
import { type State, validate } from "./model";

type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };
const CONFIG_KEY = "today-food-cloud-config";
const DEFAULT_CONFIG: Config = { url: "https://xtqcdeektwpsoqptjdli.supabase.co", key: "sb_publishable_UMwlVO12vFqPFMGS8PViGQ_kQntcYV9" };
const SESSION_KEY = "today-food-cloud-session";
const read = <T,>(key: string): T | null => { try { return JSON.parse(localStorage.getItem(key) || "null") as T; } catch { return null; } };
type Config = { url: string; key: string };
function configOk(c: Config) { try { const u = new URL(c.url); return u.protocol === "https:" && /\.supabase\.co$/.test(u.hostname) && !!c.key.trim(); } catch { return false; } }
async function api(c: Config, path: string, init: RequestInit = {}, token?: string) {
  const r = await fetch(c.url.replace(/\/$/, "") + path, { ...init, headers: { apikey: c.key, Authorization: "Bearer " + (token || c.key), "Content-Type": "application/json", ...init.headers } });
  const raw = await r.text();
  let data: any; try { data = JSON.parse(raw); } catch { data = raw; }
  if (!r.ok) throw Error(typeof data?.msg === "string" ? data.msg : data?.error_description || data?.message || "云端请求失败（" + r.status + "）");
  return data;
}
export default function CloudSync({ state, setState }: { state: State; setState: (s: State) => void }) {
  const [config, setConfig] = useState<Config>(() => DEFAULT_CONFIG);
  const [session, setSession] = useState<Session | null>(() => read<Session>(SESSION_KEY));
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const [status, setStatus] = useState("未连接云端");
  const [ready, setReady] = useState(false);
  const [cloudVersion, setCloudVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const stateRef = useRef(state); stateRef.current = state;
  const configRef = useRef(config); configRef.current = config;
  const sessionRef = useRef(session); sessionRef.current = session;
  const readyRef = useRef(false);
  const versionRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const appliedRef = useRef<string | null>(null);
  const awaitingStateRef = useRef<string | null>(null);
  async function token() {
    const s = sessionRef.current, c = configRef.current;
    if (!s) throw Error("请先登录");
    if (Date.now() < s.expires_at - 60000) return s.access_token;
    const next = await api(c, "/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: s.refresh_token }) });
    const updated: Session = { ...next, expires_at: Date.now() + next.expires_in * 1000 };
    sessionRef.current = updated; setSession(updated); localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated.access_token;
  }
  async function remote() {
    const s = sessionRef.current, c = configRef.current;
    if (!s) throw Error("尚未登录");
    const data = await api(c, "/rest/v1/food_sync?user_id=eq." + encodeURIComponent(s.user.id) + "&select=data,version", {}, await token());
    return data[0] as { data: State; version: number } | undefined;
  }
  async function pull() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const row = await remote();
      if (!row) { readyRef.current = false; setReady(false); versionRef.current = null; setCloudVersion(null); setStatus("云端尚无记录。请先确认本机数据，再点击上传。"); return; }
      const data = validate(row.data);
      if (readyRef.current && row.version === versionRef.current) return;
      if (readyRef.current && appliedRef.current !== JSON.stringify(stateRef.current)) { setStatus("本机有待上传的修改，先保留本机数据，稍后继续同步。"); return; }
      if (!readyRef.current && !confirm("云端已有数据。下载后会覆盖本机当前数据，建议先到设置导出 JSON 备份。确定下载云端数据吗？")) { setStatus("已取消下载，云端数据未覆盖本机。请先备份，再手动选择同步。"); return; }
      awaitingStateRef.current = JSON.stringify(data);
      setState(data); appliedRef.current = JSON.stringify(data);
      versionRef.current = row.version; setCloudVersion(row.version);
      readyRef.current = true; setReady(true); setStatus("已从云端同步 · " + new Date().toLocaleTimeString("zh-CN"));
    } catch(e) { setStatus("同步失败：" + (e as Error).message); }
    finally { busyRef.current = false; }
  }
  async function push(force = false) {
    if (busyRef.current || !sessionRef.current) return;
    if (!force && !readyRef.current) return;
    busyRef.current = true; setSaving(true);
    try {
      const s = sessionRef.current, c = configRef.current, current = stateRef.current;
      const row = await remote();
      if (force && row && row.version !== versionRef.current && !confirm("云端数据已被其他设备更新。继续会覆盖这些更新，建议先分别导出备份。仍然覆盖吗？")) return;
      if (row && row.version !== versionRef.current && !force) {
        readyRef.current = false; setReady(false); setStatus("另一设备有更新，已暂停上传。请先备份并下载云端数据。"); return;
      }
      const nextVersion = (row?.version || 0) + 1;
      const path = row ? "/rest/v1/food_sync?user_id=eq." + encodeURIComponent(s.user.id) + "&version=eq." + row.version : "/rest/v1/food_sync";
      const method = row ? "PATCH" : "POST";
      const result = await api(c, path, { method, headers: { Prefer: "return=representation" }, body: JSON.stringify(row ? { data: current, version: nextVersion } : { user_id: s.user.id, data: current, version: nextVersion }) }, await token());
      if (!result.length) throw Error("另一设备刚刚修改了数据，请重新同步");
      versionRef.current = nextVersion; setCloudVersion(nextVersion);
      readyRef.current = true; setReady(true); appliedRef.current = JSON.stringify(current);
      setStatus("已保存到云端 · " + new Date().toLocaleTimeString("zh-CN"));
    } catch(e) { readyRef.current = false; setReady(false); setStatus("上传失败：" + (e as Error).message); }
    finally { busyRef.current = false; setSaving(false); }
  }
  useEffect(() => {
    if (!session || !configOk(config)) return;
    void pull();
    const t = setInterval(() => { if (document.visibilityState === "visible" && readyRef.current) void pull(); }, 20000);
    const onFocus = () => { if (readyRef.current) void pull(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [session?.user.id, config.url, config.key]);
  useEffect(() => {
    if (!ready) return;
    if (awaitingStateRef.current) {
      if (awaitingStateRef.current === JSON.stringify(state)) awaitingStateRef.current = null;
      return;
    }
    if (appliedRef.current === JSON.stringify(state)) return;
    const t = setTimeout(() => void push(), 900);
    return () => clearTimeout(t);
  }, [state, ready]);
  async function sendLink() {
    if (sending) return;
    setSending(true);
    try {
      if (!configOk(config)) throw Error("请先填写有效的 Supabase 项目 URL 和 publishable/anon key");
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      await api(config, "/auth/v1/otp", { method: "POST", body: JSON.stringify({ email: email.trim(), create_user: true, email_redirect_to: "https://13dadff.github.io/today-food/" }) });
      setStatus("登录邮件已发送。请在当前设备打开邮件里的登录链接，然后返回网站。");
    } catch(e) { setStatus((e as Error).message); }
  }
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    if (!access || !refresh) return;
    // Remove tokens from the visible URL before any further interaction.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const c = configRef.current;
    if (!configOk(c)) { setStatus("登录链接已打开，但本设备尚未配置云端项目。请先填写项目 URL 和公开密钥，再重新发送登录邮件。"); return; }
    setVerifying(true);
    void api(c, "/auth/v1/user", {}, access).then((user) => {
      if (!user?.id) throw Error("无法验证登录身份");
      const expires = Number(hash.get("expires_in") || "3600");
      const next: Session = { access_token: access, refresh_token: refresh, expires_at: Date.now() + expires * 1000, user: { id: user.id, email: user.email } };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      sessionRef.current = next;
      setSession(next);
      setStatus("邮箱登录成功，正在检查云端数据");
    }).catch(e => setStatus("邮箱登录失败：" + (e as Error).message)).finally(() => setVerifying(false));
  }, []);
  function logout() {
    localStorage.removeItem(SESSION_KEY); sessionRef.current = null; setSession(null);
    readyRef.current = false; setReady(false); versionRef.current = null; setCloudVersion(null); appliedRef.current = null; awaitingStateRef.current = null; setStatus("已退出云端账号，本机数据仍保留");
  }
  return <section className="cloud-widget">
    <button className="cloud-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>☁️ {session ? ready ? "云端已连接" : "云同步待确认" : "开启跨设备同步"} <span>{open ? "收起 ▲" : "设置 ›"}</span></button>
    {open && <div className="cloud-panel">
      <p className="hint">电脑与手机使用同一个邮箱账号。首次连接前请先在「设置」导出 JSON 备份。云端与本机数据冲突时不会自动合并。</p>
      {!session ? <>
        <label>登录邮箱<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="friend@example.com" /></label>
        <button className="secondary" disabled={sending || verifying || !email.includes("@")} onClick={() => void sendLink()}>{sending ? "发送中…" : "发送邮箱登录链接"}</button>
        <p className="hint">请在当前设备打开邮件中的登录链接，返回网站后完成登录。首次上传前，请先导出本机数据备份。</p>
      </> : <>
        <p>当前账号：{session.user.email || "已登录"}</p>
        <p className="hint">云端版本：{cloudVersion ?? "尚未建立"}。有网络时自动上传改动，切换设备时会尝试拉取最新版本。</p>
        <button className="secondary" disabled={saving} onClick={() => void pull()}>下载云端最新数据</button>
        <button className="primary" disabled={saving} onClick={() => {
          if (confirm("这会用当前设备的数据替换云端数据。请确认已导出备份，且另一台设备没有更新。")) void push(true);
        }}>首次迁移 / 手动上传本机数据</button>
        <button className="text-button" onClick={logout}>退出登录</button>
      </>}
      <p className="cloud-status" role="status">{status}</p>
    </div>}
  </section>;
}
