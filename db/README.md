# DB 스크립트 위치 안내

DB 스키마·시드·추천 프로시저의 **기준 파일은 `apps/backend/db/`** 입니다.
(이 폴더에 있던 01~04 SQL은 같은 내용을 옮기면서 정리했습니다.)

## 실행 방법
1. MySQL 8.x 설치 후 서버 실행
2. `apps/backend` 에서
   ```
   npm install
   copy .env.example .env     (DB_PASSWORD, JWT_SECRET 입력)
   npm run migrate:reset      (fitbuddy DB 삭제 후 001 → 004 순서로 재생성)
   ```
3. 확인: `SELECT COUNT(*) FROM fitbuddy.Missions;` → 29

## 주의
- `migrate:reset` 은 기존 fitbuddy DB를 삭제합니다. 테이블 구조가 바뀌었을 때만 실행하세요.
- 공용 테스트 계정: `testuser01` / `Test1234!` (`apps/backend/db/004_test_account.sql`)
