-- 공용 테스트 계정 (로컬 개발·시연 전용, 실제 배포 서버에는 넣지 말 것)
--   아이디: testuser01   비밀번호: Test1234!
--   온보딩 완료 상태(다이어트 / 운동 경험 없음 / 실내 / 점프 동작 피함)라서
--   로그인 후 바로 추천 미션을 받을 수 있습니다.
-- 비밀번호는 bcrypt 해시로만 저장합니다 (평문 저장 금지).
USE fitbuddy;

INSERT INTO Users (user_id, password_hash, email, nickname)
VALUES ('testuser01', '$2a$10$HaT9kubt/qQMdIxaS4re9OeSZJjN3M5CRnhqG0hO34hGxv2tsBuQy', 'testuser01@fitbuddy.dev', '테스트계정');

SET @u = LAST_INSERT_ID();

-- 회원가입 API와 동일하게 Streaks / Characters 행을 함께 생성
INSERT INTO Streaks (Users_user_number) VALUES (@u);
INSERT INTO `Characters` (Users_user_number) VALUES (@u);

INSERT INTO Onboarding_profiles (Users_user_number, goal, exercise_experience, exercise_place, avoid_motion, body_limit)
VALUES (@u, 'diet', 'none', 'indoor', 'jump', '');
