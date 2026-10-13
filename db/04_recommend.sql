-- 오늘의 미션 추천/배정 프로시저 (룰 기반)
-- 1) 필터: 환경 일치, 피해야 할 동작(실내만), 불편 부위, 최근 7일 배정 미션 제외
-- 2) 점수: 목표 태그 일치 3점 + 난이도 근접도(일치 2 / 한 단계 차이 1 / 그 외 0)
-- 3) 점수 높은 순, 동점은 무작위로 3개. 하루에 한 번만 배정(이미 있으면 아무것도 안 함)
USE fitbuddy;
DROP PROCEDURE IF EXISTS sp_assign_daily_missions;
DELIMITER $$
CREATE PROCEDURE sp_assign_daily_missions(IN p_user INT UNSIGNED, IN p_date DATE)
BEGIN
  INSERT INTO User_missions (Missions_id, Users_user_number, assigned_date)
  SELECT c.Missions_id, p_user, p_date
  FROM (
    SELECT m.Missions_id,
      ( CASE WHEN EXISTS (SELECT 1 FROM Mission_tags mt JOIN Tags t ON t.tag_id = mt.Tags_tag_id
                          WHERE mt.Missions_id = m.Missions_id AND t.tag_type = 'goal' AND t.tag_name = p.goal)
             THEN 3 ELSE 0 END
        + CASE ABS(FIELD(m.difficulty,'beginner','intermediate','advanced')
                  - CASE p.exercise_experience WHEN 'none' THEN 1 WHEN 'monthly' THEN 1 WHEN 'weekly' THEN 2 ELSE 3 END)
            WHEN 0 THEN 2 WHEN 1 THEN 1 ELSE 0 END
      ) AS score
    FROM Missions m
    JOIN Onboarding_profiles p ON p.Users_user_number = p_user
    WHERE m.is_active = TRUE
      AND m.environment = p.exercise_place
      AND NOT EXISTS (
            SELECT 1 FROM Mission_tags mt JOIN Tags t ON t.tag_id = mt.Tags_tag_id
            WHERE mt.Missions_id = m.Missions_id
              AND ( (t.tag_type = 'avoid'  AND p.exercise_place = 'indoor' AND FIND_IN_SET(t.tag_name, p.avoid_motion) > 0)
                 OR (t.tag_type = 'strain' AND FIND_IN_SET(t.tag_name, p.body_limit)   > 0) ) )
      AND m.Missions_id NOT IN (
            SELECT um.Missions_id FROM User_missions um
            WHERE um.Users_user_number = p_user AND um.assigned_date > p_date - INTERVAL 7 DAY)
    ORDER BY score DESC, RAND()
    LIMIT 3
  ) c
  WHERE NOT EXISTS (SELECT 1 FROM User_missions x WHERE x.Users_user_number = p_user AND x.assigned_date = p_date);
END$$
DELIMITER ;

-- 사용 예
-- CALL sp_assign_daily_missions(1, CURDATE());
-- SELECT u.user_id, m.title, m.difficulty, m.environment
--   FROM User_missions um JOIN Users u ON u.user_number=um.Users_user_number JOIN Missions m ON m.Missions_id=um.Missions_id
--  WHERE um.assigned_date = CURDATE();
