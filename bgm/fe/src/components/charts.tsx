import { BAND, BANDS, band, type Band } from "@/lib/glucose";

const W = 340;

export interface Pt {
  x: number;
  y: number;
  lo?: number;
  hi?: number;
}

/** 목표 범위 띠 위에 혈당 추이를 그리는 선 그래프 */
export function GlucoseChart({
  data,
  xDomain,
  xTicks,
  low,
  high,
  height = 170,
  dots = true,
}: {
  data: Pt[];
  xDomain: [number, number];
  xTicks: { x: number; label: string }[];
  low: number;
  high: number;
  height?: number;
  dots?: boolean;
}) {
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 22;
  const ys = data.flatMap((d) => [d.y, d.lo ?? d.y, d.hi ?? d.y]);
  const yMin = Math.min(50, ...ys) - 5;
  const yMax = Math.max(high + 15, ...ys) + 8;
  const sx = (x: number) => padL + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * (height - padT - padB);

  const line = data
    .map((d, i) => {
      const x = sx(d.x);
      const y = sy(d.y);
      if (i === 0) return `M${x},${y}`;
      const px = sx(data[i - 1].x);
      const py = sy(data[i - 1].y);
      const mx = (px + x) / 2;
      return `C${mx},${py} ${mx},${y} ${x},${y}`;
    })
    .join(" ");
  const hasRange = data.some((d) => d.lo !== undefined);
  const range = hasRange
    ? `M${data.map((d) => `${sx(d.x)},${sy(d.hi ?? d.y)}`).join(" L")} L${[...data]
        .reverse()
        .map((d) => `${sx(d.x)},${sy(d.lo ?? d.y)}`)
        .join(" L")} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="혈당 추이 그래프">
      <rect
        x={padL}
        y={sy(high)}
        width={W - padL - padR}
        height={sy(low) - sy(high)}
        rx={6}
        fill={BAND.in.soft}
      />
      {[low, high].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={sy(v)} y2={sy(v)} stroke={BAND.in.color} strokeOpacity={0.35} strokeDasharray="3 4" />
          <text x={padL - 6} y={sy(v) + 3.5} textAnchor="end" fontSize={10} fill="#a3aabb">
            {v}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t.x} x={sx(t.x)} y={height - 5} textAnchor="middle" fontSize={10} fill="#a3aabb">
          {t.label}
        </text>
      ))}
      {hasRange && <path d={range} fill="#16264c" fillOpacity={0.07} />}
      {data.length > 1 && <path d={line} fill="none" stroke="#16264c" strokeWidth={2.2} strokeLinecap="round" />}
      {dots &&
        data.map((d, i) => (
          <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={4} fill={BAND[band(d.y, low, high)].color} stroke="#fff" strokeWidth={2} />
        ))}
      {!data.length && (
        <text x={W / 2} y={height / 2} textAnchor="middle" fontSize={12} fill="#a3aabb">
          기록이 없습니다
        </text>
      )}
    </svg>
  );
}

/** 목표 범위 내 비율(TIR) 가로 누적 막대 */
export function TirBar({ pct }: { pct: Record<Band, number> }) {
  return (
    <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full">
      {BANDS.filter((b) => pct[b] > 0).map((b) => (
        <div key={b} style={{ width: `${pct[b]}%`, background: BAND[b].color }} />
      ))}
    </div>
  );
}

export function TirLegend({ pct }: { pct: Record<Band, number> }) {
  return (
    <ul className="space-y-1.5">
      {[...BANDS].reverse().map((b) => (
        <li key={b} className="flex items-center gap-2 text-[13px]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BAND[b].color }} />
          <span className="flex-1 text-sub">{BAND[b].label}</span>
          <span className="font-bold text-ink">{Math.round(pct[b])}%</span>
        </li>
      ))}
    </ul>
  );
}

export function Ring({ value, size = 112, label }: { value: number; size?: number; label: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 112 112" className="-rotate-90">
        <circle cx={56} cy={56} r={r} fill="none" stroke="#eef1f8" strokeWidth={11} />
        <circle
          cx={56}
          cy={56}
          r={r}
          fill="none"
          stroke={BAND.in.color}
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-extrabold leading-none text-navy">
          {Math.round(value)}
          <span className="text-sm">%</span>
        </span>
        <span className="mt-1 text-[11px] font-medium text-sub">{label}</span>
      </div>
    </div>
  );
}

export function Bars({
  items,
  low,
  high,
  format,
}: {
  items: { label: string; value: number }[];
  low: number;
  high: number;
  format: (v: number) => string;
}) {
  const max = Math.max(200, ...items.map((i) => i.value));
  return (
    <div className="flex h-36 items-end gap-3">
      {items.map((i) => (
        <div key={i.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[13px] font-bold text-ink">{i.value ? format(i.value) : "–"}</span>
          <div
            className="w-full max-w-10 rounded-t-xl rounded-b-md"
            style={{
              height: `${(i.value / max) * 84}px`,
              background: i.value ? BAND[band(i.value, low, high)].color : "#eceef3",
              minHeight: 4,
            }}
          />
          <span className="text-[11px] font-medium text-sub">{i.label}</span>
        </div>
      ))}
    </div>
  );
}
