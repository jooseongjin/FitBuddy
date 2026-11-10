import React, { useEffect, useRef, useState } from 'react';
import { CalendarX, CircleAlert, Crown, Gem, Info, LoaderCircle, RotateCcw, Target, X } from 'lucide-react';
import type { RepairMethod, StreakState } from '../../api/progressTypes';
import { ApiError } from '../../api/progressTypes';
import { createRequestId, type RepairRequest } from '../../api/progressApi';
import { formatKoreanDate, formatMonthDay } from '../../domain/kst';
import { MockTag } from './MockTag';

export type StreakRepairSheetProps = {
  streak: StreakState;
  /** 현재 FP 잔액 (상점과 공유) */
  balance: number;
  isMock: boolean;
  onClose: () => void;
  onSubmit: (request: RepairRequest) => Promise<unknown>;
  /** 복구 성공 → 부모가 시트를 닫고 토스트를 띄움 */
  onSuccess: (keptDays: number) => void;
  onGoMissions: () => void;
};

type Phase = 'idle' | 'submitting' | 'error';

/**
 * Streak 복구 팝업 (UI 12) — 아래에서 올라오는 시트
 * 상태: Basic FP 복구 / Premium 무료·FP 선택 / FP 부족 / 이번 달 횟수 소진 / 복구 불가 / 처리 중 / 실패·재시도
 * - [기록 복구하기] 버튼을 눌렀을 때만 열림 (자동 표시 안 함)
 * - 재시도 때는 같은 요청 ID를 보내 FP가 두 번 빠지지 않게 함
 * - 비용·횟수는 서버 값 (mock이면 "임시 값" 표시)
 */
export const StreakRepairSheet: React.FC<StreakRepairSheetProps> = ({
  streak: liveStreak,
  balance,
  isMock,
  onClose,
  onSubmit,
  onSuccess,
  onGoMissions,
}) => {
  // 복구 성공 직후(닫히기 전) 상태가 'none'으로 바뀌어 다른 문구가 잠깐 보이지 않도록 처음 연 상태를 유지
  const [openedWith] = useState(liveStreak);
  const streak = liveStreak.repair.status === 'none' && openedWith.repair.status !== 'none' ? openedWith : liveStreak;
  const { repair, plan } = streak;
  const isPremium = plan === 'premium';
  const freeAvailable = isPremium && repair.freeRemaining > 0;
  const cost = repair.cost;
  const pointsAvailable = cost !== null && balance >= cost;
  const shortage = cost !== null ? Math.max(0, cost - balance) : 0;

  const [method, setMethod] = useState<RepairMethod>(freeAvailable ? 'free' : 'points');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const submitting = phase === 'submitting';

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const chooseMethod = (next: RepairMethod) => {
    if (submitting || next === method) return;
    setMethod(next);
    // 방법을 바꾸면 다른 요청이므로 새 요청 ID
    requestIdRef.current = null;
    setPhase('idle');
    setErrorMessage(null);
  };

  const canSubmit = method === 'free' ? freeAvailable : pointsAvailable;

  const submit = async () => {
    if (!repair.missedDate || !canSubmit || submitting) return;
    requestIdRef.current ??= createRequestId();
    setPhase('submitting');
    setErrorMessage(null);
    try {
      await onSubmit({ missedDate: repair.missedDate, method, requestId: requestIdRef.current });
      onSuccess(repair.brokenStreak);
    } catch (error) {
      setPhase('error');
      setErrorMessage(error instanceof ApiError ? error.message : '복구하지 못했어요. 다시 시도해 주세요.');
      setErrorCode(error instanceof ApiError ? error.code : 'UNKNOWN_ERROR');
      // 상태가 바뀌어 다시 보낼 수 없는 오류면 새 요청으로
      if (error instanceof ApiError && error.code !== 'NETWORK_ERROR') requestIdRef.current = null;
    }
  };

  const closeIfIdle = () => {
    if (!submitting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-gray-900/40 animate-fb-fade-in"
      onClick={closeIfIdle}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="repair-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-[#F8F5EC] rounded-t-3xl px-4 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none animate-fb-sheet-up max-h-[90vh] overflow-y-auto"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <SheetHeader status={repair.status} />
          <button
            type="button"
            onClick={closeIfIdle}
            disabled={submitting}
            aria-label="닫기"
            className="shrink-0 w-8 h-8 rounded-full bg-white text-gray-500 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {repair.status === 'available' && repair.missedDate ? (
          <div className="mt-3 space-y-3">
            <p className="text-[13px] text-gray-700 leading-relaxed">
              <b>{formatKoreanDate(repair.missedDate)}</b> 기록을 채우면{' '}
              <b className="text-orange-500">{repair.brokenStreak}일 연속</b> 기록이 이어져요.
            </p>
            <p className="flex items-start gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] text-gray-500">
              <Info size={13} className="mt-px shrink-0 text-gray-400" aria-hidden="true" />
              복구는 연속 일수를 지켜 주는 기능이에요. 오늘 미션을 완료해야 +1일이 돼요.
            </p>

            {/* 복구 방법 */}
            <fieldset className="space-y-2" disabled={submitting}>
              <legend className="mb-1.5 text-xs font-bold text-gray-700">복구 방법</legend>
              {isPremium && (
                <MethodOption
                  selected={method === 'free'}
                  disabled={!freeAvailable}
                  onSelect={() => chooseMethod('free')}
                  icon={<Crown size={16} aria-hidden="true" />}
                  iconClass="bg-violet-100 text-violet-600"
                  title="무료 복구"
                  description={freeAvailable ? `Premium · 이번 달 무료 ${repair.freeRemaining}회 남음` : '이번 달 무료 복구를 모두 썼어요'}
                  trailing={<MockTag show={isMock} />}
                />
              )}
              <MethodOption
                selected={method === 'points'}
                disabled={!pointsAvailable}
                onSelect={() => chooseMethod('points')}
                icon={<Gem size={16} aria-hidden="true" />}
                iconClass="bg-[#FFE8A8] text-amber-700"
                title="FitPoint로 복구"
                description={
                  cost === null
                    ? '복구 비용 준비 중'
                    : pointsAvailable
                      ? `보유 ${balance.toLocaleString()} FP → 복구 후 ${(balance - cost).toLocaleString()} FP`
                      : `${shortage.toLocaleString()} FitPoint 부족 · 보유 ${balance.toLocaleString()} FP`
                }
                descriptionClass={!pointsAvailable && cost !== null ? 'text-rose-600 font-bold' : undefined}
                trailing={
                  cost !== null && (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#FFF6D9] px-2 py-0.5 text-[12px] font-extrabold text-amber-900 tabular-nums">
                        <Gem size={11} aria-hidden="true" />
                        {cost.toLocaleString()} FP
                      </span>
                      <MockTag show={isMock} />
                    </span>
                  )
                }
              />
              {!isPremium && <p className="px-1 text-[11px] text-gray-400">Premium은 매달 무료 복구를 쓸 수 있어요</p>}
            </fieldset>

            <p className="flex items-center gap-1.5 px-1 text-[11px] text-gray-500">
              이번 달 남은 복구 <b className="text-gray-700">{repair.monthlyRemaining}회</b>
              <MockTag show={isMock} />
            </p>

            {phase === 'error' && errorMessage && (
              <div role="alert" className="flex items-start gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
                <CircleAlert size={14} className="mt-px shrink-0 text-rose-600" aria-hidden="true" />
                <div className="text-[12px]">
                  <p className="font-bold text-rose-600">{errorMessage}</p>
                  <p className="text-gray-500">{errorNextStep(errorCode)}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {canSubmit ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="h-11 w-full rounded-full bg-[#59B985] text-[14px] font-bold text-white shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 disabled:cursor-wait disabled:brightness-95"
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={16} className="animate-fb-spin" aria-hidden="true" />
                      복구하는 중…
                    </>
                  ) : phase === 'error' ? (
                    '다시 시도'
                  ) : method === 'free' ? (
                    '무료로 복구하기'
                  ) : (
                    <>
                      <Gem size={15} aria-hidden="true" />
                      {cost?.toLocaleString()} FP로 복구하기
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoMissions}
                  className="h-11 w-full rounded-full bg-white border-2 border-[#59B985] text-[14px] font-bold text-[#2F8A5B] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Target size={15} aria-hidden="true" />
                  미션 하러 가기
                </button>
              )}
              <button
                type="button"
                onClick={closeIfIdle}
                disabled={submitting}
                className="h-10 w-full rounded-full text-[13px] font-bold text-gray-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                괜찮아요
              </button>
            </div>
          </div>
        ) : (
          <UnavailableBody status={repair.status} resetsOn={repair.resetsOn} onGoMissions={onGoMissions} onClose={onClose} />
        )}
      </div>
    </div>
  );
};

/** 복구 실패 시 사용자가 다음에 할 일 */
const errorNextStep = (code: string | null): string => {
  switch (code) {
    case 'NETWORK_ERROR':
    case 'UNKNOWN_ERROR':
      return '[다시 시도]를 눌러 주세요. 다시 시도해도 FitPoint는 한 번만 사용돼요.';
    case 'INSUFFICIENT_POINTS':
      return '미션을 완료해 FitPoint를 모은 뒤 다시 복구해 주세요.';
    case 'NO_FREE_REPAIR':
    case 'PREMIUM_REQUIRED':
      return 'FitPoint로 복구를 선택해 다시 시도해 주세요.';
    case 'IDEMPOTENCY_KEY_REUSED':
      return '[다시 시도]를 누르면 새 요청으로 처리해요.';
    default:
      // 날짜 변경·횟수 소진·이미 복구됨 등: 최신 상태를 다시 불러와 화면이 바뀜
      return '최신 기록을 다시 불러왔어요. 바뀐 안내를 확인해 주세요.';
  }
};

const SheetHeader: React.FC<{ status: StreakState['repair']['status'] }> = ({ status }) => {
  const conf = {
    available: { icon: <RotateCcw size={18} aria-hidden="true" />, cls: 'bg-[#DCEEFF] text-sky-700', title: '어제 기록 복구하기' },
    monthly_limit: { icon: <CalendarX size={18} aria-hidden="true" />, cls: 'bg-gray-100 text-gray-500', title: '이번 달 복구 횟수를 모두 썼어요' },
    expired: { icon: <Info size={18} aria-hidden="true" />, cls: 'bg-gray-100 text-gray-500', title: '기록을 복구할 수 없어요' },
    none: { icon: <RotateCcw size={18} aria-hidden="true" />, cls: 'bg-[#DDF3E8] text-[#2F8A5B]', title: '연속 기록이 이어지고 있어요' },
  }[status];
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${conf.cls}`}>{conf.icon}</span>
      <h2 id="repair-title" className="text-base font-bold text-gray-800 leading-snug">
        {conf.title}
      </h2>
    </div>
  );
};

const UnavailableBody: React.FC<{
  status: StreakState['repair']['status'];
  resetsOn: string;
  onGoMissions: () => void;
  onClose: () => void;
}> = ({ status, resetsOn, onGoMissions, onClose }) => (
  <div className="mt-3 space-y-3">
    <p className="text-[13px] text-gray-600 leading-relaxed">
      {status === 'monthly_limit' &&
        `복구 횟수는 ${resetsOn ? formatMonthDay(resetsOn) : '다음 달 1일'}에 다시 생겨요. 오늘 미션을 완료하면 1일부터 새로 시작해요.`}
      {status === 'expired' && '이틀 이상 지나 기록을 복구할 수 없어요. 오늘 미션을 완료하면 1일부터 다시 시작해요.'}
      {status === 'none' && '복구할 기록이 없어요. 오늘 미션을 완료하면 연속 기록이 하루 늘어나요.'}
    </p>
    <div className="flex flex-col gap-2">
      {status !== 'none' && (
        <button
          type="button"
          onClick={onGoMissions}
          className="h-11 w-full rounded-full bg-[#59B985] text-[14px] font-bold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Target size={15} aria-hidden="true" />
          미션 하러 가기
        </button>
      )}
      <button type="button" onClick={onClose} className="h-10 w-full rounded-full bg-white text-[13px] font-bold text-gray-500 cursor-pointer">
        닫기
      </button>
    </div>
  </div>
);

const MethodOption: React.FC<{
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  descriptionClass?: string;
  trailing?: React.ReactNode;
}> = ({ selected, disabled, onSelect, icon, iconClass, title, description, descriptionClass, trailing }) => (
  <label
    className={`flex items-center gap-2.5 rounded-2xl border bg-white px-3 py-2.5 transition ${
      disabled
        ? 'border-gray-100 opacity-60 cursor-not-allowed'
        : selected
          ? 'border-[#59B985] ring-2 ring-[#59B985]/30 cursor-pointer'
          : 'border-gray-100 cursor-pointer'
    }`}
  >
    <input type="radio" name="repair-method" className="sr-only" checked={selected} disabled={disabled} onChange={onSelect} />
    <span
      aria-hidden="true"
      className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected && !disabled ? 'border-[#59B985]' : 'border-gray-300'}`}
    >
      {selected && !disabled && <span className="w-2 h-2 rounded-full bg-[#59B985]" />}
    </span>
    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconClass}`}>{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-[13px] font-bold text-gray-800">{title}</span>
      <span className={`block text-[11px] leading-snug ${descriptionClass ?? 'text-gray-500'}`}>{description}</span>
    </span>
    {trailing}
  </label>
);
