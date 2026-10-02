# 혈당노트(BGM) 인수인계 · 서버 이전 가이드

작성일: 2026-10-02 · 운영 주소: https://bgm.lunarsystem.co.kr

소비자가 직접 설치해 자신의 혈당·식단·복약·검사·일정을 관리하는 세로형 하이브리드 웹앱이다.
같은 저장소의 `gms/` (임상용 다환자 시스템, gms.lunarsystem.co.kr)와는 **완전히 별개**이며 코드·DB·포트를 공유하지 않는다.

---

## 1. 현재 상태 요약

| 영역 | 상태 |
|---|---|
| 화면 | 홈, 기록, 일정, 통계, 리포트, 내 건강 + 로그인/회원가입 — 완료 |
| 회원 | 아이디 + 비밀번호 가입, 이메일 선택, JWT(90일) — 완료 |
| 데이터 저장 | 혈당·식사·약·복약 체크·HbA1c·일정·설정 모두 서버(MongoDB) 저장 — 완료 |
| 오프라인 | 변경분을 localStorage 큐에 쌓았다가 접속 시 전송 — 완료 |
| 리포트 | 화면 미리보기 + PDF 저장(브라우저 인쇄) — 완료 / **메일 발송 미구현** |
| 일정 알림 | 미리 알림·문자 알림 설정과 문자 미리보기 — **목업** (실제 발송 없음) |
| 하이브리드 앱 | `fe/capacitor.config.json` 만 있음 — **패키징 미착수** |
| 비밀번호 찾기 | 없음 (이메일이 선택이라 방식 결정 필요) |

이전 시점 DB 데이터: 사용자 1명(`demo`, 테스트 목적으로 보임), 혈당·식사 기록 0건.

---

## 2. 구성

```
bgm/
├── fe/                  Vite + React 19 + TypeScript + Tailwind 4 (정적 빌드 → nginx 서빙)
│   ├── src/lib/store.ts     상태 + 서버 동기화 큐 (핵심)
│   ├── src/lib/glucose.ts   혈당 구간·통계(TIR, GMI, CV)
│   ├── src/lib/schedule.ts  일정 반복 전개, D-day, 문자 문구
│   ├── src/pages/*          화면
│   └── capacitor.config.json
├── be/                  Express 5 + MongoDB 드라이버 (빌드 없음, node src/index.js)
│   ├── src/index.js         API 전부
│   └── .env.example
├── deploy/
│   ├── systemd/bgm-be.service
│   └── nginx/bgm.lunarsystem.co.kr
├── docker-compose.yml   MongoDB 7
└── docs/design/         화면 캡처 (01~08 은 초기 시안, 이후 실제 앱)
```

| 구성요소 | 주소 | 실행 방식 |
|---|---|---|
| 프론트 | `fe/dist` | nginx 정적 서빙 (SPA, `try_files $uri /index.html`) |
| 백엔드 | `127.0.0.1:63301` | systemd `bgm-be` |
| MongoDB | `127.0.0.1:63302` → 컨테이너 27017 | `docker compose` (프로젝트명 `bgm`), 데이터 `bgm/data/mongo` |
| 개발 서버 | `:63300` | `cd fe && npm run dev` (`/api` 는 63301 로 프록시) |

현재 서버 버전: Node 24.12, MongoDB 7.0, nginx 1.28, certbot 4.0.

### 환경변수 (`be/.env`, 저장소에 없음)

| 키 | 값 |
|---|---|
| `PORT` | `63301` |
| `MONGODB_URI` | `mongodb://127.0.0.1:63302/bgm` |
| `JWT_SECRET` | 64자리 hex. **기존 서버 값을 그대로 옮기면 사용자 로그인이 유지**되고, 새로 만들면 전원 재로그인 |

---

## 3. 새 서버 설치 순서

전제: Ubuntu, root, Node 20 이상, Docker + compose 플러그인, nginx, certbot.

```bash
# 1) 코드
git clone https://github.com/delphism84/glucose_manager_web.git /lunar/empecs
cd /lunar/empecs/bgm

# 2) DB
docker compose up -d                       # 127.0.0.1:63302

# 3) 백엔드
cd be && npm ci
cp .env.example .env && chmod 600 .env     # JWT_SECRET 채우기 (기존 값 권장)
cp ../deploy/systemd/bgm-be.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now bgm-be
curl -s http://127.0.0.1:63301/api/health  # {"ok":true}

# 4) 프론트
cd ../fe && npm ci && npm run build        # fe/dist 생성
```

경로를 `/lunar/empecs/bgm` 가 아닌 곳에 두면 `deploy/systemd/bgm-be.service` 의 `WorkingDirectory`, `EnvironmentFile` 과
`deploy/nginx/bgm.lunarsystem.co.kr` 의 `root` 를 함께 고친다.

### 5) 데이터 이전 (기존 서버 → 새 서버)

```bash
# 기존 서버
docker exec bgm-mongo-1 mongodump --db bgm --archive --gzip > bgm-$(date +%F).archive.gz

# 새 서버 (파일 복사 후)
docker exec -i bgm-mongo-1 mongorestore --archive --gzip --drop < bgm-YYYY-MM-DD.archive.gz
```

컨테이너 이름은 compose 프로젝트명에 따라 달라질 수 있다 (`docker ps` 로 확인).

### 6) nginx · 인증서 · DNS

1. DNS `bgm.lunarsystem.co.kr` A 레코드를 새 서버 IP 로 변경 (기존: 139.180.189.230). 전파 확인 후 진행.
2. 인증서가 아직 없으므로 먼저 80 포트만 여는 임시 설정으로 발급한다.

```bash
cat > /etc/nginx/sites-available/bgm.lunarsystem.co.kr <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name bgm.lunarsystem.co.kr;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 404; }
}
EOF
ln -sf /etc/nginx/sites-available/bgm.lunarsystem.co.kr /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot certonly --webroot -w /var/www/html -d bgm.lunarsystem.co.kr -n

# 발급 후 본 설정으로 교체
cp /lunar/empecs/bgm/deploy/nginx/bgm.lunarsystem.co.kr /etc/nginx/sites-available/
nginx -t && systemctl reload nginx
certbot renew --dry-run --cert-name bgm.lunarsystem.co.kr
```

3. 확인

```bash
curl -s https://bgm.lunarsystem.co.kr/api/health
curl -s -o /dev/null -w '%{http_code}\n' https://bgm.lunarsystem.co.kr/stats   # 200 (SPA 라우트)
```

### 7) 기존 서버 정리 (새 서버 확인 후)

```bash
systemctl disable --now bgm-be
cd /lunar/empecs/bgm && docker compose down        # data/mongo 는 남는다
rm /etc/nginx/sites-enabled/bgm.lunarsystem.co.kr && nginx -t && systemctl reload nginx
```

---

## 4. 주의사항 (기존 서버에서 겪은 일)

- **nginx 설정 테스트 실패로 리로드 불가**: 기존 서버에서 `/lunar/uniscan/deploy/nginx/acme-default-443.conf` 가
  삭제된 `lightinmoon.com` 인증서를 참조해 `nginx -t` 가 실패했다. 2026-09-30 에 인증서 경로를
  `gms.lunarsystem.co.kr` 로 바꿔 해결했다 (백업: `acme-default-443.conf.bak-20260930`).
  새 서버에서도 nginx 설정을 옮길 때 **존재하지 않는 인증서 경로가 없는지 `nginx -t` 로 먼저 확인**한다.
- `nginx -t | tail` 처럼 파이프로 묶으면 실패해도 다음 명령이 실행된다. `nginx -t && systemctl reload nginx` 로 쓴다.
- 백엔드는 `127.0.0.1` 에만 바인딩한다. 외부 공개는 nginx 로만 한다.
- MongoDB 포트도 `127.0.0.1:63302` 로만 열려 있고 인증이 없다. 외부에 노출하지 말 것.

---

## 5. API

모든 응답은 JSON, 오류는 `{ "error": "한국어 메시지" }`. 인증은 `Authorization: Bearer <JWT>`.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 상태 확인 |
| POST | `/api/auth/register` | `{username, password, name, email?}` → `{token}`. 아이디 `[a-z0-9_]{4,20}`, 비밀번호 8~72자 |
| POST | `/api/auth/login` | `{username, password}` → `{token}` (가입·로그인 15분 30회 제한) |
| GET | `/api/state` | 사용자 전체 상태 (설정 + 혈당 + 식사) |
| PUT | `/api/settings` | `profile, meds, medTaken, labs, report, events, notify` 중 바뀐 키만 |
| POST | `/api/readings` · `/api/meals` | 단건 또는 배열(최대 500). 클라이언트 id 로 upsert |
| DELETE | `/api/readings/:id` · `/api/meals/:id` | 삭제 |
| DELETE | `/api/account` | 회원 탈퇴 (모든 데이터 삭제) |

### 컬렉션

- `users` — `username`(unique), `passHash`(bcrypt), `settings{profile, meds, medTaken, labs, report, events, notify}`, `createdAt`
- `readings` — `userId, id, ts, value(mg/dL), tag, note?` · unique `(userId, id)`
- `meals` — `userId, id, ts, type, name, carbs, kcal` · unique `(userId, id)`

설정에 새 키를 추가할 때는 `be/src/index.js` 의 `SETTINGS_KEYS`(배열이면 `ARRAY_KEYS` 도)와
`fe/src/lib/store.ts` 의 `SETTINGS`, `EMPTY` 를 함께 고친다. 예전 계정은 `EMPTY` 와 합쳐서 읽으므로 마이그레이션은 필요 없다.

---

## 6. 다음 작업 제안

1. **리포트 메일**: `report` 설정(매주/매월, 요일·날짜, 수신자)이 이미 저장되므로 백엔드에 스케줄러 + SMTP 발송만 붙이면 된다.
   `report.history` 는 현재 프론트에서 "대기" 로만 기록한다.
2. **일정 알림**: `events[].remind`(분 단위), `push`, `sms` 와 `notify.phone` 이 저장된다. 문자 발송 업체 연동과
   앱 푸시(Capacitor + FCM/APNs)가 필요하다. 반복 일정 전개 로직은 `fe/src/lib/schedule.ts` 의 `occurrences()` — 서버에서도 같은 규칙으로 옮겨야 한다.
3. **앱 패키징**: `npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios` 후 `npx cap add android` 등.
   앱 안에서는 API 주소가 상대경로(`/api`)라 동작하지 않으므로 **API 베이스 URL 설정이 먼저 필요**하다 (`store.ts` 의 `api()`).
4. **비밀번호 찾기**: 이메일이 선택이므로 이메일 등록자만 메일 재설정, 미등록자는 별도 방식 결정 필요.
5. 하단 탭이 6개라 좁다. 통계·리포트 통합을 검토.
