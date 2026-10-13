-- 테스트 회원 3명 (추천 엔진 검증용)
USE fitbuddy;
INSERT INTO Users (user_id, password_hash, email, nickname) VALUES
('test_diet',   'dummy_hash', 'diet@test.com',   '다이어터'),
('test_muscle', 'dummy_hash', 'muscle@test.com', '근육맨'),
('test_stamina','dummy_hash', 'stamina@test.com','러너');

INSERT INTO Onboarding_profiles (Users_user_number, goal, exercise_experience, exercise_place, avoid_motion, body_limit)
SELECT user_number, 'diet',   'none',   'indoor',  'jump', ''      FROM Users WHERE user_id='test_diet'   UNION ALL
SELECT user_number, 'muscle', 'weekly', 'indoor',  '',     'wrist' FROM Users WHERE user_id='test_muscle' UNION ALL
SELECT user_number, 'stamina','daily',  'outdoor', '',     'knee'  FROM Users WHERE user_id='test_stamina';
