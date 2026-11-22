import React from 'react';
import { ChevronRight, Moon } from 'lucide-react';

/**
 * Streak 위험 배너 (UI 11)
 * 표시 여부는 shouldShowRiskBanner()로 판단 (유지 중 + 오늘 미완료 + KST 20시 이후)
 */
export const StreakRiskBanner: React.FC<{ days: number; onGoMissions: () => void }> = ({ days, onGoMissions }) => (
  <div
    role="alert"
    className="flex items-center gap-2 rounded-xl border border-orange-200 bg-[#FFF1E6] px-3 py-2.5"
  >
    <Moon size={16} className="shrink-0 text-orange-500" aria-hidden="true" />
    <p className="flex-1 min-w-0 text-xs font-bold text-orange-600 leading-snug">
      오늘 미션을 하지 않으면 {days}일 연속 기록이 끊겨요
    </p>
    <button
      type="button"
      onClick={onGoMissions}
      className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-orange-500 pl-2.5 pr-1.5 py-1 text-[11px] font-bold text-white cursor-pointer hover:brightness-95"
    >
      미션 하러 가기
      <ChevronRight size={12} aria-hidden="true" />
    </button>
  </div>
);
