import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";

const PORT = Number(process.env.PORT || 63301);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:63302/bgm";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET is required");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();
const users = db.collection("users");
const readings = db.collection("readings");
const meals = db.collection("meals");
await users.createIndex({ username: 1 }, { unique: true });
await readings.createIndex({ userId: 1, id: 1 }, { unique: true });
await meals.createIndex({ userId: 1, id: 1 }, { unique: true });

/* ───────── 검증 ───────── */

const TAGS = ["fasting", "before", "after", "bedtime", "other"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const SETTINGS_KEYS = ["profile", "meds", "medTaken", "labs", "report", "events", "notify"];
const ARRAY_KEYS = ["meds", "labs", "events"];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg) => new HttpError(400, msg);

const isStr = (v, max) => typeof v === "string" && v.length <= max;
const isNum = (v, min, max) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const isId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(v);
const isTs = (v) => isNum(v, 0, Date.now() + 366 * 86400000);

function parseReading(r) {
  if (!r || !isId(r.id) || !isTs(r.ts) || !isNum(r.value, 20, 600) || !TAGS.includes(r.tag)) throw bad("잘못된 혈당 기록입니다");
  if (r.note !== undefined && !isStr(r.note, 200)) throw bad("메모가 너무 깁니다");
  return { id: r.id, ts: r.ts, value: Math.round(r.value), tag: r.tag, ...(r.note ? { note: r.note } : {}) };
}

function parseMeal(m) {
  if (
    !m || !isId(m.id) || !isTs(m.ts) || !MEAL_TYPES.includes(m.type) ||
    !isStr(m.name, 200) || !m.name.trim() || !isNum(m.carbs, 0, 2000) || !isNum(m.kcal, 0, 20000)
  ) {
    throw bad("잘못된 식사 기록입니다");
  }
  return { id: m.id, ts: m.ts, type: m.type, name: m.name.trim(), carbs: m.carbs, kcal: m.kcal };
}

function defaultSettings(name, email) {
  return {
    profile: {
      name,
      email,
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
    meds: [],
    medTaken: {},
    labs: [],
    events: [],
    notify: { phone: "", sms: false, log: [] },
    report: {
      enabled: false,
      freq: "weekly",
      day: 1,
      recipients: email ? [{ email, label: "본인" }] : [],
      history: [],
    },
  };
}

/* ───────── 앱 ───────── */

const app = express();
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
});

const sign = (user) => jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: "90d" });

function auth(req, _res, next) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  try {
    const { sub } = jwt.verify(m?.[1] ?? "", JWT_SECRET);
    req.userId = new ObjectId(String(sub));
    next();
  } catch {
    next(new HttpError(401, "로그인이 필요합니다"));
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", authLimiter, async (req, res) => {
  const { username, password, name, email = "" } = req.body ?? {};
  if (typeof username !== "string" || !/^[a-z0-9_]{4,20}$/.test(username)) {
    throw bad("아이디는 영문 소문자·숫자·밑줄 4~20자로 입력해 주세요");
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    throw bad("비밀번호는 8~72자로 입력해 주세요");
  }
  if (!isStr(name, 40) || !name.trim()) throw bad("이름을 입력해 주세요");
  if (!isStr(email, 120) || (email && !/^\S+@\S+\.\S+$/.test(email))) throw bad("이메일 주소를 확인해 주세요");

  const doc = {
    username,
    passHash: await bcrypt.hash(password, 11),
    settings: defaultSettings(name.trim(), email.trim()),
    createdAt: new Date(),
  };
  try {
    const { insertedId } = await users.insertOne(doc);
    res.status(201).json({ token: sign({ _id: insertedId }) });
  } catch (e) {
    if (e?.code === 11000) throw new HttpError(409, "이미 사용 중인 아이디입니다");
    throw e;
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  const user = typeof username === "string" ? await users.findOne({ username: username.toLowerCase() }) : null;
  const ok = user && typeof password === "string" && (await bcrypt.compare(password, user.passHash));
  if (!ok) throw new HttpError(401, "아이디 또는 비밀번호가 올바르지 않습니다");
  res.json({ token: sign(user) });
});

const pub = { projection: { _id: 0, userId: 0 } };

app.get("/api/state", auth, async (req, res) => {
  const user = await users.findOne({ _id: req.userId });
  if (!user) throw new HttpError(401, "계정을 찾을 수 없습니다");
  const [rs, ms] = await Promise.all([
    readings.find({ userId: req.userId }, pub).sort({ ts: 1 }).toArray(),
    meals.find({ userId: req.userId }, pub).sort({ ts: 1 }).toArray(),
  ]);
  res.json({ username: user.username, ...user.settings, readings: rs, meals: ms });
});

app.put("/api/settings", auth, async (req, res) => {
  const set = {};
  for (const k of SETTINGS_KEYS) {
    const v = req.body?.[k];
    if (v === undefined) continue;
    const isArr = ARRAY_KEYS.includes(k);
    if (v === null || typeof v !== "object" || Array.isArray(v) !== isArr) throw bad(`잘못된 설정값입니다: ${k}`);
    set[`settings.${k}`] = v;
  }
  if (!Object.keys(set).length) throw bad("변경할 내용이 없습니다");
  await users.updateOne({ _id: req.userId }, { $set: set });
  res.json({ ok: true });
});

function crud(path, col, parse) {
  // 클라이언트가 만든 id 기준 upsert — 재전송해도 중복되지 않는다
  app.post(path, auth, async (req, res) => {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length || items.length > 500) throw bad("한 번에 1~500건까지 보낼 수 있습니다");
    const docs = items.map(parse);
    await col.bulkWrite(
      docs.map((d) => ({
        replaceOne: { filter: { userId: req.userId, id: d.id }, replacement: { userId: req.userId, ...d }, upsert: true },
      }))
    );
    res.json({ ok: true, count: docs.length });
  });
  app.delete(`${path}/:id`, auth, async (req, res) => {
    await col.deleteOne({ userId: req.userId, id: req.params.id });
    res.json({ ok: true });
  });
}
crud("/api/readings", readings, parseReading);
crud("/api/meals", meals, parseMeal);

app.delete("/api/account", auth, async (req, res) => {
  await Promise.all([
    readings.deleteMany({ userId: req.userId }),
    meals.deleteMany({ userId: req.userId }),
    users.deleteOne({ _id: req.userId }),
  ]);
  res.json({ ok: true });
});

app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));

app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "서버 오류가 발생했습니다" : err.message });
});

app.listen(PORT, "127.0.0.1", () => console.log(`bgm-be listening on 127.0.0.1:${PORT}`));
