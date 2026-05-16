# EMPECS CGMS Admin

[ln_admin_fe_ref](https://github.com/delphism84/ln_admin_fe_ref)를 클론한 **Bootstrap 5 + Tailwind** 셸 위에, **`empecs/cgms/cgms_be`**의 관리자 API(`/api/admin/*`)를 쓰는 콘솔입니다.

- 로그인: `POST /api/admin/login` → JWT는 `localStorage` 키 `empecs_admin_jwt`
- 화면: `/login`, `/dashboard`, `/users`, `/devices`, `/data`

## 개발

```bash
npm install
npm run dev
```

API는 `src/lib/adminApi.ts`의 `apiUrl()` / `adminFetch()`를 통해 나갑니다.

| 방식 | 설정 | 설명 |
|------|------|------|
| **Next 프록시 (권장)** | `NEXT_PUBLIC_API_BASE_URL` 비움 + `API_PROXY_TARGET=http://127.0.0.1:63101` | 브라우저는 `http://localhost:3000/api/...`, Next가 `next.config.mjs` rewrites로 로컬 BE로 전달. CORS 없음. |
| **클라이언트 직결** | `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:63101` | 브라우저가 BE로 직접 요청(BE `cors()` 허용 전제). |

로컬 BE는 `empecs/cgms/cgms_be`에서 `docker compose up` 시 호스트 **`127.0.0.1:63101`**(컨테이너 `be:58002` 매핑)을 쓰는 구성이 일반적입니다.

프록시로 띄우는 예:

```bash
API_PROXY_TARGET=http://127.0.0.1:63101 npm run dev
```

자세한 변수 설명은 `.env.example` 참고.

## Docker / Compose

`empecs/cgms/cgms_be/docker-compose.yml`의 `fe` 서비스가 이 디렉터리를 빌드합니다. Compose에서는 빌드 인자 `API_PROXY_TARGET=http://be:58002`로 `/api`를 백엔드로 넘깁니다.

## 원본 레퍼런스

- <https://github.com/delphism84/ln_admin_fe_ref>
