# FitBuddy Backend (Node.js / Express)

회원가입 · 로그인 · 온보딩 저장 API + DB 마이그레이션.

## 실행
```bash
npm install
cp .env.example .env        # DB 비밀번호, JWT_SECRET 수정
npm run migrate:reset       # fitbuddy DB 삭제 후 재생성 (스키마+시드+추천 프로시저)
npm start                   # http://localhost:3000
npm test                    # 통합 테스트 (migrate:reset 후 실행)
```
- `npm run migrate` 는 DB가 이미 있으면 중단합니다. `migrate:reset` 은 **기존 데이터를 모두 삭제**합니다.
- `db/` 의 SQL 파일은 번호 순서(001 → 003)대로 실행됩니다.

## API (모두 `/api/v1`, 에러는 `{ error: { code, message } }`)
| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | /auth/signup | - | 가입. Users + Streaks + Characters 한 트랜잭션 생성. 201 / 400 / 409(USER_ID_TAKEN, EMAIL_TAKEN) |
| POST | /auth/login | - | 200 `{accessToken, tokenType, user, onboardingCompleted}` / 401 |
| POST | /onboarding | Bearer | 최초 저장 201 / 409 이미 있음 |
| PUT | /onboarding | Bearer | 수정 200 / 404 |
| GET | /onboarding | Bearer | 조회 |
| GET | /missions/recommended | Bearer | 오늘의 미션(없으면 추천 프로시저로 배정). 온보딩 전이면 409 ONBOARDING_REQUIRED |
| POST | /missions/:id/complete | Bearer | 미션 완료 + 포인트 적립 (:id = user_mission_id). 중복/없는 미션 409 |
| GET | /points/balance | Bearer | 포인트 잔액 `{success, balance}` |

### signup 요청
`{ "userId": "영문숫자_ 4~30", "password": "8자+영문+숫자", "email": "...", "nickname": "2~16자" }`

### onboarding 요청
```json
{ "goal": "diet|muscle|stamina",
  "exerciseExperience": "none|monthly|weekly|daily",
  "exercisePlace": "indoor|outdoor",
  "avoidMotion": ["jump","prone","knee_bend","floor"],
  "bodyLimit": ["knee","back","shoulder","wrist","ankle"] }
```
`exercisePlace=outdoor` 이면 `avoidMotion` 은 서버가 빈 값으로 저장합니다.

## 인증
로그인 시 JWT Access Token 발급 → 이후 요청에 `Authorization: Bearer <token>`. 만료 기본 1시간(`JWT_EXPIRES_IN`). Refresh Token은 미구현.

## 참고
- 비밀번호는 bcrypt 해시로만 저장합니다.
- 로그인 실패는 아이디 없음/비밀번호 틀림/탈퇴 모두 같은 401 응답입니다.
- Windows MySQL은 테이블명을 소문자로 저장하므로 코드의 테이블명 대소문자는 Linux 배포 시 확인이 필요합니다. (현재 코드는 스키마와 같은 대소문자 사용)
