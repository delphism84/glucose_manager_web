import { useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { BAND, TAG, band, fmt, toLocalInput, toMgdl, unitLabel } from "@/lib/glucose";
import { MEAL, uid, update, useStore, type MealType, type Tag } from "@/lib/store";
import { Chip, Field, PrimaryButton, Segmented, Sheet, inputCls } from "./ui";

type Mode = "glucose" | "meal";

function guessTag(): Tag {
  const h = new Date().getHours();
  if (h < 9) return "fasting";
  if (h >= 22) return "bedtime";
  return "after";
}

function guessMeal(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function AddSheet({ initial = "glucose", onClose }: { initial?: Mode; onClose: () => void }) {
  const { profile } = useStore();
  const { unit, targetLow, targetHigh } = profile;
  const [mode, setMode] = useState<Mode>(initial);
  const [when, setWhen] = useState(toLocalInput(Date.now()));

  const [value, setValue] = useState(unit === "mmol" ? "6.0" : "110");
  const [tag, setTag] = useState<Tag>(guessTag);
  const [note, setNote] = useState("");

  const [mealType, setMealType] = useState<MealType>(guessMeal);
  const [name, setName] = useState("");
  const [carbs, setCarbs] = useState("");
  const [kcal, setKcal] = useState("");

  const ts = new Date(when).getTime() || Date.now();
  const mg = toMgdl(Number(value), unit);
  const valid = Number.isFinite(mg) && mg >= 20 && mg <= 600;
  const b = BAND[band(mg, targetLow, targetHigh)];
  const step = unit === "mmol" ? 0.1 : 1;

  const bump = (dir: number) => {
    const next = Number(value || 0) + dir * step;
    setValue(unit === "mmol" ? next.toFixed(1) : String(Math.max(0, next)));
  };

  const save = () => {
    if (mode === "glucose") {
      update((s) => ({
        ...s,
        readings: [...s.readings, { id: uid(), ts, value: mg, tag, note: note.trim() || undefined }],
      }));
    } else {
      update((s) => ({
        ...s,
        meals: [
          ...s.meals,
          { id: uid(), ts, type: mealType, name: name.trim(), carbs: Number(carbs) || 0, kcal: Number(kcal) || 0 },
        ],
      }));
    }
    onClose();
  };

  return (
    <Sheet title="기록 추가" onClose={onClose}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "glucose", label: "혈당" },
          { value: "meal", label: "식사" },
        ]}
      />

      {mode === "glucose" ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-3xl p-5 text-center transition-colors" style={{ background: valid ? b.soft : "#f6f7fa" }}>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => bump(-1)} aria-label="줄이기" className="rounded-full bg-white p-3 text-navy shadow-card">
                <Minus size={18} weight="bold" />
              </button>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                aria-label="혈당 수치"
                className="w-36 bg-transparent text-center text-[56px] font-extrabold leading-none tracking-tight text-navy outline-none"
              />
              <button onClick={() => bump(1)} aria-label="늘리기" className="rounded-full bg-white p-3 text-navy shadow-card">
                <Plus size={18} weight="bold" />
              </button>
            </div>
            <p className="mt-2 text-[13px] font-semibold" style={{ color: valid ? b.color : "#a3aabb" }}>
              {unitLabel(unit)} · {valid ? b.label : "수치를 확인해 주세요"}
            </p>
          </div>

          <Field label="측정 시점">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TAG) as Tag[]).map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(t)}>
                  {TAG[t]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="측정 시간">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
          </Field>
          <Field label="메모 (선택)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="운동 후, 컨디션 등" className={inputCls} />
          </Field>
          <PrimaryButton onClick={save} disabled={!valid}>
            {valid ? `${fmt(mg, unit)} ${unitLabel(unit)} 저장` : "저장"}
          </PrimaryButton>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <Field label="식사 구분">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MEAL) as MealType[]).map((t) => (
                <Chip key={t} active={mealType === t} onClick={() => setMealType(t)}>
                  {MEAL[t]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="무엇을 드셨나요?">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 현미밥, 된장국, 생선구이" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="탄수화물 (g)">
              <input value={carbs} onChange={(e) => setCarbs(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" className={inputCls} />
            </Field>
            <Field label="열량 (kcal)">
              <input value={kcal} onChange={(e) => setKcal(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="0" className={inputCls} />
            </Field>
          </div>
          <Field label="식사 시간">
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
          </Field>
          <PrimaryButton onClick={save} disabled={!name.trim()}>
            식사 저장
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  );
}
