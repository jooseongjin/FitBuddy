import type { MissionStatus } from '../data/missions';

/** 미션 상태 배지 (홈·미션 목록 공용) */
export const MISSION_BADGE: Record<MissionStatus, { label: string; className: string }> = {
  in_progress: { label: '진행중', className: 'bg-emerald-100 text-emerald-700' },
  ready: { label: '보상 받기', className: 'bg-amber-100 text-amber-800' },
  done: { label: '완료됨', className: 'bg-gray-100 text-gray-500' },
};
