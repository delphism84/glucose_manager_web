# BGM — 혈당노트 (bgm.lunarsystem.co.kr)

소비자용 세로형 혈당 관리 하이브리드 앱. 임상용 다환자 시스템인 `../gms` 와 별도 프로젝트이며 스택(Vite + React + TS + Tailwind)만 공유한다.

- `fe/` — 웹앱. `npm run dev` (포트 63300), `npm run build`
- `fe/capacitor.config.json` — Android/iOS 래핑용 (Capacitor 미설치 상태)
- `docs/design/` — 화면 시안 캡처
- `be/` — API 서버 (Express + MongoDB, 빌드 없음). `127.0.0.1:63301`, systemd `bgm-be`, 설정은 `be/.env`
- `docker-compose.yml` — MongoDB (`127.0.0.1:63302`, 데이터는 `data/mongo`)
- `deploy/` — systemd 유닛, nginx 사이트 설정 원본

## 구조

- 가입은 아이디 + 비밀번호, 이메일은 선택. JWT(90일)로 인증한다.
- 화면은 로컬 상태를 먼저 바꾸고 바뀐 부분만 큐에 담아 서버로 보낸다 (`fe/src/lib/store.ts`).
  큐는 localStorage 에 남아 오프라인이어도 다음 접속 때 전송된다.
- 혈당·식사는 클라이언트가 만든 id 로 upsert 하므로 재전송해도 중복되지 않는다.

## 배포

```
cd fe && npm run build                 # nginx 가 fe/dist 를 직접 서빙
systemctl restart bgm-be               # 백엔드 변경 시
cp deploy/nginx/bgm.lunarsystem.co.kr /etc/nginx/sites-available/ && nginx -t && systemctl reload nginx
```

## 남은 일

1. 리포트 메일 발송·스케줄러 (SMTP 필요) — 현재 "지금 보내기"는 요청만 기록
2. 일정 알림 실제 발송 (문자·푸시) — 현재 일정 탭의 문자 알림은 미리보기만 되는 목업
3. Capacitor 로 Android/iOS 패키징, 푸시 알림
4. 비밀번호 찾기 (이메일이 선택이라 방식 결정 필요)

서버 이전·인수인계는 [HANDOFF.md](HANDOFF.md) 참고.
