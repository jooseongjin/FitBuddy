import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Gem, Gift, LoaderCircle, RefreshCw, RotateCcw, ShoppingBag, Target } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { MockTag } from '../components/progress/MockTag';
import { AnimatedNumber } from '../components/progress/AnimatedNumber';
import { ICON_SIZE } from '../components/categoryIcons';
import { progressApi } from '../api/progressClient';
import { ApiError, type PointSource, type PointTransaction } from '../api/progressTypes';
import { useCharacterStore } from '../context/characterStore';
import { formatKoreanDate, kstDateKey, type DateKey } from '../domain/kst';

// FitPoint 내역 (API-07 GET /points/history) — 마이페이지 FitPoint 카드에서 진입
// 적립은 +, 사용은 −로 표시하고, 각 거래 뒤의 잔액을 현재 잔액에서 거꾸로 계산해 함께 보여준다.

const PAGE_SIZE = 20;

const SOURCE_INFO: Record<PointSource, { label: string; icon: React.ReactNode; iconClass: string }> = {
  mission_complete: { label: '미션 완료', icon: <Target size={16} aria-hidden="true" />, iconClass: 'bg-[#DDF3E8] text-[#2F8A5B]' },
  shop_purchase: { label: '상점 구매', icon: <ShoppingBag size={16} aria-hidden="true" />, iconClass: 'bg-[#FFE8A8] text-amber-700' },
  streak_repair: { label: '연속 기록 복구', icon: <RotateCcw size={16} aria-hidden="true" />, iconClass: 'bg-[#DCEEFF] text-sky-700' },
  reward_redeem: { label: '리워드 교환', icon: <Gift size={16} aria-hidden="true" />, iconClass: 'bg-violet-100 text-violet-600' },
};

/** 거래 시각(ISO) → KST 날짜·시각 */
const toKst = (iso: string): { day: DateKey; time: string } => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { day: iso.slice(0, 10), time: '' };
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { day: kstDateKey(date), time: kst.toISOString().slice(11, 16) };
};

type Row = PointTransaction & { balanceAfter: number; day: DateKey; time: string };

export const PointHistory: React.FC = () => {
  const navigate = useNavigate();
  const { fitPoint } = useCharacterStore();
  const [items, setItems] = useState<PointTransaction[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await progressApi.getPointHistory(nextPage, PAGE_SIZE);
      setItems((previous) => (nextPage === 1 ? result.items : [...previous, ...result.items]));
      setHasMore(result.hasMore);
      setPage(nextPage);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'FitPoint 내역을 불러오지 못했어요.');
      setStatus('error');
    }
  }, []);

  // 처음 진입: 첫 페이지 (화면을 떠난 뒤 도착한 응답은 무시)
  useEffect(() => {
    let cancelled = false;
    progressApi.getPointHistory(1, PAGE_SIZE).then(
      (result) => {
        if (cancelled) return;
        setItems(result.items);
        setHasMore(result.hasMore);
        setPage(1);
        setStatus('ready');
      },
      (error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof ApiError ? error.message : 'FitPoint 내역을 불러오지 못했어요.');
        setStatus('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // 최신순 목록 → 각 거래 직후 잔액 = 현재 잔액 − (그보다 최근 거래 합계)
  const groups = useMemo(() => {
    let after = fitPoint;
    const rows: Row[] = items.map((item) => {
      const row = { ...item, balanceAfter: after, ...toKst(item.createdAt) };
      after -= item.amount;
      return row;
    });
    const byDay = new Map<DateKey, Row[]>();
    rows.forEach((row) => byDay.set(row.day, [...(byDay.get(row.day) ?? []), row]));
    return [...byDay.entries()];
  }, [items, fitPoint]);

  const earned = items.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const spent = items.filter((item) => item.amount < 0).reduce((sum, item) => sum - item.amount, 0);
  const firstLoad = status === 'loading' && page === 0;

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-24 max-w-md mx-auto shadow-md">
      <div className="bg-white sticky top-0 z-10 shadow-sm px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/mypage')} aria-label="마이페이지로" className="cursor-pointer text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-gray-800">FitPoint 내역</h1>
        <MockTag show={progressApi.isMock} />
      </div>

      <div className="p-4 space-y-4">
        {/* 현재 잔액 + 불러온 내역 기준 적립·사용 합계 */}
        <section className="rounded-2xl bg-[#FFF6D9] border border-[#FFE8A8] p-4" aria-label="FitPoint 잔액">
          <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <Gem size={ICON_SIZE.inline} aria-hidden="true" />
            보유 FitPoint
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-amber-900 leading-none">
            <AnimatedNumber value={fitPoint} /> <span className="text-sm font-bold">FP</span>
          </p>
          {items.length > 0 && (
            <p className="mt-2 text-[11px] text-amber-800/80">
              {hasMore ? `최근 ${items.length}건` : `전체 ${items.length}건`} 기준 · 적립{' '}
              <b className="text-[#2F8A5B]">+{earned.toLocaleString()}</b> · 사용{' '}
              <b className="text-rose-600">−{spent.toLocaleString()}</b>
            </p>
          )}
        </section>

        {status === 'error' && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
              <CircleAlert size={13} aria-hidden="true" />
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void loadPage(page === 0 ? 1 : page + 1)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-rose-600 border border-rose-200 cursor-pointer"
            >
              <RefreshCw size={12} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        )}

        {firstLoad && (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-16 rounded-2xl bg-white/70 border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* 첫 사용자: 내역 없음 */}
        {status === 'ready' && items.length === 0 && (
          <section className="rounded-2xl bg-white border border-gray-100 p-6 text-center space-y-3">
            <span className="mx-auto w-12 h-12 rounded-full bg-[#FFF6D9] text-amber-700 flex items-center justify-center">
              <Gem size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-800">아직 FitPoint 내역이 없어요</p>
              <p className="text-xs text-gray-500 mt-1">미션을 완료하면 FitPoint가 쌓이고, 여기에서 확인할 수 있어요.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/missions')}
              className="inline-flex items-center gap-1 rounded-full bg-[#59B985] px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Target size={13} aria-hidden="true" />
              오늘의 미션 하러 가기
            </button>
          </section>
        )}

        {groups.map(([day, rows]) => (
          <section key={day} className="space-y-2" aria-label={formatKoreanDate(day)}>
            <h2 className="px-1 text-xs font-bold text-gray-500">{formatKoreanDate(day)}</h2>
            <ul className="rounded-2xl bg-white border border-gray-100 divide-y divide-gray-50">
              {rows.map((row) => {
                const info = SOURCE_INFO[row.source];
                const plus = row.amount > 0;
                return (
                  <li key={row.id} className="flex items-center gap-3 px-3.5 py-3">
                    <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${info.iconClass}`}>{info.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 truncate">{row.title ?? info.label}</p>
                      <p className="text-[11px] text-gray-400">
                        {info.label}
                        {row.time && ` · ${row.time}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-extrabold tabular-nums ${plus ? 'text-[#2F8A5B]' : 'text-rose-600'}`}>
                        {plus ? '+' : '−'}
                        {Math.abs(row.amount).toLocaleString()} FP
                      </p>
                      <p className="text-[10px] text-gray-400 tabular-nums">잔액 {row.balanceAfter.toLocaleString()}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {hasMore && status !== 'error' && (
          <button
            type="button"
            onClick={() => void loadPage(page + 1)}
            disabled={status === 'loading'}
            className="w-full h-10 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-600 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-wait"
          >
            {status === 'loading' ? <LoaderCircle size={14} className="animate-fb-spin" aria-hidden="true" /> : null}
            {status === 'loading' ? '불러오는 중…' : '이전 내역 더 보기'}
          </button>
        )}
      </div>

      <BottomNav active="mypage" />
    </div>
  );
};
