import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { AnimatedNumber } from './AnimatedNumber';

export type StreakPlusOneProps = {
  /** 미션 완료 응답의 streak 값을 그대로 전달 */
  increased: boolean;
  previous: number;
  current: number;
  restarted: boolean;
  className?: string;
};

/**
 * Streak +1 효과 (UI 10) — 독립 컴포넌트
 * - increased=false(오늘 이미 +1 받음)면 그리지 않음 → 하루 최대 +1
 * - restarted=true면 "1일째 · 다시 시작" 연출
 */
export const StreakPlusOne: React.FC<StreakPlusOneProps> = ({ increased, previous, current, restarted, className = '' }) => {
  const reduced = usePrefersReducedMotion();
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    // 불꽃이 튄 뒤 숫자가 올라가도록 살짝 늦춤
    const timer = setTimeout(() => setCounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!increased) return null;
  const shown = reduced || counted ? current : previous;

  return (
    <div
      role="status"
      className={`inline-flex flex-col items-center gap-1 rounded-[20px] bg-[#FFF1E6] px-5 py-3.5 text-center ${className}`}
    >
      <Flame size={36} aria-hidden="true" className="text-orange-500 fill-orange-200 animate-fb-flame" />
      {restarted ? (
        <>
          <span className="text-[22px] font-black text-orange-500 leading-tight">1일째</span>
          <span className="text-xs font-medium text-gray-600">오늘부터 다시 시작해요!</span>
        </>
      ) : (
        <>
          <span className="flex items-baseline gap-1.5 leading-tight">
            <span className="text-base font-bold text-gray-400 tabular-nums">{previous}</span>
            <span className="text-sm font-bold text-gray-400" aria-hidden="true">
              →
            </span>
            <span className="text-[22px] font-black text-orange-500">
              <AnimatedNumber value={shown} />일 연속!
            </span>
          </span>
          <span className="text-xs font-medium text-gray-600">오늘도 해냈어요</span>
        </>
      )}
    </div>
  );
};
