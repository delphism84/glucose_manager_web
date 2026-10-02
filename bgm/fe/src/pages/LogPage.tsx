import { useEffect, useRef, useState } from "react";
import { Drop, ForkKnife, Trash } from "@phosphor-icons/react";
import { Card, PageHeader } from "@/components/ui";
import { BAND, DAY, TAG, band, fmt, hhmm, startOfDay, stats, unitLabel } from "@/lib/glucose";
import { MEAL, update, useStore } from "@/lib/store";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function LogPage() {
  const s = useStore();
  const { unit, targetLow: lo, targetHigh: hi } = s.profile;
  const today = startOfDay(Date.now());
  const [day, setDay] = useState(today);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    strip.current?.scrollTo({ left: strip.current.scrollWidth });
  }, []);

  const days = Array.from({ length: 30 }, (_, i) => today - (29 - i) * DAY);
  const inDay = (ts: number) => ts >= day && ts < day + DAY;
  const readings = s.readings.filter((r) => inDay(r.ts));
  const meals = s.meals.filter((m) => inDay(m.ts));
  const st = stats(readings, lo, hi);
  const has = new Set(s.readings.map((r) => startOfDay(r.ts)));

  const items = [
    ...readings.map((r) => ({ kind: "r" as const, ts: r.ts, r })),
    ...meals.map((m) => ({ kind: "m" as const, ts: m.ts, m })),
  ].sort((a, b) => b.ts - a.ts);

  const remove = (kind: "r" | "m", id: string) => {
    if (!window.confirm("이 기록을 삭제할까요?")) return;
    update((st) =>
      kind === "r"
        ? { ...st, readings: st.readings.filter((x) => x.id !== id) }
        : { ...st, meals: st.meals.filter((x) => x.id !== id) }
    );
  };

  return (
    <>
      <PageHeader title="기록" sub={`${new Date(day).getFullYear()}년 ${new Date(day).getMonth() + 1}월`} />

      <div ref={strip} className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-4">
        {days.map((t) => {
          const d = new Date(t);
          const active = t === day;
          return (
            <button
              key={t}
              onClick={() => setDay(t)}
              className={`flex w-12 shrink-0 flex-col items-center gap-1 rounded-2xl py-2.5 transition ${
                active ? "bg-navy text-white shadow-card" : "bg-white text-sub"
              }`}
            >
              <span className={`text-[11px] font-medium ${active ? "text-white/70" : ""}`}>{t === today ? "오늘" : WEEK[d.getDay()]}</span>
              <span className={`text-base font-extrabold ${active ? "" : "text-navy"}`}>{d.getDate()}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${has.has(t) ? (active ? "bg-rose" : "bg-brand") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      <div className="space-y-4 px-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "평균", value: st.n ? fmt(st.avg, unit) : "–" },
            { label: "최저 · 최고", value: st.n ? `${fmt(st.min, unit)}·${fmt(st.max, unit)}` : "–" },
            { label: "탄수화물", value: `${meals.reduce((a, m) => a + m.carbs, 0)}g` },
          ].map((x) => (
            <div key={x.label} className="rounded-2xl bg-white p-3.5 shadow-card">
              <p className="text-[11px] font-medium text-sub">{x.label}</p>
              <p className="mt-0.5 text-lg font-extrabold text-navy">{x.value}</p>
            </div>
          ))}
        </div>

        <Card className="!p-0">
          {items.length ? (
            <ul className="divide-y divide-line">
              {items.map((it) => {
                const isR = it.kind === "r";
                const b = isR ? BAND[band(it.r.value, lo, hi)] : null;
                return (
                  <li key={isR ? it.r.id : it.m.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="w-11 shrink-0 text-xs font-semibold text-sub">{hhmm(it.ts)}</span>
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={b ? { background: b.soft, color: b.color } : { background: "#eef1f8", color: "#16264c" }}
                    >
                      {isR ? <Drop size={20} weight="fill" /> : <ForkKnife size={20} weight="fill" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {isR ? (
                        <>
                          <p className="text-[17px] font-extrabold leading-tight text-navy">
                            {fmt(it.r.value, unit)} <span className="text-[11px] font-medium text-mute">{unitLabel(unit)}</span>
                          </p>
                          <p className="truncate text-xs text-sub">
                            {TAG[it.r.tag]} · <span style={{ color: b!.color }}>{b!.label}</span>
                            {it.r.note && ` · ${it.r.note}`}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="truncate text-sm font-bold text-ink">{it.m.name}</p>
                          <p className="text-xs text-sub">
                            {MEAL[it.m.type]} · 탄수화물 {it.m.carbs}g{it.m.kcal ? ` · ${it.m.kcal}kcal` : ""}
                          </p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => remove(it.kind, isR ? it.r.id : it.m.id)}
                      aria-label="삭제"
                      className="rounded-full p-2 text-mute active:bg-canvas"
                    >
                      <Trash size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-sub">
              이 날의 기록이 없습니다.
              <br />+ 버튼으로 혈당이나 식사를 추가해 보세요.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
