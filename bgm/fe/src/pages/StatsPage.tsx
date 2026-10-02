import { useState } from "react";
import { Lightbulb } from "@phosphor-icons/react";
import { Bars, GlucoseChart, Ring, TirLegend } from "@/components/charts";
import { Card, CardTitle, PageHeader, Segmented } from "@/components/ui";
import { daily, mealImpact, tagAverages, within } from "@/lib/analysis";
import { BAND, DAY, TAG, band, fmt, md, startOfDay, stats, unitLabel } from "@/lib/glucose";
import { useStore } from "@/lib/store";

export function StatsPage() {
  const s = useStore();
  const { unit, targetLow: lo, targetHigh: hi } = s.profile;
  const [days, setDays] = useState(14);
  const now = Date.now();

  const rs = within(s.readings, days);
  const st = stats(rs, lo, hi);
  const prev = stats(
    s.readings.filter((r) => r.ts < startOfDay(now) - (days - 1) * DAY && r.ts >= startOfDay(now) - (2 * days - 1) * DAY),
    lo,
    hi
  );
  const series = daily(rs);
  const tags = tagAverages(rs);
  const impact = mealImpact(within(s.meals, days), rs).slice(0, 3);

  const from = startOfDay(now) - (days - 1) * DAY;
  const ticks = [0, 0.5, 1].map((p) => {
    const x = from + p * (days - 1) * DAY;
    return { x, label: md(x) };
  });

  const dAvg = prev.n ? st.avg - prev.avg : 0;
  const worst = [...tags].filter((t) => t.n).sort((a, b) => b.avg - a.avg)[0];
  const insight = !st.n
    ? "기록이 쌓이면 이곳에 분석 결과가 표시됩니다."
    : `목표 범위 안에 든 측정이 ${Math.round(st.pct.in)}%입니다.` +
      (prev.n
        ? ` 평균 혈당은 직전 ${days}일보다 ${fmt(Math.abs(dAvg), unit)} ${unitLabel(unit)} ${dAvg <= 0 ? "낮아졌습니다." : "높아졌습니다."}`
        : "") +
      (worst ? ` ${TAG[worst.tag]} 혈당이 평균 ${fmt(worst.avg, unit)}로 가장 높습니다.` : "");

  const tiles = [
    { label: "평균 혈당", value: st.n ? fmt(st.avg, unit) : "–", unit: unitLabel(unit) },
    { label: "예상 당화혈색소", value: st.n ? st.gmi.toFixed(1) : "–", unit: "%" },
    { label: "변동계수", value: st.n ? st.cv.toFixed(0) : "–", unit: "%" },
  ];

  return (
    <>
      <PageHeader title="통계" sub={`측정 ${st.n}회 기준`} />
      <div className="space-y-4 px-5">
        <Segmented
          value={days}
          onChange={setDays}
          options={[7, 14, 30, 90].map((d) => ({ value: d, label: `${d}일` }))}
        />

        <div className="flex gap-3 rounded-3xl bg-blush p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
            <Lightbulb size={20} weight="fill" />
          </span>
          <p className="text-[13px] leading-relaxed text-ink">{insight}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-white p-3.5 shadow-card">
              <p className="text-[11px] font-medium text-sub">{t.label}</p>
              <p className="mt-1 text-[22px] font-extrabold leading-none text-navy">{t.value}</p>
              <p className="mt-1 text-[10px] font-medium text-mute">{t.unit}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardTitle right={`${fmt(lo, unit)}–${fmt(hi, unit)} ${unitLabel(unit)}`}>목표 범위 내 비율</CardTitle>
          <div className="flex items-center gap-6">
            <Ring value={st.pct.in} label="목표 범위" size={124} />
            <div className="flex-1">
              <TirLegend pct={st.pct} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle right="일 평균 · 최저–최고">일별 추이</CardTitle>
          <GlucoseChart
            data={series}
            xDomain={[from, startOfDay(now)]}
            xTicks={ticks}
            low={lo}
            high={hi}
            dots={days <= 30}
            height={190}
          />
        </Card>

        <Card>
          <CardTitle>측정 시점별 평균</CardTitle>
          <Bars items={tags.map((t) => ({ label: TAG[t.tag], value: t.avg }))} low={lo} high={hi} format={(v) => fmt(v, unit)} />
        </Card>

        <Card>
          <CardTitle right="식후 1~3시간 기준">혈당을 많이 올린 식사</CardTitle>
          {impact.length ? (
            <ol className="space-y-3">
              {impact.map((m, i) => (
                <li key={m.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-soft text-xs font-extrabold text-navy">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{m.name}</p>
                    <p className="text-xs text-sub">
                      탄수화물 {m.carbs}g · {m.n}회
                    </p>
                  </div>
                  <span className="text-[15px] font-extrabold" style={{ color: BAND[band(m.avg, lo, hi)].color }}>
                    {fmt(m.avg, unit)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-2 text-sm text-sub">식사와 식후 혈당을 함께 기록하면 분석됩니다.</p>
          )}
        </Card>

        <p className="px-1 pb-2 text-[11px] leading-relaxed text-mute">
          예상 당화혈색소는 평균 혈당으로 계산한 참고값(GMI)이며, 손끝 채혈 기록은 측정 횟수가 적을수록 실제 검사 결과와 차이가 날 수 있습니다.
        </p>
      </div>
    </>
  );
}
