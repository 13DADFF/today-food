import { describe, it, expect } from "vitest";
import {
  initial,
  validate,
  landingRotation,
  pointerIndex,
  calories,
  numberValue,
  dateKey,
  dailyQuote,
  builtins,
  estimate,
} from "./model";
describe("核心数据逻辑", () => {
  it("所有菜单规模的指针与结果一致", () => {
    for (let n = 1; n <= 100; n++)
      for (let i = 0; i < n; i++)
        for (const a of [0, 107.5, 3600, 5399])
          expect(pointerIndex(landingRotation(a, i, n), n)).toBe(i);
  });
  it("按重量计算与输入校验", () => {
    expect(calories("250", "150")).toBe(375);
    for (const s of ["", "-1", "abc", "1e3", "10001", "NaN"])
      expect(() => numberValue(s)).toThrow();
    expect(() => calories("2000", "100")).toThrow();
  });
  it("北京时间跨日", () => {
    expect(dateKey(new Date("2026-10-10T16:00:00Z"))).toBe("2026-10-11");
  });
  it("每日语录稳定且100句不重复", () => {
    expect(builtins).toHaveLength(100);
    expect(new Set(builtins.map((q) => q.text)).size).toBe(100);
    expect(dailyQuote("2026-10-10", [])).toEqual(dailyQuote("2026-10-10", []));
    expect(dailyQuote("2026-10-11", []).id).not.toBe(
      dailyQuote("2026-10-10", []).id,
    );
  });
  it("备份往返与非法导入", () => {
    const s = initial();
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(() => validate({ version: 1 })).toThrow();
    s.menus.lunch.push({ ...s.menus.lunch[0] });
    expect(() => validate(s)).toThrow();
  });
  it("两个菜单独立且选择不影响食用记录", () => {
    const s = initial();
    s.menus.lunch = [];
    expect(s.menus.dinner.length).toBeGreaterThan(0);
    s.choices["2026-10-10"] = { dinner: s.menus.dinner[0] };
    expect(s.records).toEqual({});
  });
  it("仅可靠完整名称匹配", () => {
    expect(estimate("番茄牛腩饭")).toBe(650);
    expect(estimate("神秘外卖")).toBeUndefined();
  });
});
