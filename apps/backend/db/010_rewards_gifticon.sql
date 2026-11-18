-- 010: 기프티콘 즉시 교환용 Rewards 확장 (실제 기업 연동 없이 예시 이미지로 대체)
-- 주의: ALTER TABLE 이 포함되어 있어 같은 DB에 두 번 적용하면 실패한다. 배포 DB에는 한 번만 적용한다.
--   npm run migrate -- --from 10
ALTER TABLE Rewards ADD COLUMN image_key VARCHAR(100) NULL AFTER is_active;

-- 기존 샘플 상품(응모형·실물)은 즉시 교환 방식과 맞지 않아 숨긴다 (삭제하지 않으므로 필요하면 is_active 를 다시 켠다)
UPDATE Rewards SET is_active = FALSE WHERE image_key IS NULL;

-- 클라이언트는 image_key 로 /gifticons/<image_key>.svg 예시 이미지를 연결한다
INSERT INTO Rewards (reward_name, required_point, stock, is_premium_only, is_active, image_key) VALUES
('올리브영 상품권 5,000원', 3000, 50, FALSE, TRUE, 'gifticon_oliveyoung_5000'),
('배민 상품권 5,000원',     3000, 50, FALSE, TRUE, 'gifticon_baemin_5000');
