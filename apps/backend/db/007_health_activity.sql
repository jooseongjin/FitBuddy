-- FitBuddy 건강 데이터 연동·미션 인증 테이블 (모바일 앱 + OS 헬스허브 연동용)
--
-- 흐름: 워치/폰 → OS 헬스허브(Android Health Connect / iOS HealthKit) → FitBuddy 앱 → 서버(이 테이블)
-- 목적: (1) 대시보드의 걸음 수·운동 시간·칼로리를 실제 값으로 표시
--       (2) 미션 완료를 측정 데이터로 인증해 부정 완료(직접 입력, 기록 재사용)를 줄임
--
-- 기존 테이블은 변경하지 않고 새 테이블 5개만 추가한다. 여러 번 실행해도 안전하다(IF NOT EXISTS, INSERT IGNORE).
-- Android/iOS 어느 쪽을 선택해도 그대로 쓸 수 있도록 platform 값으로 구분한다.
USE fitbuddy;

-- 1) 사용자의 헬스허브 연결 상태 (권한 허용 여부, 마지막 동기화 시각)
CREATE TABLE IF NOT EXISTS Health_connections (
  connection_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  platform          ENUM('health_connect','healthkit') NOT NULL,   -- Android / iOS
  conn_status       ENUM('connected','revoked') NOT NULL DEFAULT 'connected',
  connected_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at    DATETIME NULL,                                 -- 다음 동기화는 이 시각 이후 기록만 전송
  PRIMARY KEY (connection_id),
  UNIQUE KEY uq_hc_user_platform (Users_user_number, platform),
  CONSTRAINT fk_hc_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

-- 2) 헬스허브에서 가져온 원본 기록 (걸음, 운동 세션 등)
CREATE TABLE IF NOT EXISTS Activity_records (
  record_id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  Users_user_number INT UNSIGNED NOT NULL,
  platform          ENUM('health_connect','healthkit') NOT NULL,
  external_id       VARCHAR(100) NOT NULL,          -- 헬스허브가 부여한 기록 ID (재전송·재사용 차단 기준)
  record_type       ENUM('steps','exercise','calories','distance') NOT NULL,
  exercise_type     VARCHAR(30) NULL,               -- record_type='exercise' 일 때: walking, running, yoga 등
  value             DECIMAL(10,2) NOT NULL,
  unit              ENUM('count','min','kcal','m') NOT NULL,   -- 걸음 수 / 분 / kcal / 미터
  start_at          DATETIME NOT NULL,              -- KST
  end_at            DATETIME NOT NULL,              -- KST
  source_app        VARCHAR(100) NULL,              -- 기록을 만든 앱 (예: com.sec.android.app.shealth)
  device_type       ENUM('watch','phone','other','unknown') NOT NULL DEFAULT 'unknown',
  recording_method  ENUM('automatic','active','manual','unknown') NOT NULL DEFAULT 'unknown',
                                                    -- automatic: 센서 자동 측정, active: 사용자가 시작한 운동 측정, manual: 직접 입력
  -- 인증에 쓸 수 있는 기록인지: 센서가 측정한 기록만 신뢰 (직접 입력·출처 불명은 제외). 서버 코드가 아닌 DB가 계산
  is_trusted        TINYINT(1) GENERATED ALWAYS AS (recording_method IN ('automatic','active')) STORED,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (record_id),
  UNIQUE KEY uq_ar_external (platform, external_id),            -- 같은 기록을 두 번(또는 다른 계정으로) 올릴 수 없음
  KEY idx_ar_user_type_start (Users_user_number, record_type, start_at),
  CONSTRAINT fk_ar_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

-- 3) 하루 단위 합계 (대시보드 조회용. 원본 기록을 매번 합산하지 않도록 동기화 때 갱신)
CREATE TABLE IF NOT EXISTS Daily_activity (
  Users_user_number INT UNSIGNED NOT NULL,
  activity_date     DATE NOT NULL,                  -- KST 날짜
  steps             INT UNSIGNED NOT NULL DEFAULT 0,   -- 전체 걸음 수 (화면 표시용)
  verified_steps    INT UNSIGNED NOT NULL DEFAULT 0,   -- 신뢰 기록(is_trusted)만 합한 걸음 수 (미션 인증용)
  active_minutes    INT UNSIGNED NOT NULL DEFAULT 0,   -- 운동 시간(분)
  calories_kcal     INT UNSIGNED NOT NULL DEFAULT 0,
  distance_m        INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (Users_user_number, activity_date),
  CONSTRAINT fk_da_user FOREIGN KEY (Users_user_number) REFERENCES Users (user_number)
) ENGINE=InnoDB;

-- 4) 미션별 인증 기준 (행이 없는 미션은 측정 데이터로 인증할 수 없는 미션 → 수동 완료만 가능)
CREATE TABLE IF NOT EXISTS Mission_verify_rules (
  Missions_id INT UNSIGNED NOT NULL,
  metric      ENUM('steps','exercise_minutes') NOT NULL,   -- 그날 걸음 수 / 운동 세션 시간(분)
  min_value   INT UNSIGNED NOT NULL,                       -- 이 값 이상이면 인증
  PRIMARY KEY (Missions_id),
  CONSTRAINT fk_mvr_mission FOREIGN KEY (Missions_id) REFERENCES Missions (Missions_id)
) ENGINE=InnoDB;

-- 5) 미션 인증 결과 (배정된 미션 1건당 1행)
CREATE TABLE IF NOT EXISTS Mission_verifications (
  verification_id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  User_missions_user_mission_id INT UNSIGNED NOT NULL,
  verify_status     ENUM('verified','unverified','rejected') NOT NULL,
                    -- verified: 측정 데이터로 인증 / unverified: 데이터 없이 수동 완료(보상 감액) / rejected: 조건 미달·부정 의심
  metric            ENUM('steps','exercise_minutes') NULL,
  measured_value    INT UNSIGNED NULL,              -- 실제 측정값
  required_value    INT UNSIGNED NULL,              -- 인증 기준값
  Activity_records_record_id BIGINT UNSIGNED NULL,  -- 인증에 사용한 운동 기록 (운동 세션 1건은 미션 1건에만 사용)
  reject_reason     VARCHAR(30) NULL,               -- insufficient, manual_entry, out_of_window, no_data
  reward_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,   -- 보상 배율: verified 1.00, unverified 0.50, rejected 0.00
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (verification_id),
  UNIQUE KEY uq_mv_user_mission (User_missions_user_mission_id),
  UNIQUE KEY uq_mv_record (Activity_records_record_id),
  CONSTRAINT fk_mv_user_mission FOREIGN KEY (User_missions_user_mission_id) REFERENCES User_missions (user_mission_id),
  CONSTRAINT fk_mv_record FOREIGN KEY (Activity_records_record_id) REFERENCES Activity_records (record_id)
) ENGINE=InnoDB;

-- 인증 기준 데이터
-- 걷기 미션: 걸음 수로 인증 (워치·폰이 자동 측정하므로 사용자가 운동 기록을 따로 시작하지 않아도 됨). 1분 ≈ 100걸음
INSERT IGNORE INTO Mission_verify_rules (Missions_id, metric, min_value)
SELECT m.Missions_id, 'steps', m.target_value * 100
  FROM Missions m
 WHERE m.target_unit = '분'
   AND m.title IN ('제자리 걷기', '실내 빠르게 걷기', '가벼운 산책', '빠르게 걷기', '파워 워킹', '장거리 걷기');

-- 그 밖의 시간(분) 단위 미션: 운동 세션 시간으로 인증
INSERT IGNORE INTO Mission_verify_rules (Missions_id, metric, min_value)
SELECT m.Missions_id, 'exercise_minutes', m.target_value
  FROM Missions m
 WHERE m.target_unit = '분';
-- 횟수(회) 단위 미션(스쿼트, 푸시업 등)은 헬스허브로 횟수를 측정할 수 없어 기준을 두지 않는다.
