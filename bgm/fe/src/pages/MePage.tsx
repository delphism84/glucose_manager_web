import { useState } from "react";
import { FirstAid, Pill, Plus, Target, Trash } from "@phosphor-icons/react";
import { Card, CardTitle, Field, PageHeader, PrimaryButton, Segmented, Sheet, Toggle, inputCls } from "@/components/ui";
import { fmt, unitLabel } from "@/lib/glucose";
import { dayKey, deleteAccount, logout, uid, update, useSession, type Profile, type Unit } from "@/lib/store";

const GUIDES = [
  {
    title: "저혈당이 왔을 때 (70 mg/dL 미만)",
    body: "주스 반 컵이나 사탕 3~4개처럼 빨리 흡수되는 당질 15g을 먹고 15분 뒤 다시 측정합니다. 여전히 낮으면 한 번 더 반복하고, 의식이 흐려지면 즉시 119에 연락하세요.",
  },
  {
    title: "식후 혈당은 언제 재나요?",
    body: "식사를 시작한 시각부터 2시간 뒤에 측정하는 것이 일반적입니다. 같은 기준으로 꾸준히 재야 식단별 차이를 비교할 수 있습니다.",
  },
  {
    title: "목표 범위 내 비율이란?",
    body: "측정값이 목표 범위(보통 70~180 mg/dL) 안에 든 비율입니다. 일반적으로 70% 이상을 권장하지만 개인 목표는 주치의와 상의해 정하세요.",
  },
];

function setProfile(patch: Partial<Profile>) {
  update((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
}

type Editing = null | "profile" | "med" | "lab";

export function MePage() {
  const { state: s, username, pending } = useSession();
  const p = s.profile;
  const [editing, setEditing] = useState<Editing>(null);
  const [open, setOpen] = useState<number | null>(0);

  const bmi = p.heightCm && p.weightKg ? p.weightKg / (p.heightCm / 100) ** 2 : 0;
  const labs = [...s.labs].sort((a, b) => a.date.localeCompare(b.date));
  const lastLab = labs[labs.length - 1];

  return (
    <>
      <PageHeader title="내 건강" sub="프로필 · 의료 정보 · 설정" />
      <div className="space-y-4 px-5">
        {/* 프로필 */}
        <Card>
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose to-brand text-xl font-extrabold text-white">
              {p.name.slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold text-navy">{p.name}</p>
              <p className="truncate text-xs text-sub">
                @{username} · {p.diabetesType}
                {p.dxYear > 0 && ` · ${p.dxYear}년 진단`}
              </p>
            </div>
            <button onClick={() => setEditing("profile")} className="rounded-full bg-navy-soft px-3.5 py-2 text-xs font-bold text-navy">
              수정
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas py-3 text-center">
            {[
              { l: "키", v: p.heightCm ? `${p.heightCm}cm` : "–" },
              { l: "몸무게", v: p.weightKg ? `${p.weightKg}kg` : "–" },
              { l: "BMI", v: bmi ? bmi.toFixed(1) : "–" },
            ].map((x) => (
              <div key={x.l}>
                <p className="text-[11px] font-medium text-sub">{x.l}</p>
                <p className="text-[15px] font-extrabold text-navy">{x.v}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 당화혈색소 */}
        <Card>
          <CardTitle
            right={
              <button onClick={() => setEditing("lab")} className="flex items-center gap-0.5 font-bold text-brand">
                <Plus size={12} weight="bold" /> 검사 결과
              </button>
            }
          >
            당화혈색소 (HbA1c)
          </CardTitle>
          {lastLab ? (
            <>
              <p className="text-[28px] font-extrabold leading-none text-navy">
                {lastLab.a1c.toFixed(1)}
                <span className="ml-1 text-sm font-semibold text-mute">%</span>
                <span className="ml-2 text-xs font-medium text-sub">{lastLab.date} 검사</span>
              </p>
              <ul className="mt-4 flex gap-2">
                {labs.slice(-4).map((l) => (
                  <li key={l.id} className="flex-1 rounded-2xl bg-canvas py-2.5 text-center">
                    <p className="text-[15px] font-extrabold text-navy">{l.a1c.toFixed(1)}</p>
                    <p className="text-[10px] text-sub">{l.date.slice(2, 7).replace("-", ".")}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-sub">병원 검사 결과를 기록해 두면 추이를 볼 수 있습니다.</p>
          )}
        </Card>

        {/* 복용 약 */}
        <Card>
          <CardTitle
            right={
              <button onClick={() => setEditing("med")} className="flex items-center gap-0.5 font-bold text-brand">
                <Plus size={12} weight="bold" /> 약 추가
              </button>
            }
          >
            복용 약
          </CardTitle>
          <ul className="space-y-2">
            {s.meds.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand">
                  <Pill size={20} weight="fill" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy">
                    {m.name} {m.dose}
                  </p>
                  <p className="text-xs text-sub">{m.times.join(" · ")}</p>
                </div>
                <button
                  onClick={() => update((st) => ({ ...st, meds: st.meds.filter((x) => x.id !== m.id) }))}
                  aria-label={`${m.name} 삭제`}
                  className="p-2 text-mute"
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
            {!s.meds.length && <li className="text-sm text-sub">등록된 약이 없습니다.</li>}
          </ul>
        </Card>

        {/* 목표·설정 */}
        <Card>
          <CardTitle right={<Target size={16} className="text-brand" weight="fill" />}>목표와 설정</CardTitle>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-ink">목표 혈당 범위</span>
                <span className="font-extrabold text-navy">
                  {fmt(p.targetLow, p.unit)} – {fmt(p.targetHigh, p.unit)} {unitLabel(p.unit)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`하한 ${p.targetLow}`}>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={5}
                    value={p.targetLow}
                    onChange={(e) => setProfile({ targetLow: Number(e.target.value) })}
                    className="w-full accent-brand"
                  />
                </Field>
                <Field label={`상한 ${p.targetHigh}`}>
                  <input
                    type="range"
                    min={140}
                    max={200}
                    step={5}
                    value={p.targetHigh}
                    onChange={(e) => setProfile({ targetHigh: Number(e.target.value) })}
                    className="w-full accent-brand"
                  />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-semibold text-ink">혈당 단위</span>
              <div className="w-48">
                <Segmented<Unit>
                  value={p.unit}
                  onChange={(u) => setProfile({ unit: u })}
                  options={[
                    { value: "mgdl", label: "mg/dL" },
                    { value: "mmol", label: "mmol/L" },
                  ]}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-ink">측정·복약 알림</p>
                <p className="text-xs text-sub">앱 설치 후 푸시 알림으로 제공됩니다</p>
              </div>
              <Toggle on={p.reminders} onChange={(v) => setProfile({ reminders: v })} />
            </div>
          </div>
        </Card>

        {/* 건강 가이드 */}
        <Card>
          <CardTitle right={<FirstAid size={16} className="text-brand" weight="fill" />}>건강 가이드</CardTitle>
          <ul className="divide-y divide-line">
            {GUIDES.map((g, i) => (
              <li key={g.title}>
                <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between py-3 text-left">
                  <span className="text-sm font-bold text-navy">{g.title}</span>
                  <span className="text-lg font-light text-mute">{open === i ? "−" : "+"}</span>
                </button>
                {open === i && <p className="pb-3 text-[13px] leading-relaxed text-sub">{g.body}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-mute">
            이 앱의 정보는 자가 관리를 돕기 위한 참고 자료이며 의사의 진단과 처방을 대신하지 않습니다.
          </p>
        </Card>

        <div className="flex items-center justify-center gap-4 py-3 text-xs font-semibold text-mute">
          <button onClick={() => window.confirm("로그아웃할까요?") && logout()} className="underline">
            로그아웃
          </button>
          <button
            onClick={() =>
              window.confirm("계정과 모든 기록이 영구 삭제됩니다. 계속할까요?") &&
              deleteAccount().catch((e: Error) => window.alert(e.message))
            }
            className="underline"
          >
            회원 탈퇴
          </button>
        </div>
        {pending > 0 && <p className="pb-2 text-center text-[11px] text-mute">서버에 저장 대기 중인 변경 {pending}건</p>}
      </div>

      {editing === "profile" && <ProfileSheet p={p} onClose={() => setEditing(null)} />}
      {editing === "med" && <MedSheet onClose={() => setEditing(null)} />}
      {editing === "lab" && <LabSheet onClose={() => setEditing(null)} />}
    </>
  );
}

function ProfileSheet({ p, onClose }: { p: Profile; onClose: () => void }) {
  const [f, setF] = useState(p);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Sheet title="프로필 수정" onClose={onClose}>
      <div className="space-y-4">
        <Field label="이름">
          <input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
        </Field>
        <Field label="이메일">
          <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" className={inputCls} />
        </Field>
        <Field label="당뇨 유형">
          <select value={f.diabetesType} onChange={(e) => set("diabetesType", e.target.value)} className={inputCls}>
            {["제1형 당뇨", "제2형 당뇨", "임신성 당뇨", "당뇨 전단계", "해당 없음"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="진단 연도">
            <input value={f.dxYear || ""} onChange={(e) => set("dxYear", Number(e.target.value) || 0)} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="키 (cm)">
            <input value={f.heightCm || ""} onChange={(e) => set("heightCm", Number(e.target.value) || 0)} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="몸무게 (kg)">
            <input value={f.weightKg || ""} onChange={(e) => set("weightKg", Number(e.target.value) || 0)} inputMode="numeric" className={inputCls} />
          </Field>
        </div>
        <Field label="다니는 병원 (선택)">
          <input value={f.hospital} onChange={(e) => set("hospital", e.target.value)} className={inputCls} />
        </Field>
        <PrimaryButton
          disabled={!f.name.trim()}
          onClick={() => {
            setProfile(f);
            onClose();
          }}
        >
          저장
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function MedSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const slots = ["08:00", "13:00", "19:00", "22:00"];
  return (
    <Sheet title="약 추가" onClose={onClose}>
      <div className="space-y-4">
        <Field label="약 이름">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 메트포르민" className={inputCls} />
        </Field>
        <Field label="용량">
          <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="예: 500mg" className={inputCls} />
        </Field>
        <Field label="복용 시간">
          <div className="flex gap-2">
            {slots.map((t) => {
              const on = times.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => setTimes(on ? times.filter((x) => x !== t) : [...times, t].sort())}
                  className={`flex-1 rounded-2xl border py-2.5 text-[13px] font-bold ${
                    on ? "border-navy bg-navy text-white" : "border-line bg-white text-sub"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>
        <PrimaryButton
          disabled={!name.trim() || !times.length}
          onClick={() => {
            update((s) => ({ ...s, meds: [...s.meds, { id: uid(), name: name.trim(), dose: dose.trim(), times }] }));
            onClose();
          }}
        >
          저장
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function LabSheet({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(dayKey(Date.now()));
  const [a1c, setA1c] = useState("");
  const v = Number(a1c);
  return (
    <Sheet title="당화혈색소 검사 결과" onClose={onClose}>
      <div className="space-y-4">
        <Field label="검사일">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="HbA1c (%)">
          <input value={a1c} onChange={(e) => setA1c(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="예: 6.8" className={inputCls} />
        </Field>
        <PrimaryButton
          disabled={!(v >= 3 && v <= 20) || !date}
          onClick={() => {
            update((s) => ({ ...s, labs: [...s.labs, { id: uid(), date, a1c: v }] }));
            onClose();
          }}
        >
          저장
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
