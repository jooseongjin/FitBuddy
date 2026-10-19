import React, { useMemo } from 'react';
import { Bell, Flame, Gem, Menu, Package, PawPrint, User, UserPen } from 'lucide-react';
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

// TODO: 사용자 정보 API 연동 전 mock 값 (홈/미션 화면에 표시되는 값과 동일)
// FitPoint는 상점과 공유하는 캐릭터 저장소에서 읽음
const MOCK_PROFILE = {
  nickname: '사용자님',
  characterName: '두리',
  level: 'LEVEL 08',
  streakDays: 7,
};

const PART_LABEL: Record<PartCategory, string> = { head: '머리', clothes: '의상', acc: '액세서리' };
const PART_ORDER: PartCategory[] = ['head', 'clothes', 'acc'];

// 공통 카드: 흰색 + 둥근 모서리 + 얇은 테두리
const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm';

export const MyPage: React.FC = () => {
  // 상점에서 바꾼 FitPoint/보유/착용/배경 상태를 그대로 표시
  const { fitPoint, ownedIds, currentCharacterId, equippedByCharacter, backgroundId } = useCharacterStore();

  const character = findCharacter(currentCharacterId);
  const equippedIds = equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED;
  const background = BACKGROUND_ITEMS.find((item) => item.id === backgroundId) ?? null;
  const myPageEquippedParts = useMemo(
    () => getEquippedParts(character, equippedIds),
    [character, equippedIds],
  );

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
        {/* 1. 사용자 프로필 - 닉네임, 캐릭터 레벨, 연속 달성 일수 */}
        <section className={`${CARD} p-4`} aria-label="프로필">
          <div className="flex justify-between items-start gap-2">
            <h2 className="text-base font-bold text-gray-800">{MOCK_PROFILE.nickname}</h2>
            <span className="shrink-0 bg-[#DCEEFF] text-sky-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
              {MOCK_PROFILE.level} · {MOCK_PROFILE.characterName}
            </span>
          </div>
          <p className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <Flame size={ICON_SIZE.inline} className="text-orange-500" aria-hidden="true" />
            <span className="font-semibold text-orange-500">{MOCK_PROFILE.streakDays}일 연속</span>
            · 오늘도 가볍게!
          </p>
        </section>

        {/* 2. 내 캐릭터 - 현재 착용 중인 캐릭터와 아이템 */}
        <section className={`${CARD} p-3 space-y-3`} aria-label="내 캐릭터">
          <div className="flex justify-between items-center px-1">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
              <PawPrint size={ICON_SIZE.title} className="text-[#2F8A5B]" aria-hidden="true" />
              내 캐릭터 · {MOCK_PROFILE.characterName}
            </h2>
            <span className="text-xs font-bold text-[#2F8A5B]">{MOCK_PROFILE.level}</span>
          </div>
          <CharacterStage
            equippedParts={myPageEquippedParts}
            label={`${MOCK_PROFILE.characterName} 캐릭터`}
            statusText={`${character.name} · ${background?.name ?? '기본 배경'}`}
            backgroundSrc={background?.imageSrc ?? null}
          />
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

        {/* 3. FitPoint - 연한 노란색 (포인트/보상 정보) */}
        <section className="bg-[#FFF6D9] border border-[#FFE8A8] rounded-2xl px-4 py-3.5 flex justify-between items-center" aria-label="FitPoint">
          <span className="flex items-center gap-1.5 text-sm text-gray-700">
            <span className="w-6 h-6 rounded-full bg-[#FFE8A8] flex items-center justify-center text-amber-700">
              <Gem size={ICON_SIZE.inline} aria-hidden="true" />
            </span>
            현재 FitPoint
          </span>
          <span className="text-sm font-extrabold text-amber-900 tabular-nums">
            {fitPoint.toLocaleString()} FitPoint
          </span>
        </section>

        {/* 4. 보유 아이템 - 공유 상태의 실제 보유 목록 */}
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

        {/* 5. 설정 */}
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

      <BottomNav active="mypage" />
    </div>
  );
};
