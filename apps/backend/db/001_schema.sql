-- FitBuddy MySQL 8.x (InnoDB, utf8mb4) schema v1.3
-- 시간: DATETIME은 KST 기준으로 앱에서 저장/해석, DATE는 KST 날짜
-- 주의: 기존 fitbuddy DB를 삭제하고 새로 만든다 (개발용)
DROP DATABASE IF EXISTS fitbuddy;
CREATE DATABASE fitbuddy DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE fitbuddy;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE Users (
  user_number   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       VARCHAR(30)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  nickname      VARCHAR(16)  NOT NULL,
  user_status   ENUM('active','withdrawn') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_number),
  UNIQUE KEY uq_users_user_id (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE Onboarding_profiles (
  profile_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number   INT UNSIGNED NOT NULL,
  goal                ENUM('diet','muscle','stamina') NOT NULL,
  exercise_experience ENUM('none','monthly','weekly','daily') NOT NULL,   -- 없음 / 월1~2회 / 주1회 / 매일
  exercise_place      ENUM('indoor','outdoor') NOT NULL,
  avoid_motion        SET('jump','prone','knee_bend','floor') NOT NULL DEFAULT '',   -- 실내만 해당, '' = 없음
  body_limit          SET('knee','back','shoulder','wrist','ankle') NOT NULL DEFAULT '', -- 운동에 지장 있는 부위, '' = 없음
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id),
  UNIQUE KEY uq_profile_user (Users_user_number),
  CONSTRAINT fk_profile_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE Missions (
  Missions_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(100) NOT NULL,
  description   TEXT NULL,
  exercise_type ENUM('strength','cardio','stretching') NOT NULL,
  environment   ENUM('indoor','outdoor') NOT NULL DEFAULT 'indoor',
  target_value  INT UNSIGNED NOT NULL,
  target_unit   VARCHAR(10) NOT NULL,           -- 분, 회
  difficulty    ENUM('beginner','intermediate','advanced') NOT NULL,
  base_point    INT UNSIGNED NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Missions_id),
  KEY idx_missions_active_diff (is_active, difficulty)
) ENGINE=InnoDB;

CREATE TABLE Tags (
  tag_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tag_name VARCHAR(30) NOT NULL,
  tag_type ENUM('goal','avoid','strain') NOT NULL,
  PRIMARY KEY (tag_id),
  UNIQUE KEY uq_tags_name (tag_name)
) ENGINE=InnoDB;

CREATE TABLE Mission_tags (
  Missions_id   INT UNSIGNED NOT NULL,
  Tags_tag_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (Missions_id, Tags_tag_id),
  KEY idx_mt_tag (Tags_tag_id),
  CONSTRAINT fk_mt_mission FOREIGN KEY (Missions_id) REFERENCES Missions (Missions_id),
  CONSTRAINT fk_mt_tag FOREIGN KEY (Tags_tag_id) REFERENCES Tags (tag_id)
) ENGINE=InnoDB;

CREATE TABLE User_missions (
  user_mission_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Missions_id       INT UNSIGNED NOT NULL,
  Users_user_number INT UNSIGNED NOT NULL,
  mission_status    ENUM('assigned','completed') NOT NULL DEFAULT 'assigned',
  assigned_date     DATE NOT NULL,
  assigned_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at      DATETIME NULL,
  PRIMARY KEY (user_mission_id),
  UNIQUE KEY uq_um_user_mission_date (Users_user_number, Missions_id, assigned_date), -- 배치 멱등성
  KEY idx_um_user_date (Users_user_number, assigned_date),
  CONSTRAINT fk_um_mission FOREIGN KEY (Missions_id) REFERENCES Missions (Missions_id),
  CONSTRAINT fk_um_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE Point_transactions (
  transaction_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  source            ENUM('mission_complete','streak_repair','shop_purchase','reward_redeem') NOT NULL,
  ref_id            INT UNSIGNED NULL,            -- 논리 참조(FK 없음)
  base_point        INT UNSIGNED NULL,
  multiplier        DECIMAL(3,2) NULL,
  amount            INT NOT NULL,                 -- 적립 +, 사용 −
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (transaction_id),
  KEY idx_pt_user_created (Users_user_number, created_at),
  CONSTRAINT fk_pt_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE `Characters` (
  character_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  level             INT UNSIGNED NOT NULL DEFAULT 1,
  total_earned_xp   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (character_id),
  UNIQUE KEY uq_char_user (Users_user_number),
  CONSTRAINT fk_char_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE Customization_items (
  item_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_name   VARCHAR(100) NOT NULL,
  category    ENUM('outfit','accessory','effect') NOT NULL,
  unlock_type ENUM('free','premium') NOT NULL,
  price_point INT UNSIGNED NOT NULL DEFAULT 0,
  grade       ENUM('common','rare','epic','legendary') NOT NULL,
  image_key   VARCHAR(100) NOT NULL,              -- FE 에셋 키
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (item_id)
) ENGINE=InnoDB;

CREATE TABLE User_inventory (
  Customization_items_item_id INT UNSIGNED NOT NULL,
  Users_user_number           INT UNSIGNED NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Customization_items_item_id, Users_user_number),
  KEY idx_inv_user (Users_user_number),
  CONSTRAINT fk_inv_item FOREIGN KEY (Customization_items_item_id) REFERENCES Customization_items (item_id),
  CONSTRAINT fk_inv_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE Streaks (
  streak_id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number   INT UNSIGNED NOT NULL,
  current_streak      INT UNSIGNED NOT NULL DEFAULT 0,
  last_completed_date DATE NULL,
  PRIMARY KEY (streak_id),
  UNIQUE KEY uq_streak_user (Users_user_number),
  CONSTRAINT fk_streak_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

-- 신규: 복구 이력 (월 횟수 집계, Premium 무료 복구 포함)
CREATE TABLE Streak_repairs (
  repair_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  missed_date       DATE NOT NULL,                -- 복구 대상(D-1) 날짜
  repair_method     ENUM('points','free') NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (repair_id),
  UNIQUE KEY uq_repair_user_date (Users_user_number, missed_date),
  KEY idx_repair_user_created (Users_user_number, created_at),
  CONSTRAINT fk_repair_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE Subscriptions (
  subscriptions_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  plan       ENUM('basic','premium') NOT NULL DEFAULT 'basic',
  sub_status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  PRIMARY KEY (subscriptions_id),
  UNIQUE KEY uq_sub_user (Users_user_number),
  CONSTRAINT fk_sub_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

CREATE TABLE Payment_logs (
  payment_id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number             INT UNSIGNED NOT NULL,
  Subscriptions_subscriptions_id INT UNSIGNED NULL,
  amount          INT UNSIGNED NOT NULL,
  pay_status      ENUM('pending','success','failed') NOT NULL,
  pg_transaction_id VARCHAR(100) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_pay_user (Users_user_number),
  KEY idx_pay_sub (Subscriptions_subscriptions_id),
  CONSTRAINT fk_pay_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number),
  CONSTRAINT fk_pay_sub FOREIGN KEY (Subscriptions_subscriptions_id) REFERENCES Subscriptions (subscriptions_id)
) ENGINE=InnoDB;

CREATE TABLE Rewards (
  reward_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reward_name      VARCHAR(100) NOT NULL,
  required_point   INT UNSIGNED NOT NULL,
  stock            INT UNSIGNED NOT NULL DEFAULT 0,
  is_premium_only  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (reward_id)
) ENGINE=InnoDB;

CREATE TABLE Reward_redemptions (
  redemption_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  Rewards_reward_id INT UNSIGNED NOT NULL,
  redemption_type   ENUM('entry','exchange') NOT NULL,
  redemption_status ENUM('requested','completed','cancelled') NOT NULL DEFAULT 'requested',
  redeemed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (redemption_id),
  KEY idx_rr_user (Users_user_number),
  KEY idx_rr_reward (Rewards_reward_id),
  CONSTRAINT fk_rr_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number),
  CONSTRAINT fk_rr_reward FOREIGN KEY (Rewards_reward_id) REFERENCES Rewards (reward_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
