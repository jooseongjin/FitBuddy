-- FitBuddy seed v1.3
USE fitbuddy;

INSERT INTO Tags (tag_name, tag_type) VALUES
('diet','goal'),
('muscle','goal'),
('stamina','goal'),
('jump','avoid'),
('prone','avoid'),
('knee_bend','avoid'),
('floor','avoid'),
('knee','strain'),
('back','strain'),
('shoulder','strain'),
('wrist','strain'),
('ankle','strain');

INSERT INTO Missions (title, description, exercise_type, environment, target_value, target_unit, difficulty, base_point) VALUES
('가벼운 전신 스트레칭','굳은 몸을 푸는 기본 스트레칭','stretching','indoor',10,'분','beginner',30),
('목·어깨 이완 스트레칭','거북목 완화 스트레칭','stretching','indoor',8,'분','beginner',30),
('하체 스트레칭 루틴','허벅지·종아리 늘리기','stretching','indoor',15,'분','intermediate',50),
('요가 플로우','호흡과 함께하는 요가','stretching','indoor',20,'분','advanced',80),
('맨몸 스쿼트','기본 스쿼트','strength','indoor',15,'회','beginner',40),
('무릎 푸시업','가벼운 상체 운동','strength','indoor',10,'회','beginner',40),
('플랭크','코어 버티기','strength','indoor',1,'분','beginner',40),
('푸시업','표준 푸시업','strength','indoor',20,'회','intermediate',60),
('런지','하체 근력 운동','strength','indoor',30,'회','intermediate',60),
('플랭크 챌린지','오래 버티는 코어 운동','strength','indoor',3,'분','advanced',90),
('버피 테스트','전신 근력·유산소','strength','indoor',30,'회','advanced',100),
('제자리 걷기','가볍게 몸 데우기','cardio','indoor',10,'분','beginner',30),
('스텝 박스 운동','리듬 있는 저강도 유산소','cardio','indoor',10,'분','beginner',35),
('점핑잭','전신 유산소','cardio','indoor',50,'회','intermediate',55),
('마운틴 클라이머','코어와 심폐 강화','cardio','indoor',3,'분','intermediate',60),
('하이니 러닝','제자리 고강도 달리기','cardio','indoor',20,'분','advanced',90),
('HIIT 서킷','고강도 인터벌','cardio','indoor',25,'분','advanced',110),
('줄넘기 흉내 운동','줄 없이 하는 줄넘기','cardio','indoor',15,'분','intermediate',60),
('가벼운 산책','동네를 천천히 걷기','cardio','outdoor',20,'분','beginner',30),
('빠르게 걷기','숨이 약간 찰 정도로 걷기','cardio','outdoor',30,'분','beginner',40),
('공원 스트레칭','야외에서 몸 풀기','stretching','outdoor',10,'분','beginner',30),
('공원 스쿼트','야외 맨몸 스쿼트','strength','outdoor',15,'회','beginner',40),
('가벼운 조깅','편한 속도로 달리기','cardio','outdoor',20,'분','intermediate',60),
('인터벌 걷기·뛰기','걷기와 뛰기를 번갈아','cardio','outdoor',25,'분','intermediate',65),
('계단 오르기','계단으로 하체 강화','strength','outdoor',15,'분','intermediate',60),
('벤치 푸시업','공원 벤치를 이용한 푸시업','strength','outdoor',20,'회','intermediate',60),
('러닝','꾸준히 달리기','cardio','outdoor',40,'분','advanced',100),
('언덕 달리기 인터벌','언덕을 반복해서 달리기','cardio','outdoor',30,'분','advanced',110),
('야외 근력 서킷','야외 맨몸 근력 서킷','strength','outdoor',30,'분','advanced',110);

INSERT INTO Mission_tags (Missions_id, Tags_tag_id)
SELECT m.Missions_id, t.tag_id FROM (
SELECT '가벼운 전신 스트레칭' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '목·어깨 이완 스트레칭' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '하체 스트레칭 루틴' AS ttl, 'diet' AS tg
 UNION ALL SELECT '하체 스트레칭 루틴' AS ttl, 'floor' AS tg
 UNION ALL SELECT '요가 플로우' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '요가 플로우' AS ttl, 'floor' AS tg
 UNION ALL SELECT '요가 플로우' AS ttl, 'prone' AS tg
 UNION ALL SELECT '요가 플로우' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '요가 플로우' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '맨몸 스쿼트' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '맨몸 스쿼트' AS ttl, 'knee_bend' AS tg
 UNION ALL SELECT '맨몸 스쿼트' AS ttl, 'knee' AS tg
 UNION ALL SELECT '무릎 푸시업' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '무릎 푸시업' AS ttl, 'prone' AS tg
 UNION ALL SELECT '무릎 푸시업' AS ttl, 'floor' AS tg
 UNION ALL SELECT '무릎 푸시업' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '무릎 푸시업' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '플랭크' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '플랭크' AS ttl, 'prone' AS tg
 UNION ALL SELECT '플랭크' AS ttl, 'floor' AS tg
 UNION ALL SELECT '플랭크' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '플랭크' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '플랭크' AS ttl, 'back' AS tg
 UNION ALL SELECT '푸시업' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '푸시업' AS ttl, 'prone' AS tg
 UNION ALL SELECT '푸시업' AS ttl, 'floor' AS tg
 UNION ALL SELECT '푸시업' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '푸시업' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '런지' AS ttl, 'diet' AS tg
 UNION ALL SELECT '런지' AS ttl, 'knee_bend' AS tg
 UNION ALL SELECT '런지' AS ttl, 'knee' AS tg
 UNION ALL SELECT '런지' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '플랭크 챌린지' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '플랭크 챌린지' AS ttl, 'prone' AS tg
 UNION ALL SELECT '플랭크 챌린지' AS ttl, 'floor' AS tg
 UNION ALL SELECT '플랭크 챌린지' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '플랭크 챌린지' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '플랭크 챌린지' AS ttl, 'back' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'diet' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'jump' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'prone' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'floor' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'knee_bend' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'knee' AS tg
 UNION ALL SELECT '버피 테스트' AS ttl, 'back' AS tg
 UNION ALL SELECT '제자리 걷기' AS ttl, 'diet' AS tg
 UNION ALL SELECT '스텝 박스 운동' AS ttl, 'diet' AS tg
 UNION ALL SELECT '스텝 박스 운동' AS ttl, 'knee' AS tg
 UNION ALL SELECT '점핑잭' AS ttl, 'diet' AS tg
 UNION ALL SELECT '점핑잭' AS ttl, 'jump' AS tg
 UNION ALL SELECT '점핑잭' AS ttl, 'knee' AS tg
 UNION ALL SELECT '점핑잭' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '마운틴 클라이머' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '마운틴 클라이머' AS ttl, 'prone' AS tg
 UNION ALL SELECT '마운틴 클라이머' AS ttl, 'floor' AS tg
 UNION ALL SELECT '마운틴 클라이머' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '마운틴 클라이머' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '하이니 러닝' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '하이니 러닝' AS ttl, 'jump' AS tg
 UNION ALL SELECT '하이니 러닝' AS ttl, 'knee' AS tg
 UNION ALL SELECT '하이니 러닝' AS ttl, 'ankle' AS tg
 UNION ALL SELECT 'HIIT 서킷' AS ttl, 'diet' AS tg
 UNION ALL SELECT 'HIIT 서킷' AS ttl, 'jump' AS tg
 UNION ALL SELECT 'HIIT 서킷' AS ttl, 'prone' AS tg
 UNION ALL SELECT 'HIIT 서킷' AS ttl, 'knee_bend' AS tg
 UNION ALL SELECT 'HIIT 서킷' AS ttl, 'knee' AS tg
 UNION ALL SELECT 'HIIT 서킷' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '줄넘기 흉내 운동' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '줄넘기 흉내 운동' AS ttl, 'jump' AS tg
 UNION ALL SELECT '줄넘기 흉내 운동' AS ttl, 'knee' AS tg
 UNION ALL SELECT '줄넘기 흉내 운동' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '가벼운 산책' AS ttl, 'diet' AS tg
 UNION ALL SELECT '빠르게 걷기' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '공원 스트레칭' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '공원 스쿼트' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '공원 스쿼트' AS ttl, 'knee' AS tg
 UNION ALL SELECT '가벼운 조깅' AS ttl, 'diet' AS tg
 UNION ALL SELECT '가벼운 조깅' AS ttl, 'knee' AS tg
 UNION ALL SELECT '가벼운 조깅' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '인터벌 걷기·뛰기' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '인터벌 걷기·뛰기' AS ttl, 'knee' AS tg
 UNION ALL SELECT '인터벌 걷기·뛰기' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '계단 오르기' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '계단 오르기' AS ttl, 'knee' AS tg
 UNION ALL SELECT '계단 오르기' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '벤치 푸시업' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '벤치 푸시업' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '벤치 푸시업' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '러닝' AS ttl, 'stamina' AS tg
 UNION ALL SELECT '러닝' AS ttl, 'knee' AS tg
 UNION ALL SELECT '러닝' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '언덕 달리기 인터벌' AS ttl, 'diet' AS tg
 UNION ALL SELECT '언덕 달리기 인터벌' AS ttl, 'knee' AS tg
 UNION ALL SELECT '언덕 달리기 인터벌' AS ttl, 'ankle' AS tg
 UNION ALL SELECT '야외 근력 서킷' AS ttl, 'muscle' AS tg
 UNION ALL SELECT '야외 근력 서킷' AS ttl, 'wrist' AS tg
 UNION ALL SELECT '야외 근력 서킷' AS ttl, 'shoulder' AS tg
 UNION ALL SELECT '야외 근력 서킷' AS ttl, 'knee' AS tg
) x JOIN Missions m ON m.title=x.ttl JOIN Tags t ON t.tag_name=x.tg;

INSERT INTO Customization_items (item_name, category, unlock_type, price_point, grade, image_key) VALUES
('기본 운동복','outfit','free',0,'common','item_01'),
('초록 후드','outfit','free',300,'common','item_02'),
('스포티 저지','outfit','free',800,'rare','item_03'),
('헤어밴드','accessory','free',200,'common','item_04'),
('스마트워치','accessory','free',700,'rare','item_05'),
('황금 왕관','accessory','premium',2000,'epic','item_06'),
('불꽃 오라','effect','premium',2500,'epic','item_07'),
('반짝 별가루','effect','free',600,'rare','item_08'),
('무지개 날개','effect','premium',5000,'legendary','item_09'),
('전설의 챔피언 슈트','outfit','premium',6000,'legendary','item_10');

INSERT INTO Rewards (reward_name, required_point, stock, is_premium_only) VALUES
('커피 쿠폰 응모',1000,50,FALSE),
('운동 보틀 교환',3000,10,FALSE),
('프리미엄 단백질 세트 응모',4000,5,TRUE),
('헬스 용품 교환권',6000,3,TRUE);
