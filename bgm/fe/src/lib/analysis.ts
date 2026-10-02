import { DAY, startOfDay } from "./glucose";
import type { Meal, Reading, Tag } from "./store";

/** 일별 평균·최저·최고 (기록 있는 날만) */
export function daily(rs: Reading[]) {
  const by = new Map<number, number[]>();
  for (const r of rs) {
    const k = startOfDay(r.ts);
    by.set(k, [...(by.get(k) ?? []), r.value]);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([x, v]) => ({ x, y: v.reduce((a, b) => a + b, 0) / v.length, lo: Math.min(...v), hi: Math.max(...v) }));
}

export function tagAverages(rs: Reading[]) {
  const tags: Tag[] = ["fasting", "before", "after", "bedtime"];
  return tags.map((tag) => {
    const v = rs.filter((r) => r.tag === tag);
    return { tag, n: v.length, avg: v.length ? v.reduce((a, r) => a + r.value, 0) / v.length : 0 };
  });
}

/** 식사 후 1~3시간 안의 식후 혈당을 짝지어, 많이 오른 식사부터 */
export function mealImpact(meals: Meal[], rs: Reading[]) {
  const after = rs.filter((r) => r.tag === "after");
  const by = new Map<string, { name: string; carbs: number; peaks: number[] }>();
  for (const m of meals) {
    const hit = after.find((r) => r.ts > m.ts + 3600000 && r.ts < m.ts + 3 * 3600000);
    if (!hit) continue;
    const cur = by.get(m.name) ?? { name: m.name, carbs: m.carbs, peaks: [] };
    cur.peaks.push(hit.value);
    by.set(m.name, cur);
  }
  return [...by.values()]
    .map((x) => ({ name: x.name, carbs: x.carbs, n: x.peaks.length, avg: x.peaks.reduce((a, b) => a + b, 0) / x.peaks.length }))
    .sort((a, b) => b.avg - a.avg);
}

export function within<T extends { ts: number }>(xs: T[], days: number, now = Date.now()): T[] {
  const from = startOfDay(now) - (days - 1) * DAY;
  return xs.filter((x) => x.ts >= from && x.ts <= now);
}
