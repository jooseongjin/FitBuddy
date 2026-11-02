import React from 'react';
import { CalendarX, Info, RotateCcw } from 'lucide-react';
import type { RepairInfo } from '../../api/progressTypes';
import { formatMonthDay } from '../../domain/kst';

/**
 * 복구 안내 (UI 11-1)
 * 팝업을 자동으로 띄우지 않고, 복구 가능할 때만 [기록 복구하기] 버튼으로 연다.
 * 횟수 소진·복구 불가는 안내만 (버튼 없음)
 */
export const StreakRepairNotice: React.FC<{ repair: RepairInfo; onOpen: () => void }> = ({ repair, onOpen }) => {
  if (repair.status === 'none') return null;

  if (repair.status === 'available') {
    return (
      <div className="rounded-xl bg-[#DCEEFF] px-3 py-3 space-y-2">
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-sky-800">
          <RotateCcw size={15} aria-hidden="true" />
          어제 기록을 복구할 수 있어요
        </p>
        <p className="text-[11px] text-gray-600">
          {repair.brokenStreak}일 연속 기록을 지킬 수 있어요 · 이번 달 남은 복구 {repair.monthlyRemaining}회
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="h-10 w-full rounded-full bg-[#59B985] text-[13px] font-bold text-white shadow-sm cursor-pointer hover:brightness-95"
        >
          기록 복구하기
        </button>
      </div>
    );
  }

  const monthly = repair.status === 'monthly_limit';
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 space-y-1">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-gray-700">
        {monthly ? <CalendarX size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
        {monthly ? '이번 달 복구 횟수를 모두 썼어요' : '기록이 끊겼어요'}
      </p>
      <p className="text-[11px] text-gray-500">
        {monthly
          ? `${formatMonthDay(repair.resetsOn)}에 다시 생겨요 · 오늘 미션으로 새로 시작해요`
          : '이틀 이상 지나 복구할 수 없어요 · 오늘부터 다시 시작해요'}
      </p>
    </div>
  );
};
