import { useState } from "react";
import { EnvelopeSimple, FilePdf, PaperPlaneTilt, Plus, X } from "@phosphor-icons/react";
import { GlucoseChart, TirBar, TirLegend } from "@/components/charts";
import { Card, CardTitle, Chip, PageHeader, Segmented, Toggle, inputCls } from "@/components/ui";
import { daily, tagAverages, within } from "@/lib/analysis";
import { DAY, TAG, fmt, hhmm, md, startOfDay, stats, unitLabel } from "@/lib/glucose";
import { update, useStore, type ReportCfg } from "@/lib/store";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function setCfg(patch: Partial<ReportCfg>) {
  update((s) => ({ ...s, report: { ...s.report, ...patch } }));
}

export function ReportPage() {
  const s = useStore();
  const { unit, targetLow: lo, targetHigh: hi } = s.profile;
  const cfg = s.report;
  const [days, setDays] = useState(14);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("가족");
  const [toast, setToast] = useState("");
  const now = Date.now();

  const rs = within(s.readings, days);
  const meals = within(s.meals, days);
  const st = stats(rs, lo, hi);
  const from = startOfDay(now) - (days - 1) * DAY;
  const tags = tagAverages(rs);
  const mealDays = new Set(meals.map((m) => startOfDay(m.ts))).size || 1;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  };

  const addRecipient = () => {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) return flash("이메일 주소를 확인해 주세요");
    if (cfg.recipients.some((r) => r.email === e)) return flash("이미 등록된 주소입니다");
    setCfg({ recipients: [...cfg.recipients, { email: e, label }] });
    setEmail("");
  };

  const sendNow = () => {
    if (!cfg.recipients.length) return flash("받는 사람을 먼저 추가해 주세요");
    setCfg({
      history: [{ ts: Date.now(), days, to: cfg.recipients.map((r) => r.email), auto: false }, ...cfg.history].slice(0, 20),
    });
    flash("발송 요청을 저장했습니다 · 메일 발송 기능은 준비 중입니다");
  };

  return (
    <>
      <PageHeader title="리포트" sub="기간별 요약과 이메일 자동 보고" />
      <div className="space-y-4 px-5">
        <Segmented value={days} onChange={setDays} options={[7, 14, 30, 90].map((d) => ({ value: d, label: `${d}일` }))} />

        {/* 리포트 미리보기 (인쇄 영역) */}
        <section className="print-area overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="bg-gradient-to-br from-navy to-navy-deep px-5 py-5 text-white">
            <p className="text-[11px] font-semibold tracking-widest text-rose">GLUCOSE REPORT</p>
            <h2 className="mt-1 text-xl font-extrabold">{s.profile.name}님의 혈당 리포트</h2>
            <p className="mt-1 text-xs text-white/65">
              {md(from)} – {md(now)} ({days}일) · {s.profile.diabetesType}
            </p>
          </div>
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-3 divide-x divide-line text-center">
              {[
                { l: "평균 혈당", v: st.n ? fmt(st.avg, unit) : "–", u: unitLabel(unit) },
                { l: "예상 당화혈색소", v: st.n ? st.gmi.toFixed(1) : "–", u: "%" },
                { l: "측정 횟수", v: String(st.n), u: `하루 ${(st.n / days).toFixed(1)}회` },
              ].map((x) => (
                <div key={x.l} className="px-1">
                  <p className="text-[11px] font-medium text-sub">{x.l}</p>
                  <p className="mt-1 text-2xl font-extrabold leading-none text-navy">{x.v}</p>
                  <p className="mt-1 text-[10px] text-mute">{x.u}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-navy">목표 범위 내 비율</p>
              <TirBar pct={st.pct} />
              <div className="mt-3">
                <TirLegend pct={st.pct} />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold text-navy">일별 추이</p>
              <GlucoseChart
                data={daily(rs)}
                xDomain={[from, startOfDay(now)]}
                xTicks={[0, 0.5, 1].map((p) => ({ x: from + p * (days - 1) * DAY, label: md(from + p * (days - 1) * DAY) }))}
                low={lo}
                high={hi}
                dots={false}
                height={150}
              />
            </div>

            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] text-sub">
                  <th className="pb-2 font-semibold">측정 시점</th>
                  <th className="pb-2 text-right font-semibold">횟수</th>
                  <th className="pb-2 text-right font-semibold">평균 ({unitLabel(unit)})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tags.map((t) => (
                  <tr key={t.tag}>
                    <td className="py-2 text-ink">{TAG[t.tag]}</td>
                    <td className="py-2 text-right text-sub">{t.n}</td>
                    <td className="py-2 text-right font-bold text-navy">{t.n ? fmt(t.avg, unit) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-2xl bg-canvas p-3">
                <p className="text-[11px] font-medium text-sub">하루 평균 탄수화물</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy">{Math.round(meals.reduce((a, m) => a + m.carbs, 0) / mealDays)}g</p>
              </div>
              <div className="rounded-2xl bg-canvas p-3">
                <p className="text-[11px] font-medium text-sub">저혈당 · 고혈당</p>
                <p className="mt-0.5 text-lg font-extrabold text-navy">
                  {st.count.low + st.count.vlow}회 · {st.count.high + st.count.vhigh}회
                </p>
              </div>
            </div>

            {s.meds.length > 0 && (
              <p className="text-xs leading-relaxed text-sub">
                <span className="font-bold text-navy">복용 약</span> {s.meds.map((m) => `${m.name} ${m.dose}`).join(", ")}
              </p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 print:hidden">
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3.5 text-sm font-bold text-navy">
            <FilePdf size={20} weight="fill" className="text-brand" /> PDF로 저장
          </button>
          <button onClick={sendNow} className="flex items-center justify-center gap-2 rounded-2xl bg-navy py-3.5 text-sm font-bold text-white">
            <PaperPlaneTilt size={20} weight="fill" /> 지금 보내기
          </button>
        </div>

        {/* 자동 보고 */}
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-brand">
              <EnvelopeSimple size={22} weight="fill" />
            </span>
            <div className="flex-1">
              <h2 className="text-[15px] font-bold text-navy">이메일 자동 보고</h2>
              <p className="text-xs text-sub">
                {cfg.enabled
                  ? cfg.freq === "weekly"
                    ? `매주 ${WEEK[cfg.day % 7]}요일 오전 8시 발송`
                    : `매월 ${Math.max(1, cfg.day)}일 오전 8시 발송`
                  : "꺼져 있습니다"}
              </p>
            </div>
            <Toggle on={cfg.enabled} onChange={(v) => setCfg({ enabled: v })} />
          </div>

          {cfg.enabled && (
            <div className="mt-5 space-y-4">
              <Segmented
                value={cfg.freq}
                onChange={(f) => setCfg({ freq: f, day: 1 })}
                options={[
                  { value: "weekly", label: "매주" },
                  { value: "monthly", label: "매월" },
                ]}
              />
              {cfg.freq === "weekly" ? (
                <div className="flex justify-between">
                  {WEEK.map((w, i) => (
                    <button
                      key={w}
                      onClick={() => setCfg({ day: i })}
                      className={`h-10 w-10 rounded-full text-[13px] font-bold ${
                        cfg.day === i ? "bg-navy text-white" : "bg-canvas text-sub"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex gap-2">
                  {[1, 10, 15, 25].map((d) => (
                    <Chip key={d} active={cfg.day === d} onClick={() => setCfg({ day: d })}>
                      {d}일
                    </Chip>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold text-sub">받는 사람</p>
                <ul className="space-y-2">
                  {cfg.recipients.map((r) => (
                    <li key={r.email} className="flex items-center gap-2 rounded-2xl bg-canvas px-3.5 py-2.5">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-navy">{r.label}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{r.email}</span>
                      <button
                        onClick={() => setCfg({ recipients: cfg.recipients.filter((x) => x.email !== r.email) })}
                        aria-label={`${r.email} 삭제`}
                        className="p-1 text-mute"
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </li>
                  ))}
                  {!cfg.recipients.length && <li className="text-[13px] text-sub">아직 받는 사람이 없습니다.</li>}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["본인", "가족", "주치의"].map((l) => (
                    <Chip key={l} active={label === l} onClick={() => setLabel(l)}>
                      {l}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                    type="email"
                    inputMode="email"
                    placeholder="name@example.com"
                    className={inputCls}
                  />
                  <button onClick={addRecipient} aria-label="받는 사람 추가" className="shrink-0 rounded-2xl bg-navy px-4 text-white">
                    <Plus size={20} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {cfg.history.length > 0 && (
          <Card>
            <CardTitle>발송 내역</CardTitle>
            <ul className="divide-y divide-line">
              {cfg.history.map((h) => (
                <li key={h.ts} className="flex items-center justify-between py-2.5 text-[13px] first:pt-0 last:pb-0">
                  <span className="font-semibold text-ink">
                    {md(h.ts)} {hhmm(h.ts)} · {h.days}일 리포트
                  </span>
                  <span className="text-sub">{h.to.length}명 · 대기</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {toast && (
        <div className="anim-sheet fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-50 w-[calc(100%-40px)] max-w-[390px] -translate-x-1/2 rounded-2xl bg-navy-deep px-4 py-3 text-center text-[13px] font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
