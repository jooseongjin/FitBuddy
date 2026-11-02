import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { StreakState, WeekDayStatus } from '../../api/progressTypes';
import { formatKoreanDate, weekdayLabel } from '../../domain/kst';

const STATUS_LABEL: Record<WeekDayStatus, string> = {
  done: '달성',
  missed: '미달성',
  repaired: '복구한 날',
  today_pending: '오늘 · 아직 안 함',
  today_done: '오늘 · 달성',
  future: '아직 오지 않은 날',
};

const DOT_CLASS: Record<WeekDayStatus, string> = {
  done: 'bg-[#59B985] text-white',
  missed: 'bg-gray-100',
  repaired: 'bg-[#DCEEFF] text-sky-700 border-[1.5px] border-sky-600',
  today_pending: 'bg-white border-[1.5px] border-dashed border-orange-500',
  today_done: 'bg-orange-500 text-white',
  future: 'bg-white border border-gray-200',
};

/** 운동 기록 7칸 (UI 9) — 오늘을 포함한 최근 7일, KST 기준 */
export const WeekStrip: React.FC<{ week: StreakState['week'] }> = ({ week }) => (
  <ol className="grid grid-cols-7 gap-1" aria-label="최근 7일 운동 기록">
    {week.map(({ date, status }) => {
      const isToday = status === 'today_pending' || status === 'today_done';
      return (
        <li
          key={date}
          className="flex flex-col items-center gap-1"
          aria-label={`${formatKoreanDate(date)} ${STATUS_LABEL[status]}`}
        >
          <span className={`text-[11px] leading-none ${isToday ? 'font-bold text-orange-500' : 'font-medium text-gray-500'}`}>
            {weekdayLabel(date)}
          </span>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center ${DOT_CLASS[status]}`}>
            {(status === 'done' || status === 'today_done') && <Check size={14} strokeWidth={3} aria-hidden="true" />}
            {status === 'repaired' && <RotateCcw size={13} strokeWidth={2.5} aria-hidden="true" />}
          </span>
        </li>
      );
    })}
  </ol>
);
