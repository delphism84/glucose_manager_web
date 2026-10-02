import { useSyncExternalStore } from "react";

export type Unit = "mgdl" | "mmol";
export type Tag = "fasting" | "before" | "after" | "bedtime" | "other";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Reading {
  id: string;
  ts: number;
  /** 항상 mg/dL 로 저장 */
  value: number;
  tag: Tag;
  note?: string;
}

export interface Meal {
  id: string;
  ts: number;
  type: MealType;
  name: string;
  carbs: number;
  kcal: number;
}

export interface Med {
  id: string;
  name: string;
  dose: string;
  times: string[];
}

export interface Lab {
  id: string;
  date: string;
  a1c: number;
}

export interface Profile {
  name: string;
  email: string;
  birthYear: number;
  diabetesType: string;
  dxYear: number;
  heightCm: number;
  weightKg: number;
  hospital: string;
  targetLow: number;
  targetHigh: number;
  unit: Unit;
  reminders: boolean;
}

export interface Recipient {
  email: string;
  label: string;
}

export interface ReportCfg {
  enabled: boolean;
  freq: "weekly" | "monthly";
  /** weekly: 0(일)~6(토), monthly: 1~28 */
  day: number;
  recipients: Recipient[];
  history: { ts: number; days: number; to: string[]; auto: boolean }[];
}

export type EventCategory = "hospital" | "test" | "med" | "measure" | "exercise" | "other";
export type Repeat = "none" | "daily" | "weekly" | "monthly";

export interface CalEvent {
  id: string;
  title: string;
  category: EventCategory;
  ts: number;
  place: string;
  memo: string;
  repeat: Repeat;
  /** 시작 몇 분 전에 알릴지 (0 = 정시) */
  remind: number[];
  push: boolean;
  sms: boolean;
}

export interface Notify {
  phone: string;
  sms: boolean;
  log: { ts: number; text: string }[];
}

export interface State {
  profile: Profile;
  readings: Reading[];
  meals: Meal[];
  meds: Med[];
  /** "YYYY-MM-DD" → 복용 완료한 "medId@time" 목록 */
  medTaken: Record<string, string[]>;
  labs: Lab[];
  events: CalEvent[];
  notify: Notify;
  report: ReportCfg;
}

export const MEAL: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ───────── 서버 동기화 ─────────
 * 화면은 로컬 상태를 즉시 바꾸고, 바뀐 부분만 작업 큐에 담아 서버로 보낸다.
 * 큐는 localStorage 에 남으므로 오프라인이거나 앱을 닫아도 다음 실행 때 이어서 전송된다.
 */

const TOKEN_KEY = "bgm_token";
const CACHE_KEY = "bgm_cache_v1";
const QUEUE_KEY = "bgm_queue_v1";

interface Op {
  method: "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
}

export interface Session {
  status: "anon" | "loading" | "ready";
  username: string;
  state: State;
  /** 서버로 아직 보내지 못한 변경 수 */
  pending: number;
}

const EMPTY: State = {
  profile: {
    name: "",
    email: "",
    birthYear: 0,
    diabetesType: "제2형 당뇨",
    dxYear: 0,
    heightCm: 0,
    weightKg: 0,
    hospital: "",
    targetLow: 70,
    targetHigh: 180,
    unit: "mgdl",
    reminders: true,
  },
  readings: [],
  meals: [],
  meds: [],
  medTaken: {},
  labs: [],
  events: [],
  notify: { phone: "", sms: false, log: [] },
  report: { enabled: false, freq: "weekly", day: 1, recipients: [], history: [] },
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* 손상된 저장값은 버린다 */
  }
  return fallback;
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장소를 쓸 수 없어도 화면은 동작 */
  }
}

let token: string | null = localStorage.getItem(TOKEN_KEY);
let queue: Op[] = read<Op[]>(QUEUE_KEY, []);
const cached = token ? read<{ username: string; state: State } | null>(CACHE_KEY, null) : null;

let session: Session = {
  status: !token ? "anon" : cached ? "ready" : "loading",
  username: cached?.username ?? "",
  state: { ...EMPTY, ...cached?.state },
  pending: queue.length,
};

const subs = new Set<() => void>();

function subscribe(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

function set(patch: Partial<Session>): void {
  session = { ...session, ...patch };
  if (session.status === "ready") write(CACHE_KEY, { username: session.username, state: session.state });
  subs.forEach((f) => f());
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, () => session);
}

export function useStore(): State {
  return useSession().state;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error || `요청에 실패했습니다 (${res.status})`);
  return data as T;
}

const SETTINGS = ["profile", "meds", "medTaken", "labs", "report", "events", "notify"] as const;

function diff(prev: State, next: State): Op[] {
  const ops: Op[] = [];
  for (const key of ["readings", "meals"] as const) {
    if (prev[key] === next[key]) continue;
    const before = new Set(prev[key].map((x) => x.id));
    const after = new Set(next[key].map((x) => x.id));
    const added = next[key].filter((x) => !before.has(x.id));
    if (added.length) ops.push({ method: "POST", path: `/api/${key}`, body: added });
    for (const x of prev[key]) if (!after.has(x.id)) ops.push({ method: "DELETE", path: `/api/${key}/${x.id}` });
  }
  const changed = SETTINGS.filter((k) => prev[k] !== next[k]);
  if (changed.length) ops.push({ method: "PUT", path: "/api/settings", body: Object.fromEntries(changed.map((k) => [k, next[k]])) });
  return ops;
}

let flushing: Promise<void> | null = null;
let retry = 0;

function flush(): Promise<void> {
  flushing ??= (async () => {
    while (queue.length && token) {
      const op = queue[0];
      try {
        await api(op.method, op.path, op.body);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return logout();
        // 서버가 거부한 요청(4xx)은 다시 보내도 같으므로 버리고, 그 외에는 나중에 재시도
        if (!(e instanceof ApiError) || e.status >= 500 || e.status === 429) {
          window.clearTimeout(retry);
          retry = window.setTimeout(flush, 15000);
          return;
        }
      }
      queue = queue.slice(1);
      write(QUEUE_KEY, queue);
      set({ pending: queue.length });
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function update(fn: (s: State) => State): void {
  const prev = session.state;
  const next = fn(prev);
  queue = [...queue, ...diff(prev, next)];
  write(QUEUE_KEY, queue);
  set({ state: next, pending: queue.length });
  void flush();
}

/** 밀린 변경을 먼저 보낸 뒤 서버 상태를 받아온다 */
export async function boot(): Promise<void> {
  if (!token) return;
  await flush();
  if (queue.length || !token) return;
  try {
    const { username, ...state } = await api<State & { username: string }>("GET", "/api/state");
    // 받아오는 사이 새 변경이 생겼다면 로컬 상태가 더 최신이다
    // 예전에 만든 계정에는 없는 항목이 있을 수 있어 기본값과 합친다
    if (!queue.length) set({ status: "ready", username, state: { ...EMPTY, ...state } });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) logout();
    else if (session.status === "loading") throw e;
  }
}

async function enter(path: string, body: unknown): Promise<void> {
  const res = await api<{ token: string }>("POST", path, body);
  token = res.token;
  localStorage.setItem(TOKEN_KEY, token);
  queue = [];
  write(QUEUE_KEY, queue);
  set({ status: "loading", state: EMPTY, username: "", pending: 0 });
  await boot();
}

export function login(username: string, password: string): Promise<void> {
  return enter("/api/auth/login", { username, password });
}

export function register(body: { username: string; password: string; name: string; email: string }): Promise<void> {
  return enter("/api/auth/register", body);
}

export function logout(): void {
  token = null;
  queue = [];
  for (const k of [TOKEN_KEY, CACHE_KEY, QUEUE_KEY]) localStorage.removeItem(k);
  set({ status: "anon", state: EMPTY, username: "", pending: 0 });
}

export async function deleteAccount(): Promise<void> {
  await api("DELETE", "/api/account");
  logout();
}

window.addEventListener("online", () => void flush());
