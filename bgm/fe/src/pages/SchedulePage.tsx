import { useState } from "react";
import { ArrowsClockwise, Bell, CaretLeft, CaretRight, ChatText, MapPin, Plus } from "@phosphor-icons/react";
import { Card, CardTitle, Chip, Field, PageHeader, PrimaryButton, Segmented, Sheet, Toggle, inputCls } from "@/components/ui";
import { DAY, hhmm, startOfDay, toLocalInput } from "@/lib/glucose";
import { CATEGORY, REMIND, REPEAT, dateLabel, dday, occurrences, smsText, type Occurrence } from "@/lib/schedule";
import { uid, update, useStore, type CalEvent, type EventCategory, type Notify, type Repeat } from "@/lib/store";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function setNotify(patch: Partial<Notify>) {
  update((s) => ({ ...s, notify: { ...s.notify, ...patch } }));
}

export function EventRow({ o, onClick, showDate }: { o: Occurrence; onClick?: () => void; showDate?: boolean }) {
  const e = o.event;
  const c = CATEGORY[e.category];
  const past = o.ts < Date.now();
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: c.soft, color: c.color }}>
        <c.icon size={22} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-bold ${past ? "text-mute" : "text-navy"}`}>{e.title}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-sub">
          {showDate && `${dateLabel(o.ts)} `}
          {hhmm(o.ts)}
          {e.place && ` · ${e.place}`}
          {e.repeat !== "none" && <ArrowsClockwise size={12} weight="bold" />}
          {e.remind.length > 0 && e.push && <Bell size={12} weight="fill" />}
          {e.remind.length > 0 && e.sms && <ChatText size={12} weight="fill" />}
        </span>
      </span>
      {showDate && (
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            o.ts - Date.now() < 2 * DAY ? "bg-brand text-white" : "bg-navy-soft text-navy"
          }`}
        >
          {dday(o.ts)}
        </span>
      )}
    </button>
  );
}

export function SchedulePage() {
  const s = useStore();
  const now = Date.now();
  const today = startOfDay(now);
  const [month, setMonth] = useState(() => new Date(new Date(today).getFullYear(), new Date(today).getMonth(), 1));
  const [day, setDay] = useState(today);
  const [editing, setEditing] = useState<CalEvent | "new" | null>(null);
  const [toast, setToast] = useState("");

  const y = month.getFullYear();
  const m = month.getMonth();
  const gridStart = new Date(y, m, 1 - month.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - month.getDay() + i).getTime());
  const weeks = cells[35] && new Date(cells[35]).getMonth() === m ? 6 : 5;
  const inGrid = occurrences(s.events, gridStart.getTime(), cells[41] + DAY);
  const byDay = new Map<number, Occurrence[]>();
  for (const o of inGrid) byDay.set(startOfDay(o.ts), [...(byDay.get(startOfDay(o.ts)) ?? []), o]);

  const dayList = byDay.get(day) ?? occurrences(s.events, day, day + DAY);
  const upcoming = occurrences(s.events, now, now + 60 * DAY).slice(0, 6);
  const nextSms = occurrences(s.events, now, now + 365 * DAY).find((o) => o.event.sms);

  const move = (d: number) => setMonth(new Date(y, m + d, 1));
  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  };

  const testSms = () => {
    if (!/^01\d{8,9}$/.test(s.notify.phone.replace(/\D/g, ""))) return flash("휴대폰 번호를 확인해 주세요");
    const text = nextSms
      ? smsText(nextSms, s.profile.name)
      : `[혈당노트] ${s.profile.name}님, 문자 알림이 설정되었습니다.`;
    setNotify({ log: [{ ts: Date.now(), text }, ...s.notify.log].slice(0, 10) });
    flash("문자 미리보기를 기록했습니다 · 실제 발송은 준비 중입니다");
  };

  return (
    <>
      <PageHeader
        title="일정"
        sub="진료 · 검사 · 건강 관리 예약"
        right={
          <button onClick={() => setEditing("new")} className="flex items-center gap-1 rounded-full bg-navy px-4 py-2.5 text-[13px] font-bold text-white">
            <Plus size={14} weight="bold" /> 일정 추가
          </button>
        }
      />
      <div className="space-y-4 px-5">
        {/* 달력 */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <button onClick={() => move(-1)} aria-label="이전 달" className="rounded-full bg-canvas p-2 text-navy">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              onClick={() => {
                setMonth(new Date(new Date(today).getFullYear(), new Date(today).getMonth(), 1));
                setDay(today);
              }}
              className="text-[17px] font-extrabold text-navy"
            >
              {y}년 {m + 1}월
            </button>
            <button onClick={() => move(1)} aria-label="다음 달" className="rounded-full bg-canvas p-2 text-navy">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {WEEK.map((w, i) => (
              <span key={w} className={`pb-2 text-[11px] font-semibold ${i === 0 ? "text-brand" : "text-mute"}`}>
                {w}
              </span>
            ))}
            {cells.slice(0, weeks * 7).map((t) => {
              const d = new Date(t);
              const other = d.getMonth() !== m;
              const active = t === day;
              const list = byDay.get(t) ?? [];
              return (
                <button key={t} onClick={() => setDay(t)} className="flex flex-col items-center gap-1 py-1">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold ${
                      active
                        ? "bg-navy text-white"
                        : t === today
                          ? "bg-blush text-brand"
                          : other
                            ? "text-line"
                            : d.getDay() === 0
                              ? "text-brand"
                              : "text-ink"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className="flex h-1.5 gap-0.5">
                    {list.slice(0, 3).map((o, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY[o.event.category].color, opacity: other ? 0.35 : 1 }} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 선택한 날 */}
        <Card>
          <CardTitle right={`${dayList.length}건`}>
            {dateLabel(day)}
            {day === today && " · 오늘"}
          </CardTitle>
          {dayList.length ? (
            <ul className="divide-y divide-line">
              {dayList.map((o) => (
                <li key={o.event.id + o.ts}>
                  <EventRow o={o} onClick={() => setEditing(o.event)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-sub">이 날은 일정이 없습니다.</p>
          )}
        </Card>

        {/* 다가오는 일정 */}
        <Card>
          <CardTitle right="앞으로 60일">다가오는 일정</CardTitle>
          {upcoming.length ? (
            <ul className="divide-y divide-line">
              {upcoming.map((o) => (
                <li key={o.event.id + o.ts}>
                  <EventRow o={o} showDate onClick={() => setEditing(o.event)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-sub">예정된 일정이 없습니다. 병원 예약이나 검사 일정을 추가해 보세요.</p>
          )}
        </Card>

        {/* 문자 알림 */}
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blush text-brand">
              <ChatText size={22} weight="fill" />
            </span>
            <div className="flex-1">
              <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-navy">
                문자 알림 <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[10px] font-bold text-sub">준비 중</span>
              </h2>
              <p className="text-xs text-sub">일정 전에 문자로 미리 알려드립니다</p>
            </div>
            <Toggle on={s.notify.sms} onChange={(v) => setNotify({ sms: v })} />
          </div>
          {s.notify.sms && (
            <div className="mt-4 space-y-3">
              <Field label="받을 휴대폰 번호">
                <input
                  value={s.notify.phone}
                  onChange={(e) => setNotify({ phone: e.target.value.replace(/[^0-9-]/g, "").slice(0, 13) })}
                  inputMode="tel"
                  placeholder="010-0000-0000"
                  className={inputCls}
                />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-sub">문자 미리보기</p>
                <div className="rounded-3xl bg-canvas p-4">
                  <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink shadow-card">
                    {nextSms
                      ? smsText(nextSms, s.profile.name)
                      : "문자 알림을 켠 일정이 생기면 이곳에 미리보기가 표시됩니다."}
                  </p>
                </div>
              </div>
              <button onClick={testSms} className="w-full rounded-2xl border border-line bg-white py-3 text-sm font-bold text-navy">
                테스트 문자 보내기
              </button>
              {s.notify.log.length > 0 && (
                <ul className="space-y-1.5">
                  {s.notify.log.slice(0, 3).map((l) => (
                    <li key={l.ts} className="flex gap-2 text-[11px] text-sub">
                      <span className="shrink-0 font-semibold">
                        {dateLabel(l.ts)} {hhmm(l.ts)}
                      </span>
                      <span className="truncate">{l.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      {editing && <EventSheet event={editing === "new" ? null : editing} day={day} onClose={() => setEditing(null)} />}

      {toast && (
        <div className="anim-sheet fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-50 w-[calc(100%-40px)] max-w-[390px] -translate-x-1/2 rounded-2xl bg-navy-deep px-4 py-3 text-center text-[13px] font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}

function EventSheet({ event, day, onClose }: { event: CalEvent | null; day: number; onClose: () => void }) {
  const [f, setF] = useState<CalEvent>(
    () =>
      event ?? {
        id: uid(),
        title: "",
        category: "hospital",
        // 선택한 날의 오전 10시를 기본값으로
        ts: day + 10 * 3600000,
        place: "",
        memo: "",
        repeat: "none",
        remind: [1440, 60],
        push: true,
        sms: false,
      }
  );
  const set = <K extends keyof CalEvent>(k: K, v: CalEvent[K]) => setF((x) => ({ ...x, [k]: v }));
  const title = f.title.trim() || CATEGORY[f.category].preset;

  const save = () => {
    const next = { ...f, title, place: f.place.trim(), memo: f.memo.trim() };
    update((s) => ({ ...s, events: event ? s.events.map((e) => (e.id === f.id ? next : e)) : [...s.events, next] }));
    onClose();
  };
  const remove = () => {
    if (!window.confirm(f.repeat === "none" ? "이 일정을 삭제할까요?" : "반복 일정 전체를 삭제할까요?")) return;
    update((s) => ({ ...s, events: s.events.filter((e) => e.id !== f.id) }));
    onClose();
  };

  return (
    <Sheet title={event ? "일정 수정" : "일정 추가"} onClose={onClose}>
      <div className="space-y-5">
        <Field label="종류">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CATEGORY) as EventCategory[]).map((k) => {
              const c = CATEGORY[k];
              const on = f.category === k;
              return (
                <button
                  key={k}
                  onClick={() => set("category", k)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-bold transition ${
                    on ? "border-navy bg-navy text-white" : "border-line bg-white text-sub"
                  }`}
                >
                  <c.icon size={22} weight="fill" style={{ color: on ? "#fff" : c.color }} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="제목">
          <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder={CATEGORY[f.category].preset || "일정 제목"} maxLength={60} className={inputCls} />
        </Field>
        <Field label="날짜와 시간">
          <input
            type="datetime-local"
            value={toLocalInput(f.ts)}
            onChange={(e) => set("ts", new Date(e.target.value).getTime() || f.ts)}
            className={inputCls}
          />
        </Field>
        <Field label="장소 (선택)">
          <div className="relative">
            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
            <input value={f.place} onChange={(e) => set("place", e.target.value)} placeholder="병원·진료과, 주소 등" maxLength={80} className={`${inputCls} pl-11`} />
          </div>
        </Field>
        <Field label="반복">
          <Segmented<Repeat>
            value={f.repeat}
            onChange={(v) => set("repeat", v)}
            options={(Object.keys(REPEAT) as Repeat[]).map((r) => ({ value: r, label: r === "none" ? "없음" : REPEAT[r] }))}
          />
        </Field>
        <Field label="미리 알림">
          <div className="flex flex-wrap gap-2">
            {REMIND.map((r) => {
              const on = f.remind.includes(r.min);
              return (
                <Chip key={r.min} active={on} onClick={() => set("remind", on ? f.remind.filter((x) => x !== r.min) : [...f.remind, r.min])}>
                  {r.label}
                </Chip>
              );
            })}
          </div>
        </Field>
        {f.remind.length > 0 && (
          <div className="space-y-3 rounded-2xl bg-canvas p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Bell size={16} weight="fill" className="text-navy" /> 앱 알림
              </span>
              <Toggle on={f.push} onChange={(v) => set("push", v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <ChatText size={16} weight="fill" className="text-brand" /> 문자 알림
              </span>
              <Toggle on={f.sms} onChange={(v) => set("sms", v)} />
            </div>
          </div>
        )}
        <Field label="메모 (선택)">
          <textarea
            value={f.memo}
            onChange={(e) => set("memo", e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="준비물, 금식 여부, 의사에게 물어볼 것 등"
            className={`${inputCls} resize-none`}
          />
        </Field>
        <PrimaryButton onClick={save} disabled={!title}>
          저장
        </PrimaryButton>
        {event && (
          <button onClick={remove} className="w-full py-1 text-[13px] font-semibold text-brand">
            일정 삭제
          </button>
        )}
      </div>
    </Sheet>
  );
}
