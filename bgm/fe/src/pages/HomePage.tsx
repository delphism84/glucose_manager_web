import { Link } from "react-router-dom";
import { Bell, CaretRight, Check, ForkKnife, Pill, TrendDown, TrendUp } from "@phosphor-icons/react";
import { GlucoseChart, Ring, TirBar } from "@/components/charts";
import { Card, CardTitle } from "@/components/ui";
import { BAND, DAY, TAG, ago, band, fmt, hhmm, startOfDay, stats, unitLabel } from "@/lib/glucose";
import { occurrences } from "@/lib/schedule";
import { MEAL, dayKey, update, useStore } from "@/lib/store";
import { EventRow } from "./SchedulePage";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function HomePage() {
  const s = useStore();
  const { unit, targetLow: lo, targetHigh: hi, name } = s.profile;
  const now = Date.now();
  const d = new Date(now);

  const sorted = [...s.readings].sort((a, b) => a.ts - b.ts);
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = last && prev ? last.value - prev.value : 0;
  const lastBand = last ? BAND[band(last.value, lo, hi)] : null;

  const day24 = sorted.filter((r) => r.ts > now - DAY);
  const week = stats(sorted.filter((r) => r.ts > now - 7 * DAY), lo, hi);
  const todayMeals = s.meals.filter((m) => m.ts >= startOfDay(now)).sort((a, b) => a.ts - b.ts);
  const carbs = todayMeals.reduce((a, m) => a + m.carbs, 0);

  const upcoming = occurrences(s.events, now, now + 30 * DAY).slice(0, 2);

  const key = dayKey(now);
  const taken = s.medTaken[key] ?? [];
  const doses = s.meds.flatMap((m) => m.times.map((t) => ({ id: `${m.id}@${t}`, med: m, time: t })));
  doses.sort((a, b) => a.time.localeCompare(b.time));
  const toggleDose = (id: string) =>
    update((st) => {
      const cur = st.medTaken[key] ?? [];
      return { ...st, medTaken: { ...st.medTaken, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } };
    });

  const ticks = [0, 6, 12, 18, 24].map((h) => {
    const x = now - DAY + h * 3600000;
    return { x, label: h === 24 ? "지금" : `${new Date(x).getHours()}시` };
  });

  return (
    <>
      <header className="flex items-center justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div>
          <p className="text-xs font-medium text-sub">
            {d.getMonth() + 1}월 {d.getDate()}일 {WEEK[d.getDay()]}요일
          </p>
          <h1 className="text-[22px] font-extrabold tracking-tight text-navy">{name}님, 안녕하세요</h1>
        </div>
        <Link to="/me" aria-label="알림 설정" className="relative rounded-full bg-white p-2.5 text-navy shadow-card">
          <Bell size={20} weight="bold" />
          {s.profile.reminders && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />}
        </Link>
      </header>

      <div className="space-y-4 px-5">
        {/* 최근 혈당 */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-navy to-navy-deep p-6 text-white shadow-card">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-rose/25 blur-2xl" />
          <div className="absolute -bottom-16 right-10 h-32 w-32 rounded-full bg-brand/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white/70">최근 혈당</span>
              {last && (
                <span className="text-xs font-medium text-white/60">
                  {TAG[last.tag]} · {ago(last.ts)}
                </span>
              )}
            </div>
            {last && lastBand ? (
              <>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-[64px] font-extrabold leading-[0.9] tracking-tighter">{fmt(last.value, unit)}</span>
                  <span className="pb-1.5 text-sm font-semibold text-white/60">{unitLabel(unit)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: lastBand.color }}>
                    {lastBand.label}
                  </span>
                  {prev && (
                    <span className="flex items-center gap-1 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/85">
                      {delta >= 0 ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                      직전 대비 {delta >= 0 ? "+" : "−"}
                      {fmt(Math.abs(delta), unit)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 text-[15px] text-white/80">아직 기록이 없습니다. 아래 + 버튼으로 첫 혈당을 기록해 보세요.</p>
            )}
          </div>
        </section>

        {/* 다가오는 일정 */}
        {upcoming.length > 0 && (
          <Card className="!py-3">
            <ul className="divide-y divide-line">
              {upcoming.map((o) => (
                <li key={o.event.id + o.ts}>
                  <Link to="/schedule">
                    <EventRow o={o} showDate />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* 최근 24시간 */}
        <Card>
          <CardTitle right={`${day24.length}회 측정`}>최근 24시간</CardTitle>
          <GlucoseChart
            data={day24.map((r) => ({ x: r.ts, y: r.value }))}
            xDomain={[now - DAY, now]}
            xTicks={ticks}
            low={lo}
            high={hi}
          />
        </Card>

        {/* 주간 요약 */}
        <Card>
          <CardTitle
            right={
              <Link to="/stats" className="flex items-center gap-0.5 text-brand">
                통계 보기 <CaretRight size={12} weight="bold" />
              </Link>
            }
          >
            최근 7일
          </CardTitle>
          <div className="flex items-center gap-5">
            <Ring value={week.pct.in} label="목표 범위" />
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-sub">평균 혈당</p>
                  <p className="text-xl font-extrabold text-navy">
                    {week.n ? fmt(week.avg, unit) : "–"}
                    <span className="ml-1 text-[11px] font-medium text-mute">{unitLabel(unit)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-sub">예상 당화혈색소</p>
                  <p className="text-xl font-extrabold text-navy">
                    {week.n ? week.gmi.toFixed(1) : "–"}
                    <span className="ml-1 text-[11px] font-medium text-mute">%</span>
                  </p>
                </div>
              </div>
              <TirBar pct={week.pct} />
              <p className="text-[11px] text-sub">
                저혈당 {week.count.low + week.count.vlow}회 · 고혈당 {week.count.high + week.count.vhigh}회
              </p>
            </div>
          </div>
        </Card>

        {/* 복약 */}
        {doses.length > 0 && (
          <Card>
            <CardTitle right={`${taken.length}/${doses.length} 완료`}>오늘의 복약</CardTitle>
            <ul className="space-y-2">
              {doses.map((x) => {
                const done = taken.includes(x.id);
                return (
                  <li key={x.id}>
                    <button
                      onClick={() => toggleDose(x.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${done ? "bg-canvas" : "bg-blush"}`}
                    >
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${done ? "bg-white text-mute" : "bg-white text-brand"}`}>
                        <Pill size={20} weight="fill" />
                      </span>
                      <span className="flex-1">
                        <span className={`block text-sm font-bold ${done ? "text-mute line-through" : "text-navy"}`}>
                          {x.med.name} {x.med.dose}
                        </span>
                        <span className="text-xs text-sub">{x.time}</span>
                      </span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                          done ? "border-navy bg-navy text-white" : "border-rose/50 bg-white text-transparent"
                        }`}
                      >
                        <Check size={14} weight="bold" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {/* 식단 */}
        <Card>
          <CardTitle right={`탄수화물 ${carbs}g`}>오늘의 식단</CardTitle>
          {todayMeals.length ? (
            <ul className="divide-y divide-line">
              {todayMeals.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-soft text-navy">
                    <ForkKnife size={20} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{m.name}</p>
                    <p className="text-xs text-sub">
                      {MEAL[m.type]} · {hhmm(m.ts)}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold text-navy">{m.carbs}g</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-sub">오늘 기록한 식사가 없습니다.</p>
          )}
        </Card>
      </div>
    </>
  );
}
