-- 오늘의 미션 추천/배정 프로시저 v2 (룰 기반) — 003_recommend.sql 의 프로시저를 교체
--
-- v1 → v2 변경점
--   (1) 후보 부족 해결: 최근 7일 배정 미션을 "완전 제외"하던 것을 "후순위"로 변경.
--       새 미션이 모자라면 가장 오래전에 했던 미션부터 다시 배정 → 매일 3개 보장
--   (2) 운동 종류 분산: 근력·유산소·스트레칭이 하루에 겹치지 않도록 종류별 1순위를 먼저 고름
--   (3) 완료 이력 반영: 최근 7일 완료율로 기준 난이도를 한 단계 올리거나 내림
--   (4) 안전: 기준 난이도와 두 단계 차이 나는 미션(입문자에게 고급 등)은 배정하지 않음
--
-- 규칙
--   필터  : 활성 미션, 운동 장소 일치, 피할 동작(실내만), 불편 부위, 기준 난이도 ±1 이내
--   기준 난이도: 운동 경험(none·monthly=입문, weekly=중급, daily=고급)
--               최근 7일 배정 6개 이상일 때 완료율 80% 이상 → +1단계, 30% 미만 → -1단계
--   점수  : 목표 태그 일치 3점 + 난이도 근접도(일치 2 / 한 단계 차이 1)
--   정렬  : ① 최근 7일 미배정 우선 ② 운동 종류별 순위(종류 분산) ③ 점수 높은 순
--           ④ 마지막 배정일이 오래된 순 ⑤ 무작위
--   하루에 한 번만 배정(이미 있으면 아무것도 안 함), 온보딩이 없으면 배정하지 않음
--
-- 사용 예
--   CALL sp_assign_daily_missions(1, CURDATE());
USE fitbuddy;
DROP PROCEDURE IF EXISTS sp_assign_daily_missions;
DELIMITER $$
CREATE PROCEDURE sp_assign_daily_missions(IN p_user INT UNSIGNED, IN p_date DATE)
proc: BEGIN
  DECLARE v_level INT DEFAULT NULL;
  DECLARE v_assigned INT DEFAULT 0;
  DECLARE v_completed INT DEFAULT 0;

  -- 하루 1회: 이미 배정된 날이면 종료
  IF EXISTS (SELECT 1 FROM User_missions WHERE Users_user_number = p_user AND assigned_date = p_date) THEN
    LEAVE proc;
  END IF;

  -- 기준 난이도 (1=beginner, 2=intermediate, 3=advanced). 온보딩이 없으면 배정하지 않음
  SET v_level = (SELECT CASE exercise_experience WHEN 'none' THEN 1 WHEN 'monthly' THEN 1 WHEN 'weekly' THEN 2 ELSE 3 END
                   FROM Onboarding_profiles WHERE Users_user_number = p_user);
  IF v_level IS NULL THEN
    LEAVE proc;
  END IF;

  -- 최근 7일 완료율로 한 단계 조정 (배정 6개 이상, 즉 이틀 이상 기록이 있을 때만)
  SET v_assigned = (SELECT COUNT(*) FROM User_missions
                     WHERE Users_user_number = p_user
                       AND assigned_date >= p_date - INTERVAL 7 DAY AND assigned_date < p_date);
  SET v_completed = (SELECT COUNT(*) FROM User_missions
                      WHERE Users_user_number = p_user AND mission_status = 'completed'
                        AND assigned_date >= p_date - INTERVAL 7 DAY AND assigned_date < p_date);
  IF v_assigned >= 6 THEN
    IF v_completed * 10 >= v_assigned * 8 THEN
      SET v_level = LEAST(v_level + 1, 3);
    ELSEIF v_completed * 10 < v_assigned * 3 THEN
      SET v_level = GREATEST(v_level - 1, 1);
    END IF;
  END IF;

  INSERT INTO User_missions (Missions_id, Users_user_number, assigned_date)
  SELECT r.Missions_id, p_user, p_date
  FROM (
    SELECT s.*,
           ROW_NUMBER() OVER (PARTITION BY s.exercise_type
                              ORDER BY s.is_recent, s.score DESC, s.last_date, s.rnd) AS type_rank
    FROM (
      SELECT m.Missions_id, m.exercise_type,
             ( CASE WHEN EXISTS (SELECT 1 FROM Mission_tags mt JOIN Tags t ON t.tag_id = mt.Tags_tag_id
                                 WHERE mt.Missions_id = m.Missions_id AND t.tag_type = 'goal' AND t.tag_name = p.goal)
                    THEN 3 ELSE 0 END
             + CASE ABS(FIELD(m.difficulty, 'beginner', 'intermediate', 'advanced') - v_level)
                 WHEN 0 THEN 2 ELSE 1 END ) AS score,
             CASE WHEN h.last_date > p_date - INTERVAL 7 DAY THEN 1 ELSE 0 END AS is_recent,
             COALESCE(h.last_date, '1000-01-01') AS last_date,
             RAND() AS rnd
      FROM Missions m
      JOIN Onboarding_profiles p ON p.Users_user_number = p_user
      LEFT JOIN (SELECT Missions_id, MAX(assigned_date) AS last_date
                   FROM User_missions
                  WHERE Users_user_number = p_user AND assigned_date < p_date
                  GROUP BY Missions_id) h ON h.Missions_id = m.Missions_id
      WHERE m.is_active = TRUE
        AND m.environment = p.exercise_place
        AND ABS(FIELD(m.difficulty, 'beginner', 'intermediate', 'advanced') - v_level) <= 1
        AND NOT EXISTS (
              SELECT 1 FROM Mission_tags mt JOIN Tags t ON t.tag_id = mt.Tags_tag_id
              WHERE mt.Missions_id = m.Missions_id
                AND ( (t.tag_type = 'avoid'  AND p.exercise_place = 'indoor' AND FIND_IN_SET(t.tag_name, p.avoid_motion) > 0)
                   OR (t.tag_type = 'strain' AND FIND_IN_SET(t.tag_name, p.body_limit)   > 0) ) )
    ) s
  ) r
  ORDER BY r.is_recent, r.type_rank, r.score DESC, r.last_date, r.rnd
  LIMIT 3;
END$$
DELIMITER ;
