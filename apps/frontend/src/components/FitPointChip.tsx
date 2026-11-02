import React, { useState } from 'react';
import { Gem } from 'lucide-react';
import { ICON_SIZE } from './categoryIcons';
import { AnimatedNumber } from './progress/AnimatedNumber';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/**
 * 헤더용 보유 FitPoint 표시 (연한 노란색 = FitPoint/보상 정보)
 * 잔액이 바뀌면 숫자가 부드럽게 바뀌고(useCountUp 600ms), 옆에 변화량(-480 등)이 잠깐 떠오름 (UI 2)
 */
export const FitPointChip: React.FC<{ amount: number }> = ({ amount }) => {
  const reduced = usePrefersReducedMotion();
  // 이전 값과 비교해 변화량 계산 (렌더링 중 파생 상태 갱신)
  const [previous, setPrevious] = useState(amount);
  const [delta, setDelta] = useState<{ value: number; seq: number } | null>(null);
  if (amount !== previous) {
    setPrevious(amount);
    setDelta({ value: amount - previous, seq: (delta?.seq ?? 0) + 1 });
  }

  return (
    <div className="relative inline-flex items-center">
      <div
        className="inline-flex items-center gap-1.5 mt-1 bg-[#FFF6D9] rounded-full pl-0.5 pr-2.5 py-0.5"
        aria-label={`보유 ${amount.toLocaleString()} FitPoint`}
      >
        <span className="w-5 h-5 rounded-full bg-[#FFE8A8] flex items-center justify-center text-amber-700">
          <Gem size={ICON_SIZE.badge} aria-hidden="true" />
        </span>
        <AnimatedNumber value={amount} className="text-sm font-extrabold text-amber-900 leading-none" />
        <span className="text-[11px] font-semibold text-amber-800 leading-none">FitPoint</span>
      </div>
      {delta && !reduced && (
        <span
          key={delta.seq}
          aria-hidden="true"
          className={`absolute left-full ml-1.5 mt-1 whitespace-nowrap text-xs font-extrabold tabular-nums animate-fb-delta ${
            delta.value < 0 ? 'text-rose-500' : 'text-[#2F8A5B]'
          }`}
        >
          {delta.value > 0 ? '+' : ''}
          {delta.value.toLocaleString()} FP
        </span>
      )}
    </div>
  );
};
