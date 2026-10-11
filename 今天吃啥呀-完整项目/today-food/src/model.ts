export type Meal = "lunch" | "dinner";
export type Food = {
  id: string;
  name: string;
  emoji: string;
  kcal?: number;
  portion: string;
};
export type Item = { id: string; name: string; kcal: number };
export type Quote = { id: string; text: string; category: string };
export type State = {
  version: 1;
  menus: Record<Meal, Food[]>;
  choices: Record<string, Partial<Record<Meal, Food>>>;
  records: Record<string, Partial<Record<Meal, Item[]>>>;
  quotes: Quote[];
  favorites: Quote[];
  preferences: { quiet: boolean };
};
export const uid = () =>
  crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
export function dateKey(d = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function dateLabel(key: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })
    .format(new Date(key + "T12:00:00+08:00"))
    .replace("日", "日 ");
}
export const reference = [
  ["黄焖鸡米饭", 750],
  ["兰州牛肉面", 600],
  ["番茄牛腩饭", 650],
  ["鸡腿饭", 700],
  ["麻辣烫", 600],
  ["水饺", 500],
  ["盖浇饭", 700],
  ["砂锅", 600],
  ["炒饭", 650],
  ["鸡胸肉饭", 500],
] as const;
export function estimate(name: string) {
  return reference.find(([n]) => n === name.trim())?.[1];
}
export function numberValue(s: string, max = 10000) {
  if (!/^\d+(\.\d{1,2})?$/.test(s.trim()))
    throw Error("请输入有效的非负数，最多两位小数。");
  const n = Number(s);
  if (n > max) throw Error(`数值不能超过${max}。`);
  return n;
}
export function calories(density: string, grams: string) {
  return Math.round(
    (numberValue(density, 1000) * numberValue(grams, 5000)) / 100,
  );
}
export function landingRotation(current: number, index: number, count: number) {
  const target = (((360 - ((index + 0.5) * 360) / count) % 360) + 360) % 360;
  return current + 1800 + ((target - (current % 360) + 360) % 360);
}
export function pointerIndex(rotation: number, count: number) {
  return Math.floor(((360 - (rotation % 360)) % 360) / (360 / count)) % count;
}
const starts = [
  "今天也要好好吃饭，",
  "给自己留一点余地，",
  "慢一点也没关系，",
  "把日子过得舒服一些，",
  "认真照顾自己的时候，",
  "不用急着证明什么，",
  "每一步都值得珍惜，",
  "允许生活有些留白，",
  "记得给自己一个微笑，",
  "你可以按自己的节奏来，",
];
const ends = [
  "一顿热饭也能带来踏实的力量。",
  "微小的坚持正在慢慢积累。",
  "休息好了，再出发也来得及。",
  "喜欢的味道能点亮平常的一天。",
  "今天的你值得被温柔对待。",
  "规律生活从一次小小的选择开始。",
  "偶尔多吃一点也不会抹去努力。",
  "身体的感受值得认真听见。",
  "快乐可以藏在简单的日常里。",
  "不必完美，照顾好自己就很好。",
];
export const builtins: Quote[] = starts.flatMap((s, i) =>
  ends.map((e, j) => ({
    id: `builtin-${i}-${j}`,
    text: s + e,
    category: ["温柔治愈", "自律成长", "快乐生活"][(i + j) % 3],
  })),
);
export function dailyQuote(key: string, custom: Quote[]) {
  const pool = [...builtins, ...custom];
  const day = Math.floor(
    new Date(key + "T00:00:00+08:00").getTime() / 86400000,
  );
  return pool[((day % pool.length) + pool.length) % pool.length];
}
export const personalMenu: ReadonlyArray<readonly [string, number]> = [
  ["沙县鸡腿饭", 460],
  ["沙县鸭腿饭", 520],
  ["减脂麻辣烫", 450],
  ["兰州拉面加蛋", 400],
  ["去皮的烤鸡", 550],
  ["老乡鸡葱油鸡加青菜", 500],
  ["袁记云饺", 450],
  ["赛百味不加芝士和酱", 450],
  ["清蒸鱼加米饭", 450],
  ["牛肉减脂沙拉", 450],
  ["鸡胸肉减脂沙拉", 450],
  ["烤鸡腿饭", 450],
  ["白切鸡饭", 450],
  ["蒸菜馆", 500],
];
export function initial(): State {
  const foods = personalMenu.map(([name, kcal], i) => ({
    id: uid(),
    name,
    kcal,
    emoji: ["🍗", "🍱", "🥬", "🍜", "🍗", "🥗", "🥟", "🥪", "🐟", "🥩", "🥗", "🍗", "🍚", "🥦"][i],
    portion: "一份",
  }));
  return {
    version: 1,
    menus: {
      lunch: foods,
      dinner: foods.map((f) => ({ ...f, id: uid() })),
    },
    choices: {},
    records: {},
    quotes: [],
    favorites: [],
    preferences: { quiet: false },
  };
}

const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 100) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
function validFood(f: unknown): f is Food {
  return (
    obj(f) &&
    str(f.id) &&
    str(f.name, 60) &&
    typeof f.emoji === "string" &&
    f.emoji.length <= 16 &&
    typeof f.portion === "string" &&
    f.portion.length <= 100 &&
    (f.kcal === undefined ||
      (typeof f.kcal === "number" &&
        Number.isFinite(f.kcal) &&
        f.kcal >= 0 &&
        f.kcal <= 10000))
  );
}
function validQuote(q: unknown) {
  return obj(q) && str(q.id) && str(q.text, 200) && str(q.category, 20);
}
export function validate(v: unknown): State {
  if (
    !obj(v) ||
    v.version !== 1 ||
    !obj(v.menus) ||
    !obj(v.choices) ||
    !obj(v.records) ||
    !Array.isArray(v.quotes) ||
    !Array.isArray(v.favorites) ||
    !obj(v.preferences) ||
    typeof v.preferences.quiet !== "boolean"
  )
    throw Error("备份格式不正确。");
  for (const m of ["lunch", "dinner"]) {
    const fs = v.menus[m];
    if (
      !Array.isArray(fs) ||
      fs.length > 100 ||
      !fs.every(validFood) ||
      new Set(fs.map((f) => f.name.trim())).size !== fs.length ||
      new Set(fs.map((f) => f.id)).size !== fs.length
    )
      throw Error("菜单数据无效或存在重复。");
  }
  for (const [key, value] of Object.entries(v.choices)) {
    if (
      !validDate(key) ||
      !obj(value) ||
      Object.entries(value).some(
        ([m, f]) => !["lunch", "dinner"].includes(m) || !validFood(f),
      )
    )
      throw Error("选择记录无效。");
  }
  for (const [key, value] of Object.entries(v.records)) {
    if (!validDate(key) || !obj(value)) throw Error("饮食日期无效。");
    for (const [m, items] of Object.entries(value)) {
      if (
        !["lunch", "dinner"].includes(m) ||
        !Array.isArray(items) ||
        items.length > 100 ||
        !items.every(
          (i) =>
            obj(i) &&
            str(i.id) &&
            str(i.name, 60) &&
            typeof i.kcal === "number" &&
            Number.isFinite(i.kcal) &&
            i.kcal >= 0 &&
            i.kcal <= 10000,
        )
      )
        throw Error("饮食记录无效。");
    }
  }
  if (
    v.quotes.length > 1000 ||
    v.favorites.length > 1100 ||
    !v.quotes.every(validQuote) ||
    !v.favorites.every(validQuote)
  )
    throw Error("语录数据无效。");
  return v as State;
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    dateKey(new Date(s + "T12:00:00+08:00")) === s
  );
}
export const STORAGE = "today-food-v1";
