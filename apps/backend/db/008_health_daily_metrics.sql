-- HealthKit / Health Connect 일별 요약과 미션 진행값
USE fitbuddy;

ALTER TABLE User_missions
  ADD COLUMN progress_value INT UNSIGNED NOT NULL DEFAULT 0 AFTER mission_status;

CREATE TABLE Health_daily_summaries (
  Users_user_number INT UNSIGNED NOT NULL,
  metric_date DATE NOT NULL,
  steps INT UNSIGNED NOT NULL DEFAULT 0,
  active_calories INT UNSIGNED NOT NULL DEFAULT 0,
  exercise_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  source ENUM('healthkit','health_connect') NOT NULL,
  synced_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (Users_user_number, metric_date),
  CONSTRAINT fk_health_summary_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;