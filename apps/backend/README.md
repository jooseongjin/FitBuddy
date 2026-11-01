# FitBuddy Backend (Node.js / Express)

회원가입 · 로그인 · 온보딩 저장 API + DB 마이그레이션.

## 실행
```bash
npm install
cp .env.example .env        # DB 비밀번호, JWT_SECRET 수정
npm run migrate:reset       # fitbuddy DB 삭제 후 재생성 (스키마+시드+추천 프로시저)
npm start                   # http://localhost:4000
npm test                    # 통합 테스트 (migrate:reset 후 실행)
```
- `npm run migrate` 는 DB가 이미 있으면 중단합니다. `migrate:reset` 은 **기존 데이터를 모두 삭제**합니다.
- `db/` 의 SQL 파일은 번호 순서(001 → 003)대로 실행됩니다.

## API (모두 `/api/v1`)
요청·응답 필드명은 **snake_case** (TRD, 프론트와 동일). 모든 응답에 `success` 가 있습니다.
- 성공: `{ "success": true, ... }`
- 실패: `{ "success": false, "code": "에러코드", "message": "설명" }`

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | /auth/signup | - | API-01 가입. 201 `{success, data:{user_number,user_id,nickname}}` / 400 / 409(USER_ID_TAKEN, EMAIL_TAKEN) |
| POST | /auth/login | - | API-02 로그인. 200 `{success, token, user, onboarding_completed}` / 401 / 403(탈퇴) |
| POST | /onboarding | Bearer | API-03 최초 저장 201 / 409 이미 있음 |
| PUT | /onboarding | Bearer | 수정 200 / 404 |
| GET | /onboarding | Bearer | 조회 |
| GET | /missions/recommended | Bearer | API-04 (박상욱 담당, 별도 PR) |
| POST | /missions/:id/complete | Bearer | API-05 (박상욱 담당, 별도 PR) |
| GET | /points/balance | Bearer | API-06 (박상욱 담당, 별도 PR) |

### signup 요청 (Signup.tsx 와 동일)
`{ "user_id": "아이디(최대 30자)", "email": "...", "password": "8자 이상", "nickname": "최대 16자" }`

### login 요청 (Login.tsx 와 동일)
`{ "user_id": "아이디 또는 이메일", "password": "..." }` → 응답의 `token` 을 저장해 이후 `Authorization: Bearer <token>` 로 전송

### onboarding 요청
```json
{ "goal": "diet|muscle|stamina",
  "exercise_experience": "none|monthly|weekly|daily",
  "exercise_place": "indoor|outdoor",
  "avoid_motion": ["jump","prone","knee_bend","floor"],
  "body_limit": ["knee","back","shoulder","wrist","ankle"] }
```
`exercise_place=outdoor` 이면 `avoid_motion` 은 서버가 빈 값으로 저장합니다.

## 공용 테스트 계정
`db/004_test_account.sql` 이 마이그레이션 때 자동 생성합니다 (로컬 개발·시연 전용).
- 아이디 `testuser01` / 비밀번호 `Test1234!` (온보딩 완료 상태라 로그인 후 바로 추천 미션 조회 가능)

## 서버 주소 / CORS
- 포트 기본값 **4000** (프론트 `apps/frontend/src/api/axios.ts` 의 baseURL)
- CORS: `localhost`, `127.0.0.1` 의 모든 포트 허용. 특정 주소만 허용하려면 `.env` 에 `CORS_ORIGIN=http://localhost:5173`

## 참고
- 비밀번호는 bcrypt 해시로만 저장합니다.
- 로그인 실패는 아이디 없음/비밀번호 틀림 모두 같은 401 응답입니다.
- 인증 미들웨어는 `req.user = { user_number, user_id }` 를 넣어줍니다 (미션·포인트 컨트롤러에서 사용).
- 추천 엔진: `db/003_recommend.sql` 의 `CALL sp_assign_daily_missions(user_number, 'YYYY-MM-DD')` (오늘 배정이 이미 있으면 아무것도 하지 않음)
