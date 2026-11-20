import React, { useEffect, useRef } from 'react';
import { CircleAlert, LoaderCircle, X } from 'lucide-react';

/**
 * 되돌릴 수 없는 동작(모의 결제·기프티콘 교환) 전에 한 번 더 확인하는 아래쪽 시트
 * - 처리 중에는 닫기·확인 버튼이 잠겨 두 번 요청되지 않음
 * - errorMessage가 있으면 시트 안에 안내 (닫지 않고 다시 시도 가능)
 */
export const ConfirmSheet: React.FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  confirmLabel: string;
  busy: boolean;
  busyLabel?: string;
  errorMessage?: string | null;
  errorHint?: React.ReactNode;
  /** false면 확인 버튼 비활성 (예: 오류 후 다시 보낼 수 없는 상태) */
  canConfirm?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ title, icon, children, confirmLabel, busy, busyLabel = '처리하는 중…', errorMessage, errorHint, canConfirm = true, onConfirm, onClose }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const closeIfIdle = () => {
    if (!busy) onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-gray-900/40 animate-fb-fade-in" onClick={closeIfIdle} role="presentation">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-sheet-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-[#F8F5EC] rounded-t-3xl px-4 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl outline-none animate-fb-sheet-up max-h-[90vh] overflow-y-auto"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon}
            <h2 id="confirm-sheet-title" className="text-base font-bold text-gray-800 leading-snug">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeIfIdle}
            disabled={busy}
            aria-label="닫기"
            className="shrink-0 w-8 h-8 rounded-full bg-white text-gray-500 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {children}

          {errorMessage && (
            <div role="alert" className="flex items-start gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
              <CircleAlert size={14} className="mt-px shrink-0 text-rose-600" aria-hidden="true" />
              <div className="text-[12px]">
                <p className="font-bold text-rose-600">{errorMessage}</p>
                {errorHint && <div className="text-gray-500">{errorHint}</div>}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || !canConfirm}
              className="h-11 w-full rounded-full bg-[#59B985] text-[14px] font-bold text-white shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <>
                  <LoaderCircle size={16} className="animate-fb-spin" aria-hidden="true" />
                  {busyLabel}
                </>
              ) : (
                confirmLabel
              )}
            </button>
            <button
              type="button"
              onClick={closeIfIdle}
              disabled={busy}
              className="h-10 w-full rounded-full text-[13px] font-bold text-gray-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
