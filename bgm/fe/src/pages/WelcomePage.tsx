import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ChartLineUp, Drop, EnvelopeSimple, ForkKnife } from "@phosphor-icons/react";
import { Frame } from "@/components/Shell";
import { Field, PrimaryButton, Segmented, inputCls } from "@/components/ui";
import { login, register, useSession } from "@/lib/store";

const POINTS = [
  { icon: Drop, title: "혈당 기록" },
  { icon: ForkKnife, title: "식단 관리" },
  { icon: ChartLineUp, title: "통계·리포트" },
  { icon: EnvelopeSimple, title: "자동 보고" },
];

type Mode = "login" | "register";

export function WelcomePage() {
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status !== "anon") return <Navigate to="/" replace />;

  const isReg = mode === "register";
  const idOk = /^[a-z0-9_]{4,20}$/.test(username);
  const valid = isReg
    ? idOk && password.length >= 8 && !!name.trim() && (!email || /^\S+@\S+\.\S+$/.test(email))
    : !!username && !!password;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      if (isReg) await register({ username, password, name: name.trim(), email: email.trim() });
      else await login(username, password);
    } catch (e) {
      setError(e instanceof TypeError ? "서버에 연결하지 못했습니다" : (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Frame>
      <form
        className="flex min-h-dvh flex-col bg-white"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-navy to-navy-deep px-7 pb-8 pt-[calc(env(safe-area-inset-top)+44px)] text-white">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose/25 blur-2xl" />
          <div className="absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-brand/30 blur-3xl" />
          <img src="/icon.svg" alt="" className="relative h-12 w-12 rounded-2xl shadow-lg" />
          <h1 className="relative mt-5 text-[30px] font-extrabold leading-tight tracking-tight">
            매일의 혈당,
            <br />
            한눈에 <span className="text-rose">가볍게</span>
          </h1>
          <ul className="relative mt-5 flex gap-2">
            {POINTS.map(({ icon: I, title }) => (
              <li key={title} className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/10 py-3">
                <I size={20} weight="fill" className="text-rose" />
                <span className="text-[11px] font-semibold text-white/85">{title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6">
          <Segmented<Mode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError("");
            }}
            options={[
              { value: "login", label: "로그인" },
              { value: "register", label: "회원가입" },
            ]}
          />
          <Field label={isReg ? "아이디 (영문 소문자·숫자·밑줄 4~20자)" : "아이디"}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="아이디"
              className={inputCls}
            />
          </Field>
          <Field label={isReg ? "비밀번호 (8자 이상)" : "비밀번호"}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete={isReg ? "new-password" : "current-password"}
              placeholder="비밀번호"
              className={inputCls}
            />
          </Field>
          {isReg && (
            <>
              <Field label="이름">
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="이름" className={inputCls} />
              </Field>
              <Field label="이메일 (선택 · 리포트 수신용)">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className={inputCls}
                />
              </Field>
            </>
          )}
          {error && <p className="rounded-2xl bg-blush px-4 py-3 text-[13px] font-semibold text-brand">{error}</p>}
          <button type="submit" className="hidden" />
          <PrimaryButton onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? "잠시만요…" : isReg ? "가입하고 시작하기" : "로그인"}
          </PrimaryButton>
        </div>
      </form>
    </Frame>
  );
}
