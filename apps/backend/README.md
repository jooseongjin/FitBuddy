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
- `db/` 의 배포 마이그레이션은 001 → 009 순서로 적용합니다. migration runner는 `008_health_daily_metrics.sql`의 컬럼이 이미 있으면 자동으로 건너뜁니다. SQL 파일을 직접 실행하는 경우에는 한 번만 적용해야 합니다.
- 이미 운영 중인 DB(배포 서버 등)에 새 파일만 적용할 때: `npm run migrate -- --from 005`
  (기존 데이터 유지, 005 이상 번호만 실행. 적용한 번호를 기록해 중복 실행하지 마세요.)

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
| GET | /missions/recommended, /missions/today | Bearer | 오늘의 맞춤 미션 조회/배정 |
| POST | /missions/:id/progress | Bearer | 반복 횟수 미션 수동 진행 기록 |
| POST | /missions/:id/complete | Bearer | 미션 완료, FitPoint·XP·Streak 원자적 갱신 |
| POST | /missions/today/:missionId/complete | Bearer | 기존 클라이언트 호환 완료 경로 |
| GET | /character | Bearer | DB 캐릭터 레벨·누적 XP 조회 |
| GET | /streak | Bearer | DB 연속 기록·주간 기록 조회 |
| POST | /streak/repair | Bearer | 어제 기록 복구 및 포인트 원장 차감 |
| GET | /points/balance | Bearer | 원장 합계 잔액 조회 |
| GET | /points/history | Bearer | 원장 내역 페이지 조회 |
| GET | /health/today | Bearer | 오늘 건강 요약 조회 |
| PUT | /health/today | Bearer | HealthKit/Health Connect 일일 요약 동기화 |

진행 정보와 미션은 모두 요청 사용자 소유 행으로 제한됩니다. 포인트 잔액은 `Point_transactions` 합계이며, 미션 완료와 복구는 InnoDB 트랜잭션으로 처리합니다.

Streak 복구 기본값은 개발용 임시 정책입니다. `.env`에서 `STREAK_REPAIR_COST` (기본 300), 무료 복구 월 횟수 `STREAK_REPAIR_FREE_BASIC` (기본 1)·`STREAK_REPAIR_FREE_PREMIUM` (기본 2), 포인트 복구 월 횟수 `STREAK_REPAIR_POINTS_BASIC` (기본 1)·`STREAK_REPAIR_POINTS_PREMIUM` (기본 2)로 조정할 수 있습니다. 무료 복구와 포인트 복구는 서로 다른 한도로 세며, 매월 1일 00:00 KST에 초기화되고 이월되지 않습니다. (이전 변수 `STREAK_REPAIR_MONTHLY_LIMIT_*`, `STREAK_REPAIR_PREMIUM_FREE`는 더 이상 쓰지 않습니다.)

레벨 임계치가 아직 확정되지 않아 미션 완료 시 누적 XP만 DB에 쌓고 `Characters.level`은 유지합니다. API는 XP 임계치 필드를 `null`로 반환합니다.

`db/007_health_activity.sql`의 `Health_connections`, `Activity_records`, `Daily_activity`, `Mission_verify_rules`, `Mission_verifications`를 사용합니다. 건강 동기화는 stable `external_id`를 원본 기록에 저장해 재전송·계정 간 재사용을 막고, 미션 완료는 `Mission_verify_rules`를 확인해 인증 결과를 기록합니다. 인증 규칙이 있는 걸음/운동시간 미션은 `verified` 보상 배율 1.00, 직접 기록하는 횟수 미션은 `unverified` 0.50 배율로 원장에 남깁니다.

센서 출처는 `HEALTH_TRUSTED_SOURCE_IDS` 환경변수(쉼표 구분, 기본값은 Samsung Health 및 Android Health Connect 패키지) allowlist를 이용해 분류합니다. 다만 `source_app`과 원본 payload 자체는 클라이언트가 전송하므로 allowlist는 완전한 위변조 방지나 플랫폼 서명이 아닙니다. 실제 포인트가 운영되는 배포 전에 서버 검증/이상 탐지와 Health Connect 기록 재검증을 추가하세요. 수동 반복 API는 요청당 +1로 제한하지만 반복 호출은 가능하므로 인증된 운동 횟수 증명도 후속 과제입니다.

Railway 배포에서는 서비스 Root Directory를 `apps/backend`로 지정하고 `npm start`를 실행 명령으로 사용합니다. `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`은 Railway Variables에 설정하고 `/health`를 health check path로 사용하세요. migration은 백업과 schema 확인 후 한 번 실행하고, 운영 DB에 테스트용 seed SQL은 실행하지 마세요. 프론트 `.env.production`의 `VITE_API_URL`은 휴대전화에서 접근 가능한 HTTPS API 주소여야 하며 Android WebView의 `localhost`는 PC가 아니라 휴대전화 자신을 가리킵니다.

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
`db/004_test_account.sql` 이 테스트 계정을 생성합니다. 시연 진척도는 선택적으로 `scripts/seed_test_account_progress.sql`을 로컬에서만 수동 실행하세요. 이 스크립트는 기본 마이그레이션에 포함되지 않습니다.
- 아이디 `testuser01` / 비밀번호 `Test1234!`
- 온보딩 완료, 최근 6일 완료 기록, 6일 연속 Streak, 미션 완료 원장 기준 약 200 FitPoint
- 테스트 계정과 시연용 기록은 실제 배포 DB에 적용하지 마세요.
- 수동 적용 예: `mysql -u <user> -p fitbuddy < scripts/seed_test_account_progress.sql`

## 서버 주소 / CORS
- 포트 기본값 **4000** (프론트 `apps/frontend/src/api/axios.ts` 의 baseURL)
- CORS: `localhost`, `127.0.0.1`의 개발 포트와 iOS `capacitor://localhost`를 허용합니다. `CORS_ORIGIN`을 설정하면 프론트 주소와 네이티브 앱 origin을 모두 포함하세요.

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
- `Activity_records`/`Mission_verifications` 신뢰 검증은 현재 API에 아직 연결되지 않았습니다.
- 테스트: `test/health_db.test.js` (H-01~H-06)
