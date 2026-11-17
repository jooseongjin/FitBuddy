-- 미션별 일일 진행값. 007_health_activity.sql 다음에 1회만 적용한다.
USE fitbuddy;

ALTER TABLE User_missions
  ADD COLUMN progress_value INT UNSIGNED NOT NULL DEFAULT 0 AFTER mission_status;