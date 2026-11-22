// ⚠ 임시 값 (MOCK) — 백엔드와 협의되지 않은 정책을 화면에서 확인하기 위한 예시 값입니다.
// 실제 정책이 아니며, 서버 연동 시 이 파일의 값은 사용되지 않습니다. (설계서 1.4, 2.2)
//   B2 레벨별 필요 XP·최대 레벨 / B3 XP 지급 기준 / B7 복구 비용 / B8 월 복구 횟수·무료 횟수

import type { RepairPolicy } from '../domain/streakRules.ts';

/** (i + 1)레벨이 되는 누적 XP — 임시: 50 × i × (i + 1), 최대 20레벨 */
const MOCK_LEVEL_XP_TABLE: readonly number[] = Array.from({ length: 20 }, (_, i) => 50 * i * (i + 1));

export const MOCK_POLICY = {
  levelXpTable: MOCK_LEVEL_XP_TABLE,
  /** 미션 1회 기본 포인트 (임시) */
  missionBasePoint: 120,
  /** Premium 포인트 배율 — 기존 complete.js 코드와 같은 1.5 */
  premiumMultiplier: 1.5,
  /** XP = 적립 포인트 (기존 complete.js 방식, 배율 포함 여부는 B3에서 확인 필요) */
  xpEqualsEarnedPoint: true,
  repair: {
    // 백엔드 기본값과 같게: 비용 300 FP, 월 무료·FitPoint 복구 Basic 1+1회 / Premium 2+2회
    costPoints: 300,
    monthlyLimit: { basic: { free: 1, points: 1 }, premium: { free: 2, points: 2 } },
  } satisfies RepairPolicy,
  /** Premium 모의 결제 — 백엔드 기본값과 같게: 4,900원 / 30일 */
  subscription: { price: 4900, periodDays: 30 },
  /** 기프티콘 — 백엔드 마이그레이션 010과 같은 상품 2개 (예시 이미지) */
  rewards: [
    { id: 101, name: '올리브영 상품권 5,000원', requiredPoint: 3000, stock: 50, premiumOnly: false, imageKey: 'gifticon_oliveyoung_5000' },
    { id: 102, name: '배민 상품권 5,000원', requiredPoint: 3000, stock: 50, premiumOnly: false, imageKey: 'gifticon_baemin_5000' },
  ],
} as const;

/** 화면에 "임시 값" 표시를 붙일 때 쓰는 안내 문구 */
export const MOCK_VALUE_NOTE = '임시 값 · 백엔드 협의 전';
