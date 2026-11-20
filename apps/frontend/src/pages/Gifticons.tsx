import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Crown, Gem, Gift, Info, PackageOpen, RefreshCw, X } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { MockTag } from '../components/progress/MockTag';
import { Toast } from '../components/progress/Toast';
import { benefitApi } from '../api/benefitClient';
import { gifticonImageSrc, type Redemption, type RewardItem, type RewardList, type RewardSummary } from '../api/benefitTypes';
import { ApiError } from '../api/progressTypes';
import { useCharacterStore } from '../context/characterStore';
import { formatKstDateTime } from '../lib/dateFormat';

// 기프티콘 교환 — GET /rewards, POST /rewards/:id/redeem, GET /rewards/redemptions
// - 이미지는 예시(SAMPLE)이며 실제 상품권이 아님을 항상 안내
// - 교환 성공 응답의 balance로 공용 FitPoint 잔액을 바로 맞춤
// - 품절·없는 상품·Premium 전용·포인트 부족 오류는 안내 후 목록을 다시 불러옴

type Tab = 'shop' | 'box';

/** 교환 오류 → 다음에 할 일 */
const errorHint = (code: string | null): string => {
  switch (code) {
    case 'INSUFFICIENT_POINTS':
      return '미션을 완료해 FitPoint를 모은 뒤 다시 교환해 주세요.';
    case 'OUT_OF_STOCK':
    case 'REWARD_NOT_FOUND':
      return '최신 상품 목록을 다시 불러왔어요.';
    case 'PREMIUM_REQUIRED':
      return 'Premium을 구독하면 교환할 수 있어요.';
    default:
      // 서버는 교환 요청의 중복을 막지 않으므로, 응답만 끊긴 경우 바로 다시 보내면 두 번 교환될 수 있음
      return '응답을 받지 못했어요. 이미 교환됐을 수 있으니 보관함과 잔액을 먼저 확인해 주세요.';
  }
};

/** 예시 기프티콘 이미지 (없거나 못 불러오면 선물 아이콘) */
const GifticonImage: React.FC<{ reward: RewardSummary; className: string }> = ({ reward, className }) => {
  const src = gifticonImageSrc(reward.imageKey);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} bg-violet-50 text-violet-400 flex items-center justify-center`} aria-hidden="true">
        <Gift size={28} />
      </div>
    );
  }
  // 예시 이미지(16:9)의 "SAMPLE · 예시" 표시가 잘리지 않도록 전체를 보여 줌
  return <img src={src} alt={`${reward.name} 예시 이미지`} onError={() => setFailed(true)} className={`${className} object-contain bg-white`} />;
};

export const Gifticons: React.FC = () => {
  const navigate = useNavigate();
  const { fitPoint, setFitPoint } = useCharacterStore();
  const [tab, setTab] = useState<Tab>('shop');
  const [list, setList] = useState<RewardList | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<RewardItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string | null; message: string } | null>(null);
  const [viewing, setViewing] = useState<Redemption | null>(null);
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);

  const applyList = useCallback(
    (next: RewardList) => {
      setList(next);
      // 목록 응답의 잔액이 최신 서버 값
      setFitPoint(next.balance);
    },
    [setFitPoint],
  );

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [nextList, nextRedemptions] = await Promise.all([benefitApi.getRewards(), benefitApi.getRedemptions()]);
      applyList(nextList);
      setRedemptions(nextRedemptions);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : '기프티콘 정보를 불러오지 못했어요.');
    }
  }, [applyList]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([benefitApi.getRewards(), benefitApi.getRedemptions()]).then(
      ([nextList, nextRedemptions]) => {
        if (cancelled) return;
        applyList(nextList);
        setRedemptions(nextRedemptions);
      },
      (err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : '기프티콘 정보를 불러오지 못했어요.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [applyList]);

  const openConfirm = (reward: RewardItem) => {
    setError(null);
    setTarget(reward);
  };
  const closeConfirm = useCallback(() => {
    setTarget(null);
    setError(null);
  }, []);

  const redeem = async () => {
    if (!target || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await benefitApi.redeemReward(target.id);
      setFitPoint(result.balance);
      setTarget(null);
      setTab('box');
      setToast((previous) => ({ message: `${result.reward.name} 교환 완료!`, seq: (previous?.seq ?? 0) + 1 }));
      void load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null;
      setError({ code, message: err instanceof ApiError ? err.message : '교환하지 못했어요.' });
      // 재고·상품·잔액이 서버와 달랐거나, 응답만 끊기고 교환은 됐을 수 있으므로 항상 최신 목록·보관함·잔액으로
      void load();
    } finally {
      setSubmitting(false);
    }
  };

  // 오류 뒤에는 같은 시트에서 바로 다시 보내지 않음 (백엔드에 중복 방지 키가 없어 두 번 차감될 수 있음)
  // → 시트를 닫고 갱신된 목록·보관함을 확인한 뒤 다시 교환
  const canRetry = !error;

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-24 max-w-md mx-auto shadow-md">
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate('/mypage')} aria-label="마이페이지로" className="cursor-pointer text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-gray-800">기프티콘 교환</h1>
          <MockTag show={benefitApi.isMock} />
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#FFF6D9] px-2.5 py-1 text-[12px] font-extrabold text-amber-900 tabular-nums">
          <Gem size={12} aria-hidden="true" />
          {fitPoint.toLocaleString()} FP
        </span>
      </div>

      <div className="p-4 space-y-4">
        <p className="flex items-start gap-1.5 rounded-2xl bg-violet-50 border border-violet-100 px-3.5 py-2.5 text-[12px] font-bold text-violet-800">
          <Info size={14} className="mt-px shrink-0" aria-hidden="true" />
          시연용 예시 이미지예요. 실제 상품권으로 사용할 수 없어요.
        </p>

        {/* 탭: 교환하기 / 보관함 */}
        <div role="tablist" aria-label="기프티콘" className="grid grid-cols-2 rounded-full bg-white border border-gray-100 p-1">
          {(
            [
              ['shop', '교환하기'],
              ['box', `보관함${redemptions ? ` ${redemptions.length}` : ''}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-9 rounded-full text-[13px] font-bold cursor-pointer transition ${
                tab === key ? 'bg-[#59B985] text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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

        {tab === 'shop' && (
          <>
            {!list && !loadError && (
              <div className="grid grid-cols-2 gap-3" aria-hidden="true">
                {[0, 1].map((key) => (
                  <div key={key} className="h-56 rounded-2xl bg-white/70 border border-gray-100 animate-pulse" />
                ))}
              </div>
            )}
            {list && list.items.length === 0 && (
              <p className="rounded-2xl bg-white border border-gray-100 p-6 text-center text-xs text-gray-500">지금 교환할 수 있는 상품이 없어요.</p>
            )}
            {list && list.items.length > 0 && (
              <ul className="grid grid-cols-2 gap-3">
                {list.items.map((item) => {
                  const shortage = Math.max(0, item.requiredPoint - fitPoint);
                  const disabled = item.soldOut || item.locked || shortage > 0;
                  return (
                    <li key={item.id} className="flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                      <div className="relative">
                        <GifticonImage reward={item} className="w-full aspect-video" />
                        {item.soldOut && (
                          <span className="absolute inset-0 bg-gray-900/45 flex items-center justify-center text-sm font-extrabold text-white">품절</span>
                        )}
                        {item.premiumOnly && (
                          <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            <Crown size={10} aria-hidden="true" />
                            Premium
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-3">
                        <p className="text-[13px] font-bold text-gray-800 leading-snug">{item.name}</p>
                        <p className="flex items-center justify-between text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-0.5 font-extrabold text-amber-900 tabular-nums">
                            <Gem size={11} aria-hidden="true" />
                            {item.requiredPoint.toLocaleString()} FP
                          </span>
                          <span>재고 {item.stock.toLocaleString()}개</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => openConfirm(item)}
                          disabled={disabled}
                          className="mt-auto h-9 w-full rounded-full bg-[#59B985] text-[12px] font-bold text-white cursor-pointer hover:brightness-95 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          {item.soldOut
                            ? '품절'
                            : item.locked
                              ? 'Premium 전용'
                              : shortage > 0
                                ? `${shortage.toLocaleString()} FP 부족`
                                : '교환하기'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {list?.items.some((item) => item.locked) && (
              <button
                type="button"
                onClick={() => navigate('/mypage/subscription')}
                className="w-full text-center text-[12px] font-bold text-violet-700 underline cursor-pointer"
              >
                Premium 구독 알아보기
              </button>
            )}
          </>
        )}

        {tab === 'box' && (
          <>
            {!redemptions && !loadError && <div className="h-24 rounded-2xl bg-white/70 border border-gray-100 animate-pulse" aria-hidden="true" />}
            {redemptions && redemptions.length === 0 && (
              <section className="rounded-2xl bg-white border border-gray-100 p-6 text-center space-y-2">
                <span className="mx-auto w-12 h-12 rounded-full bg-violet-50 text-violet-500 flex items-center justify-center">
                  <PackageOpen size={22} aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-gray-800">아직 교환한 기프티콘이 없어요</p>
                <p className="text-xs text-gray-500">FitPoint를 모아 기프티콘으로 바꿔 보세요.</p>
              </section>
            )}
            {redemptions && redemptions.length > 0 && (
              <ul className="space-y-2">
                {redemptions.map((redemption) => (
                  <li key={redemption.id}>
                    <button
                      type="button"
                      onClick={() => setViewing(redemption)}
                      className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-2.5 text-left cursor-pointer hover:bg-gray-50"
                    >
                      <GifticonImage reward={redemption.reward} className="w-20 aspect-video shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-gray-800 truncate">{redemption.reward.name}</p>
                        <p className="text-[11px] text-gray-400">
                          {formatKstDateTime(redemption.redeemedAt)} · −{redemption.reward.requiredPoint.toLocaleString()} FP
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DDF3E8] text-[#2F8A5B]">
                        {redemption.status === 'completed' ? '교환 완료' : redemption.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* 교환 확인 */}
      {target && (
        <ConfirmSheet
          title="기프티콘으로 교환할까요?"
          icon={
            <span className="shrink-0 w-9 h-9 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
              <Gift size={18} aria-hidden="true" />
            </span>
          }
          confirmLabel={`${target.requiredPoint.toLocaleString()} FP로 교환하기`}
          busy={submitting}
          busyLabel="교환하는 중…"
          errorMessage={error?.message}
          errorHint={error ? errorHint(error.code) : null}
          canConfirm={canRetry}
          onConfirm={() => void redeem()}
          onClose={closeConfirm}
        >
          <div className="flex items-center gap-3 rounded-xl bg-white p-2.5">
            <GifticonImage reward={target} className="w-24 aspect-video shrink-0 rounded-lg" />
            <div className="min-w-0 text-[12px] text-gray-600">
              <p className="text-[13px] font-bold text-gray-800">{target.name}</p>
              <p>
                보유 {fitPoint.toLocaleString()} FP → 교환 후 {Math.max(0, fitPoint - target.requiredPoint).toLocaleString()} FP
              </p>
            </div>
          </div>
          <p className="px-1 text-[11px] text-gray-500">교환하면 취소할 수 없어요. 예시 이미지라 실제 매장에서는 쓸 수 없어요.</p>
        </ConfirmSheet>
      )}

      {/* 보관함 이미지 크게 보기 */}
      {viewing && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/60 p-6 animate-fb-fade-in"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${viewing.reward.name} 기프티콘`}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-gray-800">{viewing.reward.name}</p>
                <p className="text-[11px] text-gray-400">{formatKstDateTime(viewing.redeemedAt)} 교환</p>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                aria-label="닫기"
                className="shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <GifticonImage reward={viewing.reward} className="w-full aspect-video rounded-xl border border-gray-100" />
            <p className="text-center text-[11px] text-gray-500">시연용 예시 이미지예요. 실제 상품권이 아니에요.</p>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.seq} message={toast.message} onClose={() => setToast(null)} />}

      <BottomNav active="mypage" />
    </div>
  );
};
