import { Barbell, CalendarBlank, Drop, FirstAid, Flask, Pill, type Icon } from "@phosphor-icons/react";
import { DAY, hhmm, startOfDay } from "./glucose";
import type { CalEvent, EventCategory, Repeat } from "./store";

export const CATEGORY: Record<EventCategory, { label: string; icon: Icon; color: string; soft: string; preset: string }> = {
  hospital: { label: "병원 진료", icon: FirstAid, color: "#e5343f", soft: "#fdebec", preset: "내과 정기 진료" },
  test: { label: "검사", icon: Flask, color: "#7c5cff", soft: "#f0ecff", preset: "당화혈색소 검사" },
  med: { label: "약·처방", icon: Pill, color: "#ff6b8b", soft: "#fff0f3", preset: "처방약 수령" },
  measure: { label: "혈당 측정", icon: Drop, color: "#16264c", soft: "#eef1f8", preset: "식후 2시간 혈당 측정" },
  exercise: { label: "운동", icon: Barbell, color: "#12b886", soft: "#e4f8f1", preset: "저녁 걷기 30분" },
  other: { label: "기타", icon: CalendarBlank, color: "#6b7489", soft: "#f1f2f6", preset: "" },
};

export const REPEAT: Record<Repeat, string> = {
  none: "반복 안 함",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
};

export const REMIND: { min: number; label: string }[] = [
  { min: 0, label: "정시" },
  { min: 10, label: "10분 전" },
  { min: 60, label: "1시간 전" },
  { min: 1440, label: "하루 전" },
  { min: 4320, label: "3일 전" },
];

export interface Occurrence {
  event: CalEvent;
  ts: number;
}

/** 반복 일정을 펼쳐 [from, to) 구간의 실제 발생 시각 목록을 만든다 */
export function occurrences(events: CalEvent[], from: number, to: number): Occurrence[] {
  const out: Occurrence[] = [];
  for (const event of events) {
    if (event.repeat === "none") {
      if (event.ts >= from && event.ts < to) out.push({ event, ts: event.ts });
      continue;
    }
    const d = new Date(event.ts);
    const at = (month: number, date: number) =>
      new Date(d.getFullYear(), month, date, d.getHours(), d.getMinutes()).getTime();
    if (event.repeat === "monthly") {
      const f = new Date(from);
      const k0 = Math.max(0, (f.getFullYear() - d.getFullYear()) * 12 + f.getMonth() - d.getMonth());
      for (let k = k0; at(d.getMonth() + k, 1) < to; k++) {
        const ts = at(d.getMonth() + k, d.getDate());
        // 31일처럼 그 달에 없는 날짜는 건너뛴다
        if (new Date(ts).getDate() === d.getDate() && ts >= from && ts < to) out.push({ event, ts });
      }
    } else {
      const step = event.repeat === "daily" ? 1 : 7;
      const k0 = Math.max(0, Math.floor((startOfDay(from) - startOfDay(event.ts)) / DAY / step));
      for (let k = k0; ; k++) {
        const ts = at(d.getMonth(), d.getDate() + k * step);
        if (ts >= to) break;
        if (ts >= from) out.push({ event, ts });
      }
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

export function dday(ts: number, now = Date.now()): string {
  const n = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (n === 0) return "오늘";
  if (n === 1) return "내일";
  return n > 0 ? `D-${n}` : `${-n}일 전`;
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function dateLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEK[d.getDay()]})`;
}

/** 문자 알림에 들어갈 본문 */
export function smsText(o: Occurrence, name: string): string {
  const e = o.event;
  return `[혈당노트] ${name}님, ${dateLabel(o.ts)} ${hhmm(o.ts)} '${e.title}' 일정이 있습니다.${e.place ? ` 장소: ${e.place}` : ""}`;
}
