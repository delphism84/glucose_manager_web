import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet } from "react-router-dom";
import { CalendarBlank, ChartLineUp, FileText, House, NotePencil, Plus, UserCircle, type Icon } from "@phosphor-icons/react";
import { boot, useSession } from "@/lib/store";
import { AddSheet } from "./AddSheet";

const TABS: { to: string; label: string; icon: Icon }[] = [
  { to: "/", label: "홈", icon: House },
  { to: "/log", label: "기록", icon: NotePencil },
  { to: "/schedule", label: "일정", icon: CalendarBlank },
  { to: "/stats", label: "통계", icon: ChartLineUp },
  { to: "/report", label: "리포트", icon: FileText },
  { to: "/me", label: "내 건강", icon: UserCircle },
];

/** 세로형 앱 프레임 — 데스크톱에서는 430px 폭으로 가운데 고정 */
export function Frame({ children }: { children: React.ReactNode }) {
  return <div className="relative mx-auto min-h-full max-w-[430px] bg-canvas shadow-2xl">{children}</div>;
}

export function Shell() {
  const { status } = useSession();
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    boot().catch(() => setFailed(true));
  };
  useEffect(load, []);

  if (status === "anon") return <Navigate to="/welcome" replace />;
  if (status === "loading") {
    return (
      <Frame>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-sm text-sub">
          {failed ? (
            <>
              <p>서버에 연결하지 못했습니다.</p>
              <button onClick={load} className="rounded-full bg-navy px-5 py-2.5 font-bold text-white">
                다시 시도
              </button>
            </>
          ) : (
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-brand" />
          )}
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <main className="pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Outlet />
      </main>

      <button
        onClick={() => setAdding(true)}
        aria-label="기록 추가"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] left-1/2 z-40 flex h-14 w-14 translate-x-[135px] items-center justify-center rounded-full bg-brand text-white shadow-fab transition active:scale-95 max-[430px]:left-auto max-[430px]:right-5 max-[430px]:translate-x-0 print:hidden"
      >
        <Plus size={26} weight="bold" />
      </button>

      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
        {TABS.map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} end={to === "/"} className="flex flex-1 flex-col items-center gap-1 py-2.5">
            {({ isActive }) => (
              <>
                <I size={24} weight={isActive ? "fill" : "regular"} className={isActive ? "text-brand" : "text-mute"} />
                <span className={`text-[11px] font-semibold ${isActive ? "text-navy" : "text-mute"}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {adding && <AddSheet onClose={() => setAdding(false)} />}
    </Frame>
  );
}
