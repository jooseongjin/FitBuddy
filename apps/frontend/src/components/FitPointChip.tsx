import React from 'react';
import { Gem } from 'lucide-react';
import { ICON_SIZE } from './categoryIcons';

/** 헤더용 보유 FitPoint 표시 (연한 노란색 = FitPoint/보상 정보) */
export const FitPointChip: React.FC<{ amount: number }> = ({ amount }) => (
  <div
    className="inline-flex items-center gap-1.5 mt-1 bg-[#FFF6D9] rounded-full pl-0.5 pr-2.5 py-0.5"
    aria-label={`보유 ${amount.toLocaleString()} FitPoint`}
  >
    <span className="w-5 h-5 rounded-full bg-[#FFE8A8] flex items-center justify-center text-amber-700">
      <Gem size={ICON_SIZE.badge} aria-hidden="true" />
    </span>
    <span className="text-sm font-extrabold text-amber-900 tabular-nums leading-none">{amount.toLocaleString()}</span>
    <span className="text-[11px] font-semibold text-amber-800 leading-none">FitPoint</span>
  </div>
);
