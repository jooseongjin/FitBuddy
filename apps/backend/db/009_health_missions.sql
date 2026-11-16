-- HealthKit / Health Connect 지표를 직접 진행도로 쓰는 일일 미션 후보
USE fitbuddy;

INSERT INTO Missions (title, description, exercise_type, environment, target_value, target_unit, difficulty, base_point)
SELECT x.title, x.description, x.exercise_type, x.environment, x.target_value, x.target_unit, x.difficulty, x.base_point
  FROM (
    SELECT '실내 2,000걸음 걷기' AS title, '오늘 걸음 수를 2,000걸음 채워요.' AS description, 'cardio' AS exercise_type, 'indoor' AS environment, 2000 AS target_value, '걸음' AS target_unit, 'beginner' AS difficulty, 35 AS base_point
    UNION ALL SELECT '산책 3,000걸음', '가벼운 산책으로 오늘 3,000걸음을 채워요.', 'cardio', 'outdoor', 3000, '걸음', 'beginner', 40
    UNION ALL SELECT '활동 칼로리 80kcal', '오늘 활동 칼로리를 80kcal 채워요.', 'cardio', 'indoor', 80, 'kcal', 'intermediate', 45
    UNION ALL SELECT '활동 칼로리 100kcal', '오늘 활동 칼로리를 100kcal 채워요.', 'cardio', 'outdoor', 100, 'kcal', 'intermediate', 50
  ) AS x
 WHERE NOT EXISTS (SELECT 1 FROM Missions m WHERE m.title = x.title);

INSERT IGNORE INTO Mission_tags (Missions_id, Tags_tag_id)
SELECT m.Missions_id, t.tag_id
  FROM Missions m
  JOIN Tags t ON t.tag_name = 'diet' AND t.tag_type = 'goal'
 WHERE m.title IN ('실내 2,000걸음 걷기', '산책 3,000걸음', '활동 칼로리 80kcal', '활동 칼로리 100kcal');