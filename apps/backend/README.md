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
- `db/` 의 SQL 파일은 번호 순서(001 → 007)대로 실행됩니다.
- 이미 운영 중인 DB(배포 서버 등)에 새 파일만 적용할 때: `npm run migrate -- --from 005`
  (기존 데이터 유지, 005 이상 번호만 실행. 005·006은 여러 번 실행해도 중복되지 않음)

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

## 추천 엔진 (오늘의 맞춤 미션)
미션 API는 **`src/services/recommend.js` 의 `getTodayMissions(user_number)` 하나만 호출**하면 됩니다.
```js
const { getTodayMissions } = require('../services/recommend');
const missions = await getTodayMissions(req.user.user_number); // KST 오늘, 배정 없으면 자동 배정
// → [{ user_mission_id, mission_id, title, description, exercise_type, environment,
//      target_value, target_unit, difficulty, base_point, mission_status, completed_at }, ...] (3개)
```
- 온보딩을 안 한 사용자는 `ApiError 409 ONBOARDING_REQUIRED` 를 던집니다 (`next(e)` 로 넘기면 공통 오류 응답).
- 같은 날 여러 번 호출해도 처음 배정된 3개를 돌려줍니다.
- 규칙은 `db/006_recommend_v2.sql` 의 `sp_assign_daily_missions` (003의 v1을 교체):
  - 필터: 운동 장소, 피할 동작(실내만), 불편 부위, 기준 난이도 ±1단계
  - 기준 난이도: 운동 경험 + 최근 7일 완료율(80% 이상 한 단계 ↑, 30% 미만 한 단계 ↓)
  - 점수: 목표 태그 일치 3 + 난이도 근접도(일치 2 / 한 단계 차이 1)
  - 최근 7일 미션은 후순위(부족하면 오래된 것부터 재배정 → 매일 3개 보장), 근력·유산소·스트레칭 분산
- 테스트: `test/recommend.test.js` (R-01~R-08)

## 건강 데이터 연동·미션 인증 DB (`db/007_health_activity.sql`)
모바일 앱이 OS 헬스허브(Android Health Connect / iOS HealthKit)에서 읽은 데이터를 저장하는 테이블입니다.
앱은 MySQL에 직접 접속하지 않고, 지금처럼 백엔드 API(`/api/v1`)를 통해 저장·조회합니다.

| 테이블 | 용도 |
|---|---|
| Health_connections | 사용자별 헬스허브 연결 상태, 마지막 동기화 시각 |
| Activity_records | 헬스허브 원본 기록(걸음·운동 세션 등). `is_trusted` 는 DB가 계산(직접 입력·출처 불명 = 0) |
| Daily_activity | 하루 합계(걸음 수, 운동 시간, kcal) — 대시보드 표시용 |
| Mission_verify_rules | 미션별 인증 기준(걷기 = 걸음 수, 그 밖의 분 단위 = 운동 시간). 횟수 미션은 기준 없음 |
| Mission_verifications | 미션 인증 결과와 보상 배율(verified 1.00 / unverified 0.50 / rejected 0.00) |

- 부정 방지: 같은 기록(`platform` + `external_id`)은 재전송·다른 계정 전송 불가, 운동 기록 1건은 미션 1건에만 사용
- 테스트: `test/health_db.test.js` (H-01~H-06)
