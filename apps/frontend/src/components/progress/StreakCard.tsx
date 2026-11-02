import React from 'react';
import { Flame } from 'lucide-react';
import type { StreakState } from '../../api/progressTypes';
import { shouldShowRiskBanner } from '../../domain/streakRules';
import { RISK_BANNER_HOUR } from '../../config/progressConfig';
import { StreakBadge } from './StreakBadge';
import { WeekStrip } from './WeekStrip';
import { StreakRiskBanner } from './StreakRiskBanner';
import { StreakRepairNotice } from './StreakRepairNotice';
import { MockTag } from './MockTag';

type StreakCardProps = {
  streak: StreakState;
  isMock: boolean;
  onOpenRepair: () => void;
  onGoMissions: () => void;
};

/** 마이페이지 Streak 카드: 배지(8) + 주간 기록(9) + 위험 배너(11) + 복구 안내(11-1) */
export const StreakCard: React.FC<StreakCardProps> = ({ streak, isMock, onOpenRepair, onGoMissions }) => {
  const showRisk = shouldShowRiskBanner(streak, RISK_BANNER_HOUR);
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3.5" aria-label="연속 기록">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
          <Flame size={16} className="text-orange-500" aria-hidden="true" />
          연속 기록
        </h2>
        <StreakBadge days={streak.currentStreak} todayCompleted={streak.todayCompleted} isBroken={streak.isBroken} />
      </div>
      <WeekStrip week={streak.week} />
      {showRisk && <StreakRiskBanner days={streak.currentStreak} onGoMissions={onGoMissions} />}
      <StreakRepairNotice repair={streak.repair} onOpen={onOpenRepair} />
      {streak.repair.status !== 'available' && (
        <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
          이번 달 남은 복구 {streak.repair.monthlyRemaining}회
          <MockTag show={isMock} />
        </p>
      )}
    </section>
  );
};
