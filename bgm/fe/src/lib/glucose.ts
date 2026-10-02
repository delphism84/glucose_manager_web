import type { Reading, Tag, Unit } from "./store";

export const MMOL = 18.0182;

export type Band = "vlow" | "low" | "in" | "high" | "vhigh";

export const BANDS: Band[] = ["vlow", "low", "in", "high", "vhigh"];

export const BAND: Record<Band, { label: string; color: string; soft: string }> = {
  vlow: { label: "매우 낮음", color: "#1f3a8a", soft: "#e6ebfa" },
  low: { label: "낮음", color: "#4c6fe0", soft: "#ebf0fd" },
  in: { label: "목표 범위", color: "#12b886", soft: "#e4f8f1" },
  high: { label: "높음", color: "#ff7a93", soft: "#fff0f3" },
  vhigh: { label: "매우 높음", color: "#e5343f", soft: "#fdebec" },
};

export const TAG: Record<Tag, string> = {
  fasting: "공복",
  before: "식전",
  after: "식후",
  bedtime: "취침 전",
  other: "기타",
};

export function band(v: number, lo = 70, hi = 180): Band {
  if (v < 54) return "vlow";
  if (v < lo) return "low";
  if (v <= hi) return "in";
  if (v <= 250) return "high";
  return "vhigh";
}

export function fmt(v: number, unit: Unit): string {
  return unit === "mmol" ? (v / MMOL).toFixed(1) : String(Math.round(v));
}

export function unitLabel(unit: Unit): string {
  return unit === "mmol" ? "mmol/L" : "mg/dL";
}

export function toMgdl(input: number, unit: Unit): number {
  return unit === "mmol" ? Math.round(input * MMOL) : Math.round(input);
}

export interface Stats {
  n: number;
  avg: number;
  sd: number;
  cv: number;
  /** Glucose Management Indicator (예상 당화혈색소, %) */
  gmi: number;
  min: number;
  max: number;
  pct: Record<Band, number>;
  count: Record<Band, number>;
}

export function stats(rs: Reading[], lo: number, hi: number): Stats {
  const count: Record<Band, number> = { vlow: 0, low: 0, in: 0, high: 0, vhigh: 0 };
  const n = rs.length;
  if (!n) {
    return { n: 0, avg: 0, sd: 0, cv: 0, gmi: 0, min: 0, max: 0, pct: { ...count }, count };
  }
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const r of rs) {
    sum += r.value;
    min = Math.min(min, r.value);
    max = Math.max(max, r.value);
    count[band(r.value, lo, hi)]++;
  }
  const avg = sum / n;
  const sd = Math.sqrt(rs.reduce((a, r) => a + (r.value - avg) ** 2, 0) / n);
  const pct = { ...count };
  for (const b of BANDS) pct[b] = (count[b] / n) * 100;
  return { n, avg, sd, cv: (sd / avg) * 100, gmi: 3.31 + 0.02392 * avg, min, max, pct, count };
}

export const DAY = 86400000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function md(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function ago(ts: number): string {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}

/** <input type="datetime-local"> 값 ↔ timestamp */
export function toLocalInput(ts: number): string {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
