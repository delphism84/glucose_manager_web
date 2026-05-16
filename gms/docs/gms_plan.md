# GMS (혈당측정관리시스템) — 구축·배포 계획

레거시 참조: [glucose_manager_dotnet](https://github.com/delphism84/glucose_manager_dotnet) (워크트리 내 읽기 전용 분석본: `empecs/gms/docs/ref_project/glucose_manager_dotnet`).  
신규 구현 레이아웃: **`empecs/gms/fe`** (Next.js + Tailwind), **`empecs/gms/be`** (Node), **`empecs/gms/`** Compose로 DB 영속화(디스크 마운트).

---

## 1. 목표

- 레거시 WinForms + 로컬 SQLite와 **기능 역할만 유사**하게 웹 제공(화면·명칭·배치는 자유롭게 변경 가능).
- 기존 DB 스키마는 **전면 교체 가능**; 도메인은 영문 테이블·컬럼으로 재설계.
- **두 종류 사용자**: 로그인하는 운영(스태프) 계정, 등록된 **환자(사용자) 계정/프로필** 및 그에 속한 혈당 측정 데이터.

---

## 2. 기술 스택

| 구분 | 선택 |
|------|------|
| FE | Next.js + Tailwind (`empecs/gms/fe`) |
| BE | Node (TypeScript 권장, Express 또는 Fastify) (`empecs/gms/be`) |
| DB | Docker 컨테이너 + **호스트 볼륨 마운트**(데이터 영속) — PostgreSQL 권장(또는 운영 정책에 맞춰 SQLite 단일파일 등) |
| 인증 | JWT 또는 세션 + `role`(예: staff / 선택적 patient-only 흐름) |

레거시의 **시리얼(COM) 미터**는 브라우저 단독과 궁합이 나쁘므로 초기에는 **수동 입력 + 파일 임포트**(추후 Web Serial / 로컬 에이전트)로 분리 검토.

---

## 3. 역할과 데이터 초안

- **staff**: 환자 CRUD, 측정·목표구간 설정, 통계·내보내기(PDF/Excel 등).
- **patient**: 레거시 `인원_목록`/환자에 해당; 외부 식별 문자열 수동 허용 요구 참고 시 `patient_external_id`(UNIQUE) 등으로 모델링.
- 핵심 엔티티: **환자**, **목표구간**(끼니·식전후·야간 등), **측정 행**(시각, 식사/전후, mg/dL, 케톤/플래그 등).

마이그레이션 도구(Prisma/Kysely 등)로 버전관리.

---

## 4. 참조 기능 대응(요약)

레거시 `CubeBase/scada/Medisign` 기준 기능 클립: 로그인·환자 관리·데이터 목록·다운로드(미터)·백업/복구·설정·통계/보고서(Excel/PDF 요구 문서 다수 존재: `docs/ref_project/glucose_manager_dotnet/req*.md`, `docs/QA_*`).  
웹에서는 API + 페이지로 재구현하고, **SQL 문자열 결합 패턴은 사용하지 않고** 파라미터 바인딩으로 작성.

---

## 5. 단계별 로드맵(lplan)

| Phase | 내용 |
|-------|------|
| 0 | 인증 방식·환자 ID 규칙·언어/locale 방침 고정 |
| 1 | Docker Compose(be, db 볼륨), BE/FE 스캐폴딩, 시드 계정 |
| 2 | MVP — 스태프 로그인, 환자 CRUD, 측정 수동 입력·목록·기간 필터 |
| 3 | 목표구간 + 플래그(정상 범위), 기본 차트·통계, Excel 최소 |
| 4 | PDF·통계 회귀(레거시 QA 문서 참고 표준편차·건수 등) |
| 5 | 미터 연동 후보(Web Serial·CSV·별도 에이전트) |

---

## 6. 도메인 `gms.lunarsystem.co.kr` — 인증서 발급 및 서빙

운영 패턴은 [`empecs/cgms/cgms_be/nginx`](../../cgms/cgms_be/nginx) 예시처럼 **호스트 Nginx 종단 TLS + 리버스 프록시**(또는 Traefik 등 동급 게이트웨이). 아래는 **Certbot(webroot)** 기준 예시이다.

참고: CGMS 사용자 Web 배포 절차 — [`cgms_app_fe/docs/QA_DEPLOY.md`](../../cgms/cgms_app_fe/docs/QA_DEPLOY.md).

### 6.1 사전 준비

1. **DNS**: `gms.lunarsystem.co.kr` A 레코드를 서버 공인 IP에 연결한다.
2. **Compose 포트**(예시는 구현 후 `docker-compose.yml` 실제 매핑에 맞게 바꿀 것):
   - Next.js 프로덕션: 호스트 **`127.0.0.1:63204`** (예상; 확정 후 문서 수정)
   - BE API: **`127.0.0.1:63201`** — 권장은 **단일 호스트명 오리진**으로 Nginx가 `/api`를 BE로, 나머지를 FE로 프록시하거나 FE 컨테이너 하나가 `/api`만 내부 BE로 넘기는 구성이다.

### 6.2 HTTP 80 및 ACME challenge

```bash
# 최초 인증서 (DNS 전파 확인 후 실행)
sudo certbot certonly --webroot -w /var/www/html -d gms.lunarsystem.co.kr

# 갱신 동작 검증
sudo certbot renew --dry-run
```

브라우저 신뢰 CA(예: Let us Encrypt)로 `fullchain.pem` / `privkey.pem`이 `/etc/letsencrypt/live/gms.lunarsystem.co.kr/`에 생성된다.

포트 80을 쓸 수 없을 때는 **DNS-01** 챌린지(`certbot` DNS 플러그인 또는 수동 TXT)로 같은 도메명 인증서를 발급한다.

### 6.3 Nginx 설정 예시

레포에는 `empecs/gms/nginx/gms.lunarsystem.co.kr.conf`처럼 보관 후, 서버에 복사해 적용한다.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name gms.lunarsystem.co.kr;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name gms.lunarsystem.co.kr;

    ssl_certificate /etc/letsencrypt/live/gms.lunarsystem.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gms.lunarsystem.co.kr/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://127.0.0.1:63201/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:63204;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

- 포트 번호는 Compose 바인드에 맞게 수정한다.
- FE만 호스트 포트 하나로 두고 FE가 `/api`를 역프록시하는 경우, 호스트 Nginx에서는 `proxy_pass http://127.0.0.1:63204` 한 블록으로 축약할 수 있다.

### 6.4 애플리케이션 측

- 프로덕션에서는 **`https://gms.lunarsystem.co.kr` 단일 오리진** 기준으로 API를 **상대 경로 `/api`** 또는 동일 호스트로 호출한다.
- Cookie 또는 JWT 저장 시 **`Secure`**(HTTPS 필요), 적절한 **`SameSite`**를 설정한다.

### 6.5 배포 체크리스트

- [ ] `dig +short gms.lunarsystem.co.kr`로 DNS 확인
- [ ] Certbot으로 인증서 발급 후 `nginx -t` 및 reload
- [ ] 브라우저에서 HTTPS 로드 및 `/api` 헬스 또는 로그인 API 확인

---

## 7. 문서 변경 이력

- 초안: 스택·lplan + `gms.lunarsystem.co.kr` Certbot 및 Nginx 서빙 절차
