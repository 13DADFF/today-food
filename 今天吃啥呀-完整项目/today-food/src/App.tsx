import CloudSync from "./CloudSync";
import Wheel from "./Wheel";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Heart,
  Settings,
  History,
  Plus,
  X,
  Trash2,
  Pencil,
  Copy,
  ArrowDownToLine,
  Upload,
  ChevronRight,
  Sparkles,
  Utensils,
} from "lucide-react";
import {
  builtins,
  calories,
  dailyQuote,
  dateKey,
  dateLabel,
  estimate,
  initial,
  upgradeDefaultMenus,
  landingRotation,
  numberValue,
  STORAGE,
  uid,
  validate,
  type Food,
  type Item,
  type Meal,
  type Quote,
  type State,
} from "./model";
const labels = { lunch: "午餐", dinner: "晚餐" };
export default function App() {
  const [error, setError] = useState("");
  const [state, setState] = useState<State>(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      return raw ? upgradeDefaultMenus(validate(JSON.parse(raw))) : initial();
    } catch {
      return initial();
    }
  });
  const [now, setNow] = useState(new Date()),
    [modal, setModal] = useState<
      "menu" | "record" | "history" | "settings" | "quotes" | "favorites" | null
    >(null),
    [meal, setMeal] = useState<Meal>("lunch"),
    [date, setDate] = useState(dateKey()),
    [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Food | null>(null),
    [draft, setDraft] = useState({
      name: "",
      emoji: "",
      kcal: "",
      portion: "",
    });
  const [items, setItems] = useState<Item[]>([]),
    [itemDraft, setItemDraft] = useState({
      name: "",
      kcal: "",
      density: "",
      grams: "",
    }),
    [mode, setMode] = useState<"direct" | "weight">("direct"),
    [itemId, setItemId] = useState<string | null>(null);
  const [quoteText, setQuoteText] = useState(""),
    [quoteId, setQuoteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = dateKey(now);
  const reduced = useReducedMotion();
  const [quote, setQuote] = useState<Quote>(() => {
    try {
      const cache = JSON.parse(
        localStorage.getItem("today-food-quote") || "null",
      );
      if (cache?.date === dateKey() && typeof cache.quote?.text === "string")
        return cache.quote;
    } catch {}
    return dailyQuote(dateKey(), state.quotes);
  });
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      setError("无法保存本地数据，请立即导出备份，并检查浏览器存储空间。");
    }
  }, [state]);
  useEffect(() => {
    try {
      const cache = JSON.parse(
        localStorage.getItem("today-food-quote") || "null",
      );
      if (cache?.date === today && typeof cache.quote?.text === "string") {
        setQuote(cache.quote);
        return;
      }
      const next = dailyQuote(today, state.quotes);
      localStorage.setItem(
        "today-food-quote",
        JSON.stringify({ date: today, quote: next }),
      );
      setQuote(next);
    } catch {
      setQuote(dailyQuote(today, state.quotes));
    }
  }, [today, state.quotes]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!modal) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".modal button:not(:disabled),.modal input:not([hidden]),.modal textarea",
          ),
        ).filter((n) => n.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", esc);
      previous?.focus();
    };
  }, [modal]);
  function update(fn: (s: State) => State) {
    setState(fn);
  }
  function flash(s: string) {
    setNotice(s);
  }
  function close() {
    setModal(null);
    setError("");
  }
  function resetFood() {
    setEditing(null);
    setDraft({ name: "", emoji: "", kcal: "", portion: "" });
  }
  function manage(m: Meal) {
    setMeal(m);
    resetFood();
    setModal("menu");
  }
  function saveFood() {
    try {
      const name = draft.name.trim();
      if (!name || name.length > 60) throw Error("食物名称请输入1至60个字。");
      if (
        state.menus[meal].some((f) => f.id !== editing?.id && f.name === name)
      )
        throw Error("这道菜已经在菜单里啦。");
      if (!editing && state.menus[meal].length >= 100)
        throw Error("每份菜单最多100道菜。");
      const f: Food = {
        id: editing?.id || uid(),
        name,
        emoji: draft.emoji.trim(),
        portion: draft.portion.trim(),
        kcal: draft.kcal !== "" ? numberValue(draft.kcal) : estimate(name),
      };
      update((s) => ({
        ...s,
        menus: {
          ...s.menus,
          [meal]: editing
            ? s.menus[meal].map((x) => (x.id === editing.id ? f : x))
            : [...s.menus[meal], f],
        },
      }));
      resetFood();
      setError("");
      flash("菜单已保存");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function openRecord(m: Meal, d = today) {
    setMeal(m);
    setDate(d);
    setItems(state.records[d]?.[m]?.map((i) => ({ ...i })) || []);
    setItemDraft({ name: "", kcal: "", density: "", grams: "" });
    setItemId(null);
    setMode("direct");
    setError("");
    setModal("record");
  }
  function addItem() {
    try {
      const name = itemDraft.name.trim();
      if (!name || name.length > 60) throw Error("请填写1至60个字的食物名称。");
      const kcal =
        mode === "direct"
          ? numberValue(itemDraft.kcal)
          : calories(itemDraft.density, itemDraft.grams);
      if (kcal > 10000) throw Error("单项热量不能超过10000 kcal。");
      const next = { id: itemId || uid(), name, kcal };
      setItems((a) =>
        itemId ? a.map((i) => (i.id === itemId ? next : i)) : [...a, next],
      );
      setItemId(null);
      setItemDraft({ name: "", kcal: "", density: "", grams: "" });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function favorite(q: Quote) {
    update((s) => ({
      ...s,
      favorites: s.favorites.some((x) => x.id === q.id)
        ? s.favorites.filter((x) => x.id !== q.id)
        : [...s.favorites, q],
    }));
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `今天吃啥呀-备份-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    flash("备份已准备下载；微信中可尝试用浏览器打开下载");
  }
  async function importData(file: File) {
    try {
      if (file.size > 5 * 1024 * 1024) throw Error("备份文件不能超过5 MB。");
      const next = validate(JSON.parse(await file.text()));
      if (confirm("恢复备份将覆盖当前数据，确定继续？建议先导出当前备份。")) {
        setState(next);
        flash("备份恢复成功");
      }
    } catch (e) {
      setError("恢复失败：" + (e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  const total = (d: string) =>
    Object.values(state.records[d] || {})
      .flat()
      .reduce((sum, i) => sum + (i?.kcal || 0), 0);
  const clock = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const hour = Number(clock.slice(0, 2));
  const recordedDays = Object.values(state.records).filter((day) => !!day?.lunch?.length || !!day?.dinner?.length).length;
  const dayNumber = Math.floor(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10))) / 86400000);
  const surpriseToday = dayNumber % 5 === 2;
  return (
    <main>
      <header>
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">🍜</span>
          <div>
            <p className="eyebrow">把选择交给幸运，把日子过得有味</p>
            <h1>今天吃啥呀</h1>
          </div>
          <button
            className="icon-button"
            aria-label="设置与备份"
            onClick={() => setModal("settings")}
          >
            <Settings size={21} />
          </button>
        </div>
        <div className="date-line">
          <span>{dateLabel(today)}</span>
          <span className="clock">{clock}</span>
        </div>
        <p className="greeting">
          {hour < 11
            ? "早上好，今天也要好好吃饭呀！"
            : hour < 18
              ? "今天也要好好吃饭呀！"
              : "晚上好，一顿热饭，安顿今天。"}
        </p>
      </header>
      <CloudSync state={state} setState={setState} />
      <div className="hero-intro" aria-label="今日饮食小鼓励"><div className="hero-copy"><span className="hero-kicker">✦ 好好吃饭俱乐部 · DAILY JOY</span><h2>今天的快乐，<br /><em>从好好吃饭开始。</em></h2><p>不用纠结下一餐，交给幸运小转盘吧！</p></div><div className="hero-art" aria-hidden="true"><span className="hero-sun">✳</span><span className="hero-bowl">🍚</span><span className="hero-spark">✦</span><span className="hero-spark-two">✧</span></div></div>
      {(recordedDays >= 3 || surpriseToday) && <aside className="gentle-surprise" aria-label="今日小惊喜"><span aria-hidden="true">{recordedDays >= 3 ? "🏅" : "💌"}</span><p>{recordedDays >= 3 ? `已经在 ${recordedDays} 天留下好好吃饭的记录啦，每一份用心都值得被看见。` : "偷偷送你一颗小星星：今天也值得吃一顿喜欢的饭。"}<small>来自小饭团的悄悄话 ✨</small></p></aside>}
      <motion.section
        className="energy"
        key={quote.id}
        initial={{ opacity: reduced ? 1 : 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="section-head">
          <span className="eyebrow">✦ 今日能量 · {quote.category}</span>
          <button
            className={
              "icon-button " +
              (state.favorites.some((q) => q.id === quote.id) ? "liked" : "")
            }
            aria-label="收藏今日语录"
            onClick={() => favorite(quote)}
          >
            <Heart
              size={19}
              fill={
                state.favorites.some((q) => q.id === quote.id)
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
        </div>
        <p>{quote.text}</p>
        <button className="text-button" onClick={() => setModal("quotes")}>
          给生活加一句温柔 <ChevronRight size={13} />
        </button>
      </motion.section>
      <div className="wheels">
        {(["lunch", "dinner"] as Meal[]).map((m) => (
          <Wheel
            key={m}
            meal={m}
            foods={state.menus[m]}
            choice={state.choices[today]?.[m]}
            quiet={state.preferences.quiet}
            onManage={() => manage(m)}
            onChoose={(f) => {
              update((s) => ({
                ...s,
                choices: {
                  ...s.choices,
                  [today]: { ...s.choices[today], [m]: { ...f } },
                },
              }));
              flash("选择已保存，吃过后记得记录");
            }}
          />
        ))}
      </div>
      <section className="card today">
        <div className="section-head">
          <div>
            <p className="eyebrow">好好吃饭的日常</p>
            <h2>今天吃了什么</h2>
          </div>
          <Utensils size={21} />
        </div>
        {(["lunch", "dinner"] as Meal[]).map((m) => (
          <div className="meal-row" key={m}>
            <span className="meal-emoji">{m === "lunch" ? "🍱" : "🍲"}</span>
            <div className="grow">
              <strong>{labels[m]}</strong>
              <p>
                {state.records[today]?.[m]?.length
                  ? state.records[today][m]!.map((i) => i.name).join("、")
                  : "尚未记录"}
              </p>
              {!!state.records[today]?.[m]?.length && (
                <small>
                  {state.records[today][m]!.reduce((a, i) => a + i.kcal, 0)}{" "}
                  kcal
                </small>
              )}
            </div>
            <button className="small-button" onClick={() => openRecord(m)}>
              {state.records[today]?.[m]?.length ? "编辑" : "记录"}
              <Plus size={14} />
            </button>
          </div>
        ))}
        <div className="meal-progress"><div className="meal-progress-label"><span>今日记录进度</span><strong>{(["lunch", "dinner"] as Meal[]).filter((m) => !!state.records[today]?.[m]?.length).length}/2 餐</strong></div><div className="meal-progress-track"><div className="meal-progress-fill" style={{ width: `${(["lunch", "dinner"] as Meal[]).filter((m) => !!state.records[today]?.[m]?.length).length * 50}%` }} /></div><p>记录的是习惯，不是给自己打分 💛</p></div>
        <div className="total">
          <span>今日已记录热量</span>
          <strong>
            {total(today)} <small>kcal</small>
          </strong>
        </div>
        <p className="hint">只统计已确认食用的记录；尚未记录不代表没吃饭。</p>
      </section>
      <nav className="bottom-links">
        <button
          onClick={() => {
            setDate(today);
            setModal("history");
          }}
        >
          <History size={21} />
          <span>历史记录</span>
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setModal("favorites")}>
          <Heart size={21} />
          <span>我的收藏</span>
          <ChevronRight size={16} />
        </button>
      </nav>
      <footer>
        一餐一饭，都是好好生活的小事。
        <br />
        数据仅保存在当前浏览器，记得定期备份。
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {error && !modal && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label={
                {
                  menu: "管理菜单",
                  record: "记录实际食用",
                  history: "历史记录",
                  settings: "设置与备份",
                  quotes: "我的语录",
                  favorites: "我的收藏",
                }[modal]
              }
              initial={{ y: reduced ? 0 : 24 }}
              animate={{ y: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-head">
                <h2>
                  {
                    {
                      menu: `${labels[meal]}菜单`,
                      record: `${labels[meal]} · 实际食用`,
                      history: "历史记录",
                      settings: "设置与备份",
                      quotes: "我的能量语录",
                      favorites: "我的收藏",
                    }[modal]
                  }
                </h2>
                <button
                  autoFocus
                  className="icon-button"
                  aria-label="关闭弹窗"
                  onClick={close}
                >
                  <X />
                </button>
              </div>
              <div className="modal-body">
                {modal === "menu" && (
                  <>
                    <p className="hint">
                      每道菜机会相同。最多100道，菜单由你做主。
                    </p>
                    <div className="list">
                      {state.menus[meal].map((f) => (
                        <div className="list-row" key={f.id}>
                          <span>{f.emoji || "🍽️"}</span>
                          <div className="grow">
                            <strong>{f.name}</strong>
                            <small>
                              {f.kcal !== undefined
                                ? `约${f.kcal} kcal`
                                : "暂无参考热量"}{" "}
                              {f.portion}
                            </small>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={"编辑" + f.name}
                            onClick={() => {
                              setEditing(f);
                              setDraft({
                                name: f.name,
                                emoji: f.emoji,
                                kcal:
                                  f.kcal === undefined ? "" : String(f.kcal),
                                portion: f.portion,
                              });
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={"复制" + f.name + "到另一菜单"}
                            onClick={() => {
                              const other =
                                meal === "lunch" ? "dinner" : "lunch";
                              if (
                                state.menus[other].some(
                                  (x) => x.name === f.name,
                                )
                              )
                                return flash("另一份菜单已有这道菜");
                              if (state.menus[other].length >= 100)
                                return flash("另一份菜单已满");
                              update((s) => ({
                                ...s,
                                menus: {
                                  ...s.menus,
                                  [other]: [
                                    ...s.menus[other],
                                    { ...f, id: uid() },
                                  ],
                                },
                              }));
                              flash("已复制到" + labels[other]);
                            }}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={"删除" + f.name}
                            onClick={() => {
                              if (confirm(`确定删除「${f.name}」？`)) {
                                update((s) => ({
                                  ...s,
                                  menus: {
                                    ...s.menus,
                                    [meal]: s.menus[meal].filter(
                                      (x) => x.id !== f.id,
                                    ),
                                  },
                                }));
                                if (editing?.id === f.id) resetFood();
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <h3>{editing ? "编辑食物" : "添加一道喜欢的菜"}</h3>
                    <label>
                      食物名称
                      <input
                        value={draft.name}
                        maxLength={60}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        placeholder="例如：番茄牛腩饭"
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        食物表情（可选）
                        <input
                          value={draft.emoji}
                          maxLength={16}
                          onChange={(e) =>
                            setDraft({ ...draft, emoji: e.target.value })
                          }
                          placeholder="🍜"
                        />
                      </label>
                      <label>
                        参考热量（可选）
                        <input
                          inputMode="decimal"
                          value={draft.kcal}
                          onChange={(e) =>
                            setDraft({ ...draft, kcal: e.target.value })
                          }
                          placeholder="kcal"
                        />
                      </label>
                    </div>
                    <label>
                      参考分量（可选）
                      <input
                        maxLength={100}
                        value={draft.portion}
                        onChange={(e) =>
                          setDraft({ ...draft, portion: e.target.value })
                        }
                        placeholder="例如：一碗，约400克"
                      />
                    </label>
                    <button className="primary" onClick={saveFood}>
                      {editing ? "保存修改" : "添加到菜单"}
                    </button>
                    {editing && (
                      <button className="text-button" onClick={resetFood}>
                        取消编辑
                      </button>
                    )}
                  </>
                )}
                {modal === "record" && (
                  <>
                    <p className="hint">
                      {dateLabel(date)} · 确认实际吃过后再保存。
                    </p>
                    {state.choices[date]?.[meal] && (
                      <button
                        className="suggestion"
                        onClick={() => {
                          const f = state.choices[date]![meal]!;
                          setItemDraft({
                            name: f.name,
                            kcal: f.kcal !== undefined ? String(f.kcal) : "",
                            density: "",
                            grams: "",
                          });
                          setMode("direct");
                          setItemId(null);
                        }}
                      >
                        填入已选食物：{state.choices[date]![meal]!.name}
                      </button>
                    )}
                    <div className="list">
                      {items.map((i) => (
                        <div className="list-row" key={i.id}>
                          <div className="grow">
                            <strong>{i.name}</strong>
                            <small>{i.kcal} kcal</small>
                          </div>
                          <button
                            aria-label={"编辑记录" + i.name}
                            className="icon-button"
                            onClick={() => {
                              setItemId(i.id);
                              setMode("direct");
                              setItemDraft({
                                name: i.name,
                                kcal: String(i.kcal),
                                density: "",
                                grams: "",
                              });
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            aria-label={"删除记录" + i.name}
                            className="icon-button"
                            onClick={() => {
                              if (confirm("确定从这餐删除该食物？")) {
                                setItems((a) => a.filter((x) => x.id !== i.id));
                                if (itemId === i.id) {
                                  setItemId(null);
                                  setItemDraft({
                                    name: "",
                                    kcal: "",
                                    density: "",
                                    grams: "",
                                  });
                                }
                              }
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <h3>{itemId ? "修改食物" : "添加食物"}</h3>
                    <label>
                      食物名称
                      <input
                        maxLength={60}
                        value={itemDraft.name}
                        onChange={(e) => {
                          const name = e.target.value,
                            k = estimate(name);
                          setItemDraft({
                            ...itemDraft,
                            name,
                            kcal: k !== undefined ? String(k) : "",
                          });
                        }}
                        placeholder="输入实际吃的食物"
                      />
                    </label>
                    {estimate(itemDraft.name) !== undefined && (
                      <p className="hint">
                        参考分量：一份（常见外卖分量）。参考热量约
                        {estimate(itemDraft.name)} kcal，可自行修改。
                      </p>
                    )}
                    {itemDraft.name &&
                      estimate(itemDraft.name) === undefined && (
                        <p className="hint">未找到可靠匹配，请手动填写热量。</p>
                      )}
                    <div className="tabs">
                      <button
                        className={mode === "direct" ? "active" : ""}
                        onClick={() => setMode("direct")}
                      >
                        整餐热量
                      </button>
                      <button
                        className={mode === "weight" ? "active" : ""}
                        onClick={() => setMode("weight")}
                      >
                        按克数计算
                      </button>
                    </div>
                    {mode === "direct" ? (
                      <label>
                        这份食物热量（kcal）
                        <input
                          inputMode="decimal"
                          value={itemDraft.kcal}
                          onChange={(e) =>
                            setItemDraft({ ...itemDraft, kcal: e.target.value })
                          }
                        />
                      </label>
                    ) : (
                      <>
                        <div className="form-grid">
                          <label>
                            每100克热量
                            <input
                              inputMode="decimal"
                              value={itemDraft.density}
                              onChange={(e) =>
                                setItemDraft({
                                  ...itemDraft,
                                  density: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            实际食用克数
                            <input
                              inputMode="decimal"
                              value={itemDraft.grams}
                              onChange={(e) =>
                                setItemDraft({
                                  ...itemDraft,
                                  grams: e.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <p className="hint">
                          整份热量 = 每100克热量 × 实际克数 ÷ 100
                        </p>
                      </>
                    )}
                    <p className="hint">
                      实际热量可能因分量、配料和烹饪方式不同而变化。这里的数值仅作参考。
                    </p>
                    <button className="secondary" onClick={addItem}>
                      {itemId ? "更新这项食物" : "加入这一餐"}
                    </button>
                    <div className="total">
                      <span>这一餐合计</span>
                      <strong>
                        {items.reduce((s, i) => s + i.kcal, 0)} kcal
                      </strong>
                    </div>
                    <button
                      className="primary"
                      disabled={
                        !items.length || !!itemId || !!itemDraft.name.trim()
                      }
                      onClick={() => {
                        update((s) => ({
                          ...s,
                          records: {
                            ...s.records,
                            [date]: { ...s.records[date], [meal]: items },
                          },
                        }));
                        close();
                        flash("实际饮食已保存");
                      }}
                    >
                      确认吃过，保存记录
                    </button>
                    {(itemDraft.name.trim() || itemId) && (
                      <p className="hint">
                        请先加入或更新当前食物，再保存整餐。
                      </p>
                    )}
                    {state.records[date]?.[meal]?.length && (
                      <button
                        className="danger text-button"
                        onClick={() => {
                          if (confirm("确定删除这餐的所有实际饮食记录？")) {
                            update((s) => ({
                              ...s,
                              records: {
                                ...s.records,
                                [date]: { ...s.records[date], [meal]: [] },
                              },
                            }));
                            close();
                            flash("这餐记录已删除");
                          }
                        }}
                      >
                        删除这餐记录
                      </button>
                    )}
                  </>
                )}
                {modal === "history" && (
                  <>
                    <label>
                      查看日期
                      <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={(e) =>
                          e.target.value && setDate(e.target.value)
                        }
                      />
                    </label>
                    <div className="day-chips">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = dateKey(
                          new Date(now.getTime() - i * 86400000),
                        );
                        return (
                          <button
                            className={date === d ? "active" : ""}
                            key={d}
                            onClick={() => setDate(d)}
                          >
                            {i === 0
                              ? "今天"
                              : d.slice(5).replace("-", "月") + "日"}
                          </button>
                        );
                      })}
                    </div>
                    <h3>{dateLabel(date)}</h3>
                    {(["lunch", "dinner"] as Meal[]).map((m) => (
                      <div className="history-meal" key={m}>
                        <div className="section-head">
                          <strong>{labels[m]}</strong>
                          <button
                            className="small-button"
                            onClick={() => openRecord(m, date)}
                          >
                            编辑记录
                          </button>
                        </div>
                        <p>
                          当日选择：
                          {state.choices[date]?.[m]?.name || "尚未选择"}
                        </p>
                        <p>
                          实际食用：
                          {state.records[date]?.[m]
                            ?.map((i) => `${i.name}（${i.kcal} kcal）`)
                            .join("、") || "尚未记录"}
                        </p>
                        <small>
                          每餐已记录：
                          {state.records[date]?.[m]?.reduce(
                            (a, i) => a + i.kcal,
                            0,
                          ) || 0}{" "}
                          kcal
                        </small>
                      </div>
                    ))}
                    <div className="total">
                      每日已记录合计 <strong>{total(date)} kcal</strong>
                    </div>
                  </>
                )}
                {modal === "settings" && (
                  <>
                    <div className="backup-note">
                      清理微信缓存或更换手机可能导致本地记录丢失，建议定期备份。
                    </div>
                    <button className="setting-row" onClick={exportData}>
                      <ArrowDownToLine />
                      导出数据备份
                      <ChevronRight />
                    </button>
                    <button
                      className="setting-row"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload />
                      导入备份恢复
                      <ChevronRight />
                    </button>
                    <input
                      hidden
                      ref={fileRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importData(f);
                      }}
                    />
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={state.preferences.quiet}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            preferences: { quiet: e.target.checked },
                          }))
                        }
                      />
                      减少动画效果
                    </label>
                    <button
                      className="setting-row danger"
                      onClick={() => {
                        if (
                          confirm(
                            "确定清空全部日期的选择与饮食历史？菜单、语录和收藏会保留。",
                          )
                        ) {
                          update((s) => ({ ...s, choices: {}, records: {} }));
                          flash("历史已清空");
                        }
                      }}
                    >
                      <Trash2 />
                      清空历史记录
                    </button>
                    <h3>关于热量参考</h3>
                    <p className="hint">
                      内置常见中餐的粗略参考值，采用完整名称匹配，不联网识别。分量、用油和配料不同，热量可能明显变化；建议以包装信息或实际食材计算为准。不设置默认饮食上限。
                    </p>
                    <p className="hint">
                      未开启云同步时，数据仅保存在当前浏览器。开启云同步后也建议定期导出备份。
                    </p>
                  </>
                )}
                {modal === "quotes" && (
                  <>
                    <p className="hint">
                      内置{builtins.length}
                      句温暖语录，每天北京时间零点更新。同一天保持一句。
                    </p>
                    <label>
                      写给自己的话
                      <textarea
                        value={quoteText}
                        maxLength={200}
                        onChange={(e) => setQuoteText(e.target.value)}
                        placeholder="一句小小的鼓励，也有很大的力量。"
                      />
                    </label>
                    <button
                      className="primary"
                      onClick={() => {
                        if (!quoteText.trim())
                          return setError("先写一句给自己的话吧。");
                        update((s) => ({
                          ...s,
                          quotes: quoteId
                            ? s.quotes.map((q) =>
                                q.id === quoteId
                                  ? { ...q, text: quoteText.trim() }
                                  : q,
                              )
                            : [
                                ...s.quotes,
                                {
                                  id: uid(),
                                  text: quoteText.trim(),
                                  category: "我的温柔",
                                },
                              ],
                        }));
                        setQuoteText("");
                        setQuoteId(null);
                        setError("");
                        flash("语录已保存");
                      }}
                    >
                      {quoteId ? "保存修改" : "添加我的语录"}
                    </button>
                    {quoteId && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setQuoteId(null);
                          setQuoteText("");
                        }}
                      >
                        取消编辑
                      </button>
                    )}
                    <div className="list">
                      {state.quotes.map((q) => (
                        <div className="quote-row" key={q.id}>
                          <p>{q.text}</p>
                          <div>
                            <button
                              className="icon-button"
                              aria-label="收藏语录"
                              onClick={() => favorite(q)}
                            >
                              <Heart
                                size={17}
                                fill={
                                  state.favorites.some((f) => f.id === q.id)
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="编辑语录"
                              onClick={() => {
                                setQuoteId(q.id);
                                setQuoteText(q.text);
                              }}
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label="删除语录"
                              onClick={() => {
                                if (
                                  confirm(
                                    "确定删除这句自定义语录？收藏副本会保留。",
                                  )
                                ) {
                                  update((s) => ({
                                    ...s,
                                    quotes: s.quotes.filter(
                                      (x) => x.id !== q.id,
                                    ),
                                  }));
                                  if (quoteId === q.id) {
                                    setQuoteId(null);
                                    setQuoteText("");
                                  }
                                }
                              }}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {!state.quotes.length && (
                      <p className="empty">
                        还没有自定义语录，给自己留一句鼓励吧。
                      </p>
                    )}
                  </>
                )}
                {modal === "favorites" && (
                  <>
                    {!state.favorites.length ? (
                      <div className="empty">
                        💌<p>喜欢的话，值得留在这里。</p>
                        <small>点击今日能量卡片的爱心，就能收藏。</small>
                      </div>
                    ) : (
                      state.favorites.map((q) => (
                        <div className="quote-row" key={q.id}>
                          <p>{q.text}</p>
                          <button
                            className="text-button"
                            onClick={() => {
                              if (confirm("确定取消收藏这句语录？"))
                                favorite(q);
                            }}
                          >
                            取消收藏
                          </button>
                        </div>
                      ))
                    )}
                  </>
                )}
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
