import React from 'react';
import { Flame } from 'lucide-react';

type StreakBadgeProps = {
  days: number;
  todayCompleted: boolean;
  isBroken: boolean;
  className?: string;
};

/**
 * Streak 배지 (UI 8)
 * 오늘 달성 = 불꽃 채움 / 오늘 미달성 = 불꽃 테두리 / 끊김·기록 없음 = 회색
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({ days, todayCompleted, isBroken, className = '' }) => {
  const off = isBroken || days === 0;
  const label = off ? '연속 기록 0일' : todayCompleted ? `${days}일 연속 · 오늘 완료` : `${days}일 연속 · 오늘 미션 남음`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${
        off ? 'bg-gray-100 text-gray-400' : 'bg-[#FFF1E6] text-orange-500'
      } ${className}`}
    >
      <Flame
        size={14}
        aria-hidden="true"
        className={todayCompleted && !off ? 'fill-orange-300' : ''}
      />
      {label}
    </span>
  );
};
