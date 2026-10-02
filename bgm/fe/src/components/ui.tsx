import { X } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-white p-5 shadow-card ${className}`}>{children}</section>;
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[15px] font-bold text-navy">{children}</h2>
      {right && <div className="text-xs font-medium text-sub">{right}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
      <div>
        {sub && <p className="mb-0.5 text-xs font-medium text-sub">{sub}</p>}
        <h1 className="text-[24px] font-extrabold tracking-tight text-navy">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-navy-soft p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition ${
            o.value === value ? "bg-white text-navy shadow-sm" : "text-sub"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
        active ? "border-navy bg-navy text-white" : "border-line bg-white text-sub"
      }`}
    >
      {children}
    </button>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-sub">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-[15px] font-medium text-ink outline-none focus:border-navy focus:bg-white";

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-brand py-4 text-[16px] font-bold text-white shadow-fab transition active:bg-brand-dark disabled:bg-mute disabled:shadow-none"
    >
      {children}
    </button>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col justify-end">
      <div className="anim-fade absolute inset-0 bg-navy-deep/45" onClick={onClose} />
      <div className="anim-sheet relative max-h-[92%] overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-navy">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="rounded-full bg-canvas p-2 text-sub">
            <X size={18} weight="bold" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
