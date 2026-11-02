import React from 'react';
import { Flame, Gem } from 'lucide-react';
import { useProgress } from '../../context/progressStore';
import { useCharacterStore } from '../../context/characterStore';
import { AnimatedNumber } from './AnimatedNumber';

/**
 * 홈·미션 화면 헤더의 "N일 연속 · FitPoint" (기존 하드코딩 값 대체)
 * 연속 일수는 Streak 공용 상태, FitPoint는 상점과 공유하는 잔액
 */
export const HeaderStatus: React.FC<{ showStreak?: boolean }> = ({ showStreak = true }) => {
  const { streak } = useProgress();
  const { fitPoint } = useCharacterStore();
  const days = streak?.currentStreak ?? 0;

  return (
    <div className="flex items-center gap-3 text-xs mt-1">
      {showStreak && (
        <span className={`font-semibold flex items-center gap-1 ${days > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
          <Flame size={14} aria-hidden="true" className={streak?.todayCompleted ? 'fill-orange-200' : ''} />
          {streak ? (days > 0 ? `${days}일 연속` : '연속 기록 0일') : '-'}
        </span>
      )}
      <span className="font-semibold flex items-center gap-1 text-amber-700">
        <Gem size={14} aria-hidden="true" />
        <AnimatedNumber value={fitPoint} /> FitPoint
      </span>
    </div>
  );
};
