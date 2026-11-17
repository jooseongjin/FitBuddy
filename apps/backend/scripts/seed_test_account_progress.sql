-- 로컬 개발용 테스트 계정 시연 데이터. 배포 DB에서는 절대 실행하지 말 것.
-- 수동 실행: mysql -u <user> -p fitbuddy < scripts/seed_test_account_progress.sql
-- 최근 6일 하루 1개 미션 완료, 현재 6일 연속 기록, 미션 원장 기준 약 200 FitPoint
USE fitbuddy;

INSERT IGNORE INTO User_missions
  (Missions_id, Users_user_number, mission_status, assigned_date, assigned_at, completed_at)
SELECT m.Missions_id, u.user_number, 'completed',
       DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL d.days_ago DAY),
       DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL d.days_ago DAY) + INTERVAL 12 HOUR,
       DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL d.days_ago DAY) + INTERVAL 12 HOUR
  FROM (
    SELECT 6 AS days_ago, '가벼운 전신 스트레칭' AS title
    UNION ALL SELECT 5, '제자리 걷기'
    UNION ALL SELECT 4, '벽 푸시업'
    UNION ALL SELECT 3, '가벼운 전신 스트레칭'
    UNION ALL SELECT 2, '제자리 걷기'
    UNION ALL SELECT 1, '벽 푸시업'
  ) AS d
  JOIN Missions AS m ON m.title = d.title
  JOIN Users AS u ON u.user_id = 'testuser01';

UPDATE User_missions AS um
JOIN Users AS u ON u.user_number = um.Users_user_number
JOIN Missions AS m ON m.Missions_id = um.Missions_id
SET um.mission_status = 'completed',
    um.completed_at = COALESCE(um.completed_at, um.assigned_at)
WHERE u.user_id = 'testuser01'
  AND um.assigned_date BETWEEN DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL 6 DAY)
                           AND DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL 1 DAY)
  AND m.title IN ('가벼운 전신 스트레칭', '제자리 걷기', '벽 푸시업');

INSERT INTO Point_transactions
  (Users_user_number, source, ref_id, base_point, multiplier, amount, created_at)
SELECT um.Users_user_number, 'mission_complete', um.user_mission_id,
       m.base_point, 1.00, m.base_point, um.completed_at
  FROM User_missions AS um
  JOIN Users AS u ON u.user_number = um.Users_user_number
  JOIN Missions AS m ON m.Missions_id = um.Missions_id
 WHERE u.user_id = 'testuser01'
   AND um.mission_status = 'completed'
   AND um.assigned_date BETWEEN DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL 6 DAY)
                            AND DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL 1 DAY)
   AND m.title IN ('가벼운 전신 스트레칭', '제자리 걷기', '벽 푸시업')
   AND NOT EXISTS (
     SELECT 1 FROM Point_transactions AS pt
      WHERE pt.Users_user_number = um.Users_user_number
        AND pt.source = 'mission_complete'
        AND pt.ref_id = um.user_mission_id
   );

UPDATE `Characters` AS c
JOIN Users AS u ON u.user_number = c.Users_user_number
   SET c.total_earned_xp = (
     SELECT COALESCE(SUM(pt.amount), 0)
       FROM Point_transactions AS pt
      WHERE pt.Users_user_number = u.user_number AND pt.source = 'mission_complete'
   )
 WHERE u.user_id = 'testuser01';

UPDATE Streaks AS s
JOIN Users AS u ON u.user_number = s.Users_user_number
   SET s.current_streak = 6,
       s.last_completed_date = DATE_SUB(DATE(UTC_TIMESTAMP() + INTERVAL 9 HOUR), INTERVAL 1 DAY)
 WHERE u.user_id = 'testuser01'
   AND s.current_streak = 0
   AND s.last_completed_date IS NULL;