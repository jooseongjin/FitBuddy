import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Crown, Info, Receipt, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { MockTag } from '../components/progress/MockTag';
import { Toast } from '../components/progress/Toast';
import { benefitApi } from '../api/benefitClient';
import type { MockPaymentResult, PaymentLog, SubscriptionInfo } from '../api/benefitTypes';
import { ApiError } from '../api/progressTypes';
import { useProgress } from '../context/progressStore';
import { MOCK_POLICY } from '../mocks/mockPolicy';
import { formatKstDate, formatKstDateTime } from '../lib/dateFormat';

// Premium 구독 (모의 결제) — GET/POST /subscription
// - 실제 결제가 아니라는 안내를 항상 보여 줌
// - 구독 해지 기능은 아직 없음 → 해지 버튼 없이 안내만 (구독하면 기간 동안 유지)
// - 이미 구독 중(409 ALREADY_SUBSCRIBED)·결제 실패(402 PAYMENT_FAILED)는 화면 안내 후 최신 상태로

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm';

/** 플랜별 복구 횟수 (백엔드 기본값과 같은 mock 정책) */
const repairText = (plan: 'basic' | 'premium') => {
  const limit = MOCK_POLICY.repair.monthlyLimit[plan];
  return `무료 ${limit.free}회 + FitPoint ${limit.points}회`;
};

const PAYMENT_STATUS: Record<PaymentLog['status'], { label: string; cls: string }> = {
  success: { label: '결제 완료', cls: 'bg-[#DDF3E8] text-[#2F8A5B]' },
  failed: { label: '결제 실패', cls: 'bg-rose-50 text-rose-600' },
  pending: { label: '처리 중', cls: 'bg-gray-100 text-gray-500' },
};

/** 구독 오류 → 다음에 할 일 */
const errorHint = (code: string | null): string => {
  switch (code) {
    case 'ALREADY_SUBSCRIBED':
      return '이미 Premium이에요. 최신 구독 상태를 다시 불러왔어요.';
    case 'PAYMENT_FAILED':
      return '구독 상태는 그대로예요. [다시 시도]를 누르면 새로 결제해요.';
    default:
      return '잠시 후 다시 시도해 주세요.';
  }
};

export const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { refresh: refreshProgress } = useProgress();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string | null; message: string } | null>(null);
  const [failTest, setFailTest] = useState(false);
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setInfo(await benefitApi.getSubscription());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : '구독 정보를 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    benefitApi.getSubscription().then(
      (next) => {
        if (!cancelled) setInfo(next);
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : '구독 정보를 불러오지 못했어요.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const openConfirm = () => {
    setError(null);
    setConfirmOpen(true);
  };
  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setError(null);
  }, []);

  const subscribe = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    // 개발 서버에서만: 결제 실패 화면 확인용
    const mockResult: MockPaymentResult | undefined = import.meta.env.DEV && failTest ? 'fail' : undefined;
    try {
      await benefitApi.subscribePremium(mockResult);
      setConfirmOpen(false);
      setToast((previous) => ({ message: 'Premium 구독을 시작했어요!', seq: (previous?.seq ?? 0) + 1 }));
      // 플랜이 바뀌면 복구 횟수(Streak)도 달라지므로 함께 새로 불러옴
      await Promise.all([load(), refreshProgress()]);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null;
      setError({ code, message: err instanceof ApiError ? err.message : '구독하지 못했어요.' });
      // 상태가 서버와 달랐거나(이미 구독) 결제 기록이 남았으면 최신 상태로
      if (code === 'ALREADY_SUBSCRIBED' || code === 'PAYMENT_FAILED') void load();
      if (code === 'ALREADY_SUBSCRIBED') void refreshProgress();
    } finally {
      setSubmitting(false);
    }
  };

  const premium = info?.plan === 'premium';
  const price = info ? info.price.toLocaleString() : '-';
  const periodDays = info?.periodDays ?? MOCK_POLICY.subscription.periodDays;

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-24 max-w-md mx-auto shadow-md">
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/mypage')} aria-label="마이페이지로" className="cursor-pointer text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-800">Premium 구독</h1>
        <MockTag show={benefitApi.isMock} />
      </div>

      <div className="p-4 space-y-4">
        {/* 모의 결제 안내 (항상 표시) */}
        <p className="flex items-start gap-1.5 rounded-2xl bg-[#FFF6D9] border border-[#FFE8A8] px-3.5 py-2.5 text-[12px] font-bold text-amber-900">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          모의 결제예요. 실제로 돈이 결제되지 않아요.
        </p>

        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
              <CircleAlert size={13} aria-hidden="true" />
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-rose-600 border border-rose-200 cursor-pointer"
            >
              <RefreshCw size={12} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        )}

        {!info && !loadError && <div className="h-40 rounded-2xl bg-white/70 border border-gray-100 animate-pulse" aria-hidden="true" />}

        {info && (
          <>
            {/* 현재 구독 상태 */}
            <section
              className={`rounded-2xl p-4 border ${premium ? 'bg-violet-50 border-violet-100' : 'bg-white border-gray-100 shadow-sm'}`}
              aria-label="현재 구독 상태"
            >
              <p className="text-xs font-bold text-gray-500">현재 이용 중</p>
              <p className={`mt-1 flex items-center gap-1.5 text-xl font-extrabold ${premium ? 'text-violet-700' : 'text-gray-800'}`}>
                {premium && <Crown size={20} aria-hidden="true" />}
                {premium ? 'Premium' : 'Basic'}
              </p>
              {premium ? (
                <p className="mt-1 text-[12px] text-gray-600">
                  {info.expiresAt ? (
                    <>
                      <b>{formatKstDate(info.expiresAt)}</b>까지 이용할 수 있어요
                    </>
                  ) : (
                    'Premium 이용 중이에요'
                  )}{' '}
                  · 미션 포인트 {info.pointMultiplier}배
                </p>
              ) : (
                <p className="mt-1 text-[12px] text-gray-500">무료로 이용 중이에요. Premium을 구독하면 아래 혜택이 생겨요.</p>
              )}
            </section>

            {/* 혜택 비교 */}
            <section className={`${CARD} p-4 space-y-3`} aria-label="Premium 혜택">
              <h2 className="text-sm font-bold text-gray-800">Premium 혜택</h2>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2.5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#FFE8A8] text-amber-700 flex items-center justify-center">
                    <Sparkles size={16} aria-hidden="true" />
                  </span>
                  <div className="text-[12px]">
                    <p className="font-bold text-gray-800">미션 포인트 1.5배</p>
                    <p className="text-gray-500">같은 미션을 해도 FitPoint를 더 많이 받아요.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-[#DCEEFF] text-sky-700 flex items-center justify-center">
                    <RotateCcw size={16} aria-hidden="true" />
                  </span>
                  <div className="text-[12px]">
                    <p className="font-bold text-gray-800">연속 기록 복구 횟수 2배</p>
                    <p className="text-gray-500">
                      매달 {repairText('premium')} (Basic은 {repairText('basic')})
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            {/* 구독 버튼 / 이용 중 안내 */}
            {premium ? (
              <p className="flex items-start gap-1.5 px-1 text-[11px] text-gray-500">
                <Info size={13} className="mt-px shrink-0 text-gray-400" aria-hidden="true" />
                구독 해지 기능은 준비 중이에요. 이용 기간이 끝나면 Basic으로 돌아가요.
              </p>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={openConfirm}
                  className="h-12 w-full rounded-full bg-violet-600 text-[15px] font-bold text-white shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95"
                >
                  <Crown size={17} aria-hidden="true" />월 {price}원으로 Premium 시작하기
                </button>
                <p className="px-1 text-center text-[11px] text-gray-500">
                  {periodDays}일 동안 이용 · 구독 해지 기능은 아직 없어요
                </p>
              </div>
            )}

            {/* 결제 기록 (최근 5건) */}
            <section className={`${CARD} p-4 space-y-2.5`} aria-label="결제 기록">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                <Receipt size={16} className="text-gray-400" aria-hidden="true" />
                결제 기록
              </h2>
              {info.payments.length === 0 ? (
                <p className="text-xs text-gray-500">결제 기록이 없어요.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {info.payments.map((payment) => {
                    const status = PAYMENT_STATUS[payment.status];
                    return (
                      <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-800">Premium {payment.amount.toLocaleString()}원 (모의 결제)</p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {formatKstDateTime(payment.createdAt)}
                            {payment.transactionId && ` · ${payment.transactionId}`}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {confirmOpen && info && (
        <ConfirmSheet
          title="Premium을 시작할까요?"
          icon={
            <span className="shrink-0 w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
              <Crown size={18} aria-hidden="true" />
            </span>
          }
          confirmLabel={error?.code === 'PAYMENT_FAILED' ? '다시 시도' : `${price}원 모의 결제하기`}
          busy={submitting}
          busyLabel="결제하는 중…"
          errorMessage={error?.message}
          errorHint={error ? errorHint(error.code) : null}
          canConfirm={error?.code !== 'ALREADY_SUBSCRIBED'}
          onConfirm={() => void subscribe()}
          onClose={closeConfirm}
        >
          <ul className="space-y-1.5 rounded-xl bg-white px-3.5 py-3 text-[12px] text-gray-600">
            <li>
              결제 금액 <b className="text-gray-800">{price}원</b> · 이용 기간 <b className="text-gray-800">{periodDays}일</b>
            </li>
            <li className="font-bold text-amber-800">모의 결제라 실제로 돈이 나가지 않아요.</li>
            <li>구독 해지 기능이 아직 없어, 시작하면 {periodDays}일 동안 Premium이 유지돼요.</li>
          </ul>
          {import.meta.env.DEV && (
            <label className="flex items-center gap-2 px-1 text-[11px] text-gray-500">
              <input type="checkbox" checked={failTest} onChange={(event) => setFailTest(event.target.checked)} />
              결제 실패로 테스트 (개발 서버 전용)
            </label>
          )}
        </ConfirmSheet>
      )}

      {toast && <Toast key={toast.seq} message={toast.message} onClose={() => setToast(null)} />}

      <BottomNav active="mypage" />
    </div>
  );
};
