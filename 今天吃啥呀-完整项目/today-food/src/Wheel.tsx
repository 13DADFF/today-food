import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pencil, Sparkles } from "lucide-react";
import { landingRotation, type Food, type Meal } from "./model";
const labels = { lunch: "午餐", dinner: "晚餐" };
export default function Wheel({
  meal,
  foods,
  choice,
  onChoose,
  onManage,
  quiet,
}: {
  meal: Meal;
  foods: Food[];
  choice?: Food;
  onChoose: (f: Food) => void;
  onManage: () => void;
  quiet: boolean;
}) {
  const [angle, setAngle] = useState(0),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Food>(),
    [surprise, setSurprise] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    setResult(undefined);
  }, [foods]);
  function spin() {
    if (lock.current || !foods.length) return;
    lock.current = true;
    setBusy(true);
    setResult(undefined);
    setSurprise(false);
    const bytes = new Uint32Array(1);
    let value: number;
    const cap = Math.floor(4294967296 / foods.length) * foods.length;
    do {
      crypto.getRandomValues(bytes);
      value = bytes[0];
    } while (value >= cap);
    const i = value % foods.length;
    setAngle((a) => landingRotation(a, i, foods.length));
    timer.current = setTimeout(
      () => {
        setResult(foods[i]);
        setSurprise(!quiet && crypto.getRandomValues(new Uint32Array(1))[0] % 5 === 0);
        setBusy(false);
        lock.current = false;
      },
      reduced || quiet ? 50 : 3100,
    );
  }
  const colors =
    meal === "lunch"
      ? ["#FFE1AA", "#FFC7A1", "#FFF0D3", "#FFD4C3", "#F3E4AD", "#FFEAD7"]
      : ["#FFE2CE", "#FFD1BD", "#FFF0D9", "#F8DACB", "#FFE8CA", "#FBE3D6"];
  const n = foods.length;
  const point = (a: number, r = 135) => [
    150 + Math.sin((a * Math.PI) / 180) * r,
    150 - Math.cos((a * Math.PI) / 180) * r,
  ];
  return (
    <section className={"wheel-card " + meal}>
      <div className="section-head">
        <div>
          <p className="eyebrow">
            {meal === "lunch" ? "给午间加点小期待" : "把今晚交给一点幸运"}
          </p>
          <h2>{meal === "lunch" ? "☀️ 中午吃啥？" : "🌙 晚上吃啥？"}</h2>
        </div>
        <button
          className="icon-button"
          aria-label={"管理" + labels[meal] + "菜单"}
          disabled={busy}
          onClick={onManage}
        >
          <Pencil size={18} />
        </button>
      </div>
      <div className="wheel-wrap">
        <span className="pointer" />
        <svg
          viewBox="0 0 300 300"
          role="img"
          aria-label={labels[meal] + "幸运转盘"}
          style={{
            transform: `rotate(${angle}deg)`,
            transition:
              quiet || reduced
                ? "none"
                : "transform 3s cubic-bezier(.12,.7,.12,1)",
          }}
        >
          {!n ? (
            <circle cx="150" cy="150" r="135" fill={colors[0]} />
          ) : (
            foods.map((f, i) => {
              const a = (i * 360) / n,
                b = ((i + 1) * 360) / n;
              const p = point(a),
                q = point(b),
                t = point((a + b) / 2, n > 12 ? 103 : 85);
              return (
                <g key={f.id}>
                  {n === 1 ? (
                    <circle cx="150" cy="150" r="135" fill={colors[0]} />
                  ) : (
                    <path
                      d={`M150 150 L${p} A135 135 0 ${360 / n > 180 ? 1 : 0} 1 ${q} Z`}
                      fill={colors[i % 6]}
                      stroke="#fff9f1"
                      strokeWidth="2"
                    />
                  )}
                  {(n <= 16 || i % Math.ceil(n / 16) === 0) && (
                    <text
                      x={t[0]}
                      y={t[1]}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={n > 12 ? 10 : n > 8 ? 11 : 12}
                      fill="#653F2D"
                      transform={`rotate(${(a + b) / 2 > 90 && (a + b) / 2 < 270 ? (a + b) / 2 + 180 : (a + b) / 2},${t[0]},${t[1]})`}
                    >
                      {n > 16
                        ? i + 1
                        : `${f.emoji} ${f.name.slice(0, n > 8 ? 3 : 5)}${f.name.length > (n > 8 ? 3 : 5) ? "…" : ""}`}
                    </text>
                  )}
                </g>
              );
            })
          )}
          <circle cx="150" cy="150" r="28" fill="#FFF9F1" />
          <text x="150" y="158" fontSize="23" textAnchor="middle">
            {meal === "lunch" ? "🍜" : "🍲"}
          </text>
        </svg>
        <span className="wheel-dot">✦</span>
      </div>
      {n > 16 && (
        <p className="hint">共{n}道菜，转盘显示部分编号；每道菜机会相同。</p>
      )}
      <button className="primary spin" disabled={busy || !n} onClick={spin}>
        {busy ? "幸运正在转动…" : result ? "再转一次" : "帮我选一个！"}{" "}
        <Sparkles size={16} />
      </button>
      {!n && (
        <button className="text-button" onClick={onManage}>
          菜单空空的，添加一道喜欢的菜
        </button>
      )}
      <AnimatePresence>
        {result && (
          <motion.div
            className="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="result-celebration" aria-hidden="true">🍙 ✨ 💛</div><span className="eyebrow">✦ 今天的幸运答案 ✦</span>
            <h3>
              {result.emoji} {result.name}
            </h3>
            <p className="result-message">{surprise ? "🎁 小饭团悄悄说：今天的好运藏在这顿饭里！" : meal === "lunch" ? "午间充电时间到，好好享受这一餐吧！" : "辛苦一天啦，用喜欢的味道温柔收尾。"}</p>
            <p>
              {result.kcal !== undefined
                ? `参考热量：约${result.kcal} kcal`
                : "热量待手动填写"}
            </p>
            <button
              className="secondary"
              onClick={() => {
                onChoose(result);
                setResult(undefined);
              }}
            >
              💛 就吃这个！
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {choice && (
        <p className="confirmed">
          已选：{choice.emoji} {choice.name}
          <small>只是选好了，吃过后再记录哦</small>
        </p>
      )}
    </section>
  );
}
