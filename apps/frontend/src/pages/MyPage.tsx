import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Flame,
  Gem,
  Menu,
  Package,
  Palette,
  PawPrint,
  RefreshCw,
  Sparkles,
  User,
  UserPen,
} from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { CharacterStage } from '../components/CharacterStage';
import { FitPointChip } from '../components/FitPointChip';
import { CATEGORY_ICON, ICON_SIZE } from '../components/categoryIcons';
import {
  BACKGROUND_ITEMS,
  EMPTY_EQUIPPED,
  PART_ITEMS,
  findCharacter,
  findPart,
  getEquippedParts,
  type PartCategory,
} from '../data/characterItems';
import { useCharacterStore } from '../context/characterStore';
import { useProgress } from '../context/progressStore';
import { CHARACTER_NICKNAME } from '../config/progressConfig';
import { LevelCard } from '../components/progress/LevelCard';
import { StreakCard } from '../components/progress/StreakCard';
import { StreakRepairSheet } from '../components/progress/StreakRepairSheet';
import { Toast } from '../components/progress/Toast';
import { AnimatedNumber } from '../components/progress/AnimatedNumber';

// TODO: 사용자 정보 API 연동 전 mock 값
// FitPoint는 상점과 공유하는 캐릭터 저장소에서, 레벨·XP·Streak은 progress 저장소에서 읽음
const MOCK_PROFILE = { nickname: '사용자님' };

const PART_LABEL: Record<PartCategory, string> = { head: '머리', clothes: '의상', acc: '액세서리' };
const PART_ORDER: PartCategory[] = ['head', 'clothes', 'acc'];

// 공통 카드: 흰색 + 둥근 모서리 + 얇은 테두리
const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm';

/** 불러오는 중 자리 표시 (레이아웃이 흔들리지 않도록 실제 카드와 비슷한 높이) */
const Skeleton: React.FC<{ className: string }> = ({ className }) => (
  <div className={`rounded-2xl bg-white/70 border border-gray-100 animate-pulse ${className}`} aria-hidden="true" />
);

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  // 상점에서 바꾼 FitPoint/보유/착용/배경 상태를 그대로 표시
  const { fitPoint, ownedIds, currentCharacterId, equippedByCharacter, backgroundId } = useCharacterStore();
  const {
    character: progress,
    streak,
    status,
    errorMessage,
    isMock,
    refresh,
    repairStreak,
    checkCelebrationOnEntry,
  } = useProgress();

  const [repairOpen, setRepairOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);

  const character = findCharacter(currentCharacterId);
  const equippedIds = equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED;
  const background = BACKGROUND_ITEMS.find((item) => item.id === backgroundId) ?? null;
  const myPageEquippedParts = useMemo(
    () => getEquippedParts(character, equippedIds),
    [character, equippedIds],
  );

  // 레벨업 축하: 마이페이지 진입마다 한 번만 판단 (첫 진입이면 표시 없이 현재 레벨만 기억 — 설계서 5.4)
  const entryChecked = useRef(false);
  useEffect(() => {
    if (entryChecked.current || !progress) return;
    entryChecked.current = true;
    checkCelebrationOnEntry();
  }, [progress, checkCelebrationOnEntry]);

  // 파츠별 착용/미착용 요약
  const equippedSummary = PART_ORDER.map((category) => ({
    category,
    label: PART_LABEL[category],
    itemName: findPart(category, equippedIds[category])?.name ?? null,
  }));

  // 실제 보유 목록(공유 상태)에 있는 파츠/배경만 표시
  const ownedItems = [
    ...PART_ORDER.flatMap((category) =>
      PART_ITEMS[category]
        .filter((item) => ownedIds.has(item.id))
        .map((item) => ({ id: item.id, name: item.name, category, inUse: equippedIds[category] === item.id })),
    ),
    ...BACKGROUND_ITEMS.filter((item) => ownedIds.has(item.id)).map((item) => ({
      id: item.id,
      name: item.name,
      category: 'bg' as const,
      inUse: item.id === backgroundId,
    })),
  ];

  const goMissions = useCallback(() => navigate('/missions'), [navigate]);
  const closeRepair = useCallback(() => setRepairOpen(false), []);
  const closeToast = useCallback(() => setToast(null), []);
  const handleRepaired = useCallback((keptDays: number) => {
    setRepairOpen(false);
    setToast((previous) => ({ message: `${keptDays}일 연속 기록을 지켰어요!`, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-24 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 - 보유 FitPoint 노출 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 flex items-center justify-center text-gray-700">
              <Menu size={ICON_SIZE.nav} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-base font-bold text-gray-800">마이페이지</h1>
              <FitPointChip amount={fitPoint} />
            </div>
          </div>
          <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <User size={ICON_SIZE.nav} aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 불러오기 실패 안내 (이전 값이 있으면 그대로 보여주고 다시 시도만 제공) */}
        {errorMessage && (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-3.5 py-2.5">
            <p className="text-xs font-bold text-rose-600">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-rose-600 border border-rose-200 cursor-pointer"
            >
              <RefreshCw size={12} aria-hidden="true" />
              다시 시도
            </button>
          </div>
        )}

        {/* 1. 프로필 - 닉네임, 캐릭터 레벨, 연속 달성 일수 */}
        <section className={`${CARD} p-4 flex items-center gap-3`} aria-label="프로필">
          <span className="shrink-0 w-12 h-12 rounded-full bg-[#DDF3E8] text-[#2F8A5B] flex items-center justify-center">
            <PawPrint size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="text-base font-bold text-gray-800 truncate">{MOCK_PROFILE.nickname}</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center bg-[#DCEEFF] text-sky-800 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                Lv.{progress ? progress.level : '-'} · {CHARACTER_NICKNAME}
              </span>
              {streak && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold whitespace-nowrap ${
                    streak.currentStreak > 0 ? 'text-orange-500' : 'text-gray-400'
                  }`}
                >
                  <Flame size={12} aria-hidden="true" />
                  {streak.currentStreak > 0 ? `${streak.currentStreak}일 연속` : '연속 기록 0일'}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 2. 연속 기록 (Streak) */}
        {streak ? (
          <StreakCard streak={streak} isMock={isMock} onOpenRepair={() => setRepairOpen(true)} onGoMissions={goMissions} />
        ) : status === 'loading' ? (
          <Skeleton className="h-40" />
        ) : null}

        {/* 3. 내 캐릭터 + 레벨·XP */}
        <section className={`${CARD} p-3 space-y-3`} aria-label="내 캐릭터">
          <div className="flex justify-between items-center px-1">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <PawPrint size={ICON_SIZE.title} className="text-[#2F8A5B]" aria-hidden="true" />
              내 캐릭터 · {CHARACTER_NICKNAME}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#2F8A5B] bg-[#DDF3E8] rounded-full pl-2.5 pr-1.5 py-1 cursor-pointer hover:brightness-95"
            >
              <Palette size={12} aria-hidden="true" />
              꾸미러 가기
              <ChevronRight size={12} aria-hidden="true" />
            </button>
          </div>
          <CharacterStage
            equippedParts={myPageEquippedParts}
            label={`${CHARACTER_NICKNAME} 캐릭터`}
            statusText={`${character.name} · ${background?.name ?? '기본 배경'}`}
            backgroundSrc={background?.imageSrc ?? null}
          />
          {progress ? <LevelCard progress={progress} isMock={isMock} /> : status === 'loading' ? <Skeleton className="h-28" /> : null}
          <ul className="grid grid-cols-3 gap-2">
            {equippedSummary.map((part) => {
              const PartIcon = CATEGORY_ICON[part.category];
              return (
                <li
                  key={part.category}
                  className={`rounded-xl border px-2 py-2 text-center ${
                    part.itemName ? 'bg-[#DDF3E8] border-[#59B985]/30' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <p className="flex items-center justify-center gap-1 text-[11px] text-gray-500">
                    <PartIcon size={ICON_SIZE.badge} aria-hidden="true" />
                    {part.label}
                  </p>
                  <p className={`text-xs font-bold truncate mt-0.5 ${part.itemName ? 'text-[#2F8A5B]' : 'text-gray-400'}`}>
                    {part.itemName ?? '미착용'}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 4. 포인트(FP)와 경험치(XP) — 쓰는 값과 쌓이는 값을 색으로 구분 */}
        <section className="grid grid-cols-2 gap-3" aria-label="FitPoint와 경험치">
          <div className="rounded-2xl bg-[#FFF6D9] border border-[#FFE8A8] px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <span className="w-6 h-6 rounded-full bg-[#FFE8A8] flex items-center justify-center text-amber-700">
                <Gem size={ICON_SIZE.inline} aria-hidden="true" />
              </span>
              FitPoint
            </p>
            <p className="mt-1.5 text-lg font-extrabold text-amber-900 leading-none">
              <AnimatedNumber value={fitPoint} /> <span className="text-xs font-bold">FP</span>
            </p>
            <p className="mt-1 text-[10px] text-amber-800/70">상점·기록 복구에 쓰는 포인트</p>
          </div>
          <div className="rounded-2xl bg-[#EEF7FF] border border-[#DCEEFF] px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
              <span className="w-6 h-6 rounded-full bg-[#DCEEFF] flex items-center justify-center text-sky-700">
                <Sparkles size={ICON_SIZE.inline} aria-hidden="true" />
              </span>
              경험치
            </p>
            <p className="mt-1.5 text-lg font-extrabold text-sky-800 leading-none">
              {progress ? <AnimatedNumber value={progress.totalEarnedXp} /> : '-'} <span className="text-xs font-bold">XP</span>
            </p>
            <p className="mt-1 text-[10px] text-sky-800/70">미션으로 쌓이고 줄지 않아요</p>
          </div>
        </section>

        {/* 5. 보유 아이템 - 공유 상태의 실제 보유 목록 */}
        <section className={`${CARD} p-4 space-y-3`} aria-label="보유 아이템">
          <div className="flex justify-between items-center">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <Package size={ICON_SIZE.title} className="text-[#2F8A5B]" aria-hidden="true" />
              보유 아이템
            </h2>
            <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full">
              {ownedItems.length}개
            </span>
          </div>
          {ownedItems.length > 0 ? (
            <ul className="space-y-1.5">
              {ownedItems.map((item) => {
                const ItemIcon = CATEGORY_ICON[item.category];
                return (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <span className="flex items-center gap-2 min-w-0 text-sm text-gray-800">
                      <ItemIcon size={ICON_SIZE.inline} className="shrink-0 text-gray-400" aria-hidden="true" />
                      <span className="truncate">{item.name}</span>
                    </span>
                    {item.inUse ? (
                      <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#59B985] text-white">
                        {item.category === 'bg' ? '적용 중' : '착용 중'}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DCEEFF] text-sky-800">
                        보유 중
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">보유한 아이템이 없어요.</p>
          )}
        </section>

        {/* 6. 설정 */}
        <section className="space-y-2" aria-label="설정">
          <h2 className="text-sm font-bold text-gray-800 px-1">설정</h2>

          <div className={`${CARD} p-4 flex justify-between items-center gap-3`}>
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#DCEEFF] text-sky-700 flex items-center justify-center shrink-0">
                <UserPen size={ICON_SIZE.title} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-800">프로필</p>
                <p className="text-xs text-gray-500 mt-0.5">이름과 기본 정보 관리</p>
              </div>
            </div>
            {/* TODO: 정보 관리 화면(라우트)이 아직 없어 비활성 */}
            <button
              type="button"
              disabled
              title="정보 관리 화면 준비 중"
              className="shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
            >
              수정 · 준비 중
            </button>
          </div>

          <div className={`${CARD} p-4 flex justify-between items-center gap-3`}>
            <div className="flex items-start gap-2.5">
              <span className="w-8 h-8 rounded-full bg-[#FFE8A8] text-amber-700 flex items-center justify-center shrink-0">
                <Bell size={ICON_SIZE.title} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-800">운동 알림</p>
                <p className="text-xs text-gray-500 mt-0.5">매일 운동할 시간을 알려드려요</p>
                <p className="text-[11px] text-gray-400 mt-0.5">OS 푸시 알림 연동 준비 중</p>
              </div>
            </div>
            {/* TODO: OS 푸시 설정 연동 전까지 토글 비활성 (실제 알림 설정이 바뀌는 것처럼 보이지 않도록) */}
            <button
              type="button"
              role="switch"
              aria-checked={false}
              aria-label="운동 알림 (준비 중)"
              disabled
              className="shrink-0 relative w-12 h-7 rounded-full bg-gray-200 cursor-not-allowed"
            >
              <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </section>
      </div>

      {/* 복구 팝업: [기록 복구하기]를 눌렀을 때만 (UI 12) */}
      {repairOpen && streak && (
        <StreakRepairSheet
          streak={streak}
          balance={fitPoint}
          isMock={isMock}
          onClose={closeRepair}
          onSubmit={repairStreak}
          onSuccess={handleRepaired}
          onGoMissions={goMissions}
        />
      )}
      {/* 복구 완료 안내 (UI 13) */}
      {toast && <Toast key={toast.seq} message={toast.message} onClose={closeToast} />}

      <BottomNav active="mypage" />
    </div>
  );
};
