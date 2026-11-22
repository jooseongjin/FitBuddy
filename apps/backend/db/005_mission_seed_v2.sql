-- FitBuddy 미션 데이터 보강 v2 (추천 엔진 v2와 함께 적용)
-- 목적: 야외(11개) 사용자와 제한(피할 동작·불편 부위)이 많은 사용자도
--       7일 연속으로 하루 3개씩 서로 다른 미션을 받을 수 있도록 후보를 늘린다.
-- 기존 테이블·데이터는 변경하지 않고 추가만 한다.
-- 같은 제목의 미션이 이미 있으면 건너뛰므로 여러 번 실행해도 안전하다.
USE fitbuddy;

INSERT INTO Missions (title, description, exercise_type, environment, target_value, target_unit, difficulty, base_point)
SELECT x.title, x.description, x.exercise_type, x.environment, x.target_value, x.target_unit, x.difficulty, x.base_point
FROM (
            SELECT '공원 벤치 스트레칭' AS title, '벤치를 잡고 하는 전신 스트레칭' AS description, 'stretching' AS exercise_type, 'outdoor' AS environment, 10 AS target_value, '분' AS target_unit, 'beginner' AS difficulty, 30 AS base_point
  UNION ALL SELECT '종아리·발목 풀기', '걷기 전후 하체 이완', 'stretching', 'outdoor', 8, '분', 'beginner', 30
  UNION ALL SELECT '산책 후 쿨다운 스트레칭', '걷고 난 뒤 천천히 몸 정리하기', 'stretching', 'outdoor', 10, '분', 'beginner', 30
  UNION ALL SELECT '벤치 스텝업', '벤치에 한 발씩 오르내리기', 'strength', 'outdoor', 20, '회', 'beginner', 40
  UNION ALL SELECT '야외 하체 스트레칭', '허벅지 뒤·엉덩이 늘리기', 'stretching', 'outdoor', 15, '분', 'intermediate', 50
  UNION ALL SELECT '워킹 런지', '앞으로 걸으며 하는 런지', 'strength', 'outdoor', 20, '회', 'intermediate', 60
  UNION ALL SELECT '벤치 딥스', '벤치를 이용한 팔 뒤쪽 운동', 'strength', 'outdoor', 12, '회', 'intermediate', 60
  UNION ALL SELECT '파워 워킹', '팔을 크게 흔들며 빠르게 걷기', 'cardio', 'outdoor', 40, '분', 'intermediate', 60
  UNION ALL SELECT '자전거 타기', '편한 속도로 자전거 타기', 'cardio', 'outdoor', 30, '분', 'intermediate', 65
  UNION ALL SELECT '야외 요가', '공원에서 하는 요가 플로우', 'stretching', 'outdoor', 20, '분', 'advanced', 80
  UNION ALL SELECT '철봉 매달리기 세트', '철봉에 매달려 버티기 반복', 'strength', 'outdoor', 3, '분', 'advanced', 90
  UNION ALL SELECT '장거리 걷기', '한 시간 동안 꾸준히 걷기', 'cardio', 'outdoor', 60, '분', 'advanced', 90
  UNION ALL SELECT '스프린트 인터벌', '짧게 전력 질주 후 걷기 반복', 'cardio', 'outdoor', 20, '분', 'advanced', 110
  UNION ALL SELECT '앉아서 상체 스트레칭', '의자에 앉아 목·어깨·허리 풀기', 'stretching', 'indoor', 10, '분', 'beginner', 30
  UNION ALL SELECT '벽 푸시업', '벽을 짚고 하는 가벼운 푸시업', 'strength', 'indoor', 15, '회', 'beginner', 40
  UNION ALL SELECT '스탠딩 크런치', '서서 무릎과 팔꿈치 모으기', 'strength', 'indoor', 20, '회', 'beginner', 40
  UNION ALL SELECT '까치발 들기', '종아리 근력 운동(카프 레이즈)', 'strength', 'indoor', 30, '회', 'beginner', 35
  UNION ALL SELECT '팔 돌리기 워밍업', '어깨를 크게 돌려 몸 데우기', 'stretching', 'indoor', 5, '분', 'beginner', 25
  UNION ALL SELECT '실내 빠르게 걷기', '집 안이나 복도에서 빠르게 걷기', 'cardio', 'indoor', 20, '분', 'intermediate', 50
  UNION ALL SELECT '섀도 복싱', '제자리에서 펀치 동작 반복', 'cardio', 'indoor', 10, '분', 'intermediate', 55
) x
WHERE NOT EXISTS (SELECT 1 FROM Missions m WHERE m.title = x.title);

-- 태그: goal(목표), avoid(피할 동작, 실내만 적용), strain(부담 주는 부위)
INSERT IGNORE INTO Mission_tags (Missions_id, Tags_tag_id)
SELECT m.Missions_id, t.tag_id FROM (
            SELECT '공원 벤치 스트레칭' AS ttl, 'stamina' AS tg
  UNION ALL SELECT '종아리·발목 풀기', 'diet'
  UNION ALL SELECT '산책 후 쿨다운 스트레칭', 'stamina'
  UNION ALL SELECT '벤치 스텝업', 'muscle'
  UNION ALL SELECT '벤치 스텝업', 'knee'
  UNION ALL SELECT '야외 하체 스트레칭', 'diet'
  UNION ALL SELECT '워킹 런지', 'muscle'
  UNION ALL SELECT '워킹 런지', 'knee'
  UNION ALL SELECT '워킹 런지', 'ankle'
  UNION ALL SELECT '벤치 딥스', 'muscle'
  UNION ALL SELECT '벤치 딥스', 'wrist'
  UNION ALL SELECT '벤치 딥스', 'shoulder'
  UNION ALL SELECT '파워 워킹', 'diet'
  UNION ALL SELECT '자전거 타기', 'stamina'
  UNION ALL SELECT '자전거 타기', 'knee'
  UNION ALL SELECT '야외 요가', 'stamina'
  UNION ALL SELECT '야외 요가', 'wrist'
  UNION ALL SELECT '야외 요가', 'shoulder'
  UNION ALL SELECT '철봉 매달리기 세트', 'muscle'
  UNION ALL SELECT '철봉 매달리기 세트', 'shoulder'
  UNION ALL SELECT '철봉 매달리기 세트', 'wrist'
  UNION ALL SELECT '장거리 걷기', 'diet'
  UNION ALL SELECT '장거리 걷기', 'ankle'
  UNION ALL SELECT '스프린트 인터벌', 'diet'
  UNION ALL SELECT '스프린트 인터벌', 'knee'
  UNION ALL SELECT '스프린트 인터벌', 'ankle'
  UNION ALL SELECT '앉아서 상체 스트레칭', 'stamina'
  UNION ALL SELECT '벽 푸시업', 'muscle'
  UNION ALL SELECT '벽 푸시업', 'shoulder'
  UNION ALL SELECT '스탠딩 크런치', 'diet'
  UNION ALL SELECT '까치발 들기', 'muscle'
  UNION ALL SELECT '까치발 들기', 'ankle'
  UNION ALL SELECT '팔 돌리기 워밍업', 'stamina'
  UNION ALL SELECT '팔 돌리기 워밍업', 'shoulder'
  UNION ALL SELECT '실내 빠르게 걷기', 'diet'
  UNION ALL SELECT '섀도 복싱', 'stamina'
  UNION ALL SELECT '섀도 복싱', 'shoulder'
) x JOIN Missions m ON m.title = x.ttl JOIN Tags t ON t.tag_name = x.tg;
