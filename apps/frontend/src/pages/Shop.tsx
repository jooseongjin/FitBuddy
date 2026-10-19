import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CircleAlert, CircleCheck, Eye, EyeOff, Gem, Info, Lock, Menu, Palette, Target, User } from 'lucide-react';
import { CharacterCanvas, type CharacterRig, type EquippedParts } from '../components/CharacterCanvas';
import { ItemThumb, type IconImage } from '../components/ItemThumb';
import { BottomNav } from '../components/BottomNav';
import { CharacterStage } from '../components/CharacterStage';
import { FitPointChip } from '../components/FitPointChip';
import { CATEGORY_ICON, ICON_SIZE } from '../components/categoryIcons';
import {
  BACKGROUND_ITEMS,
  CHARACTERS,
  EMPTY_EQUIPPED,
  PART_ITEMS,
  findCharacter,
  getEquippedParts,
  type PartCategory,
} from '../data/characterItems';
import { useCharacterStore } from '../context/characterStore';

type ShopTab = 'character' | PartCategory | 'bg';
// 미리 착용은 파츠와 배경에만 적용 (캐릭터는 보유 캐릭터 교체만 지원)
type PreviewTab = PartCategory | 'bg';

// 카드 썸네일 종류: 캐릭터는 미리보기와 같은 기준(rig)으로, 아이템은 그림 영역만 잘라서, 배경은 이미지 그대로
type ShopThumb =
  | { kind: 'character'; rig: CharacterRig }
  | { kind: 'icon'; icon: IconImage }
  | { kind: 'image'; src: string };

// 탭 종류와 관계없이 카드 하나를 그리기 위한 공통 형태
type ShopEntry = {
  id: string;
  name: string;
  price: number;
  // 이미지가 없으면 null → 잠금 아이콘
  thumb: ShopThumb | null;
  bgColor: string;
  // 이미지 에셋이 없는 항목은 false → 잠금(준비 중) 카드로 표시
  available: boolean;
};

type Preview = { tab: PreviewTab; id: string };

type Feedback =
  | { type: 'insufficient'; entry: ShopEntry; shortage: number }
  | { type: 'purchased' | 'activated' | 'deactivated' | 'previewOn' | 'previewOff'; entry: ShopEntry; tab: ShopTab };

// 상점 색상 기준
const COLOR = {
  page: '#F8F5EC',
  preview: '#DDF3E8',
  primary: '#59B985',
  sub: '#DCEEFF',
  point: '#FFE8A8',
};

const TABS: { key: ShopTab; label: string; title: string }[] = [
  { key: 'character', label: '캐릭터', title: '캐릭터' },
  { key: 'head', label: '머리', title: '머리 파츠' },
  { key: 'clothes', label: '의상', title: '의상 파츠' },
  { key: 'acc', label: '액세서리', title: '액세서리 파츠' },
  { key: 'bg', label: '배경', title: '배경' },
];

const ACTIVATE_LABEL: Record<ShopTab, string> = {
  character: '캐릭터 교체',
  head: '장착하기',
  clothes: '장착하기',
  acc: '장착하기',
  bg: '배경 적용',
};

const EMPTY_MESSAGE: Record<ShopTab, string> = {
  character: '등록된 캐릭터가 없습니다.',
  head: '등록된 아이템이 없습니다.',
  clothes: '등록된 아이템이 없습니다.',
  acc: '등록된 액세서리가 아직 없어요.',
  bg: '등록된 배경이 아직 없어요. 지금은 기본 배경을 사용 중이에요.',
};

const isPreviewTab = (tab: ShopTab): tab is PreviewTab => tab !== 'character';

const getEntries = (tab: ShopTab): ShopEntry[] => {
  if (tab === 'character') {
    return CHARACTERS.map((character) => ({
      id: character.id,
      name: character.name,
      price: character.price,
      thumb: character.rig ? { kind: 'character', rig: character.rig } : null,
      bgColor: COLOR.preview,
      available: character.rig !== null,
    }));
  }
  if (tab === 'bg') {
    return BACKGROUND_ITEMS.map((background) => ({
      id: background.id,
      name: background.name,
      price: background.price,
      thumb: { kind: 'image', src: background.thumbSrc },
      bgColor: COLOR.sub,
      available: true,
    }));
  }
  return PART_ITEMS[tab].map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    thumb: item.icon ? { kind: 'icon', icon: item.icon } : null,
    bgColor: item.bgColor,
    available: true,
  }));
};

// 받침 유무에 따라 조사 선택 (을/를, 은/는)
const withParticle = (word: string, withBatchim: string, withoutBatchim: string) => {
  const code = word.charCodeAt(word.length - 1);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
};

// 캐릭터 카드 썸네일: 기본 레이어만 미리보기와 같은 표시 영역으로 그림
const CharacterThumb: React.FC<{ rig: CharacterRig }> = ({ rig }) => {
  const parts = useMemo<EquippedParts>(
    () => ({ base: rig, clothes: null, head: null, acc: null }),
    [rig],
  );
  return (
    <div className="h-[92%] flex items-center justify-center">
      <CharacterCanvas equippedParts={parts} size="thumb" label="캐릭터 썸네일" />
    </div>
  );
};

// 카드 썸네일. 이미지가 없으면 잠금 아이콘, 로딩 실패 시 숨김
const Thumb: React.FC<{ thumb: ShopThumb | null }> = ({ thumb }) => {
  if (!thumb) return <Lock size={ICON_SIZE.tab} className="text-gray-300" aria-hidden="true" />;
  if (thumb.kind === 'character') return <CharacterThumb rig={thumb.rig} />;
  if (thumb.kind === 'icon') return <ItemThumb icon={thumb.icon} />;
  // 배경 썸네일은 카드 이미지 영역을 꽉 채움
  return (
    <img
      src={thumb.src}
      alt=""
      className="w-full h-full object-cover"
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
    />
  );
};

export const Shop: React.FC = () => {
  const navigate = useNavigate();

  // 마이페이지와 공유하는 상태 (FitPoint, 보유 목록, 캐릭터, 착용, 배경)
  const {
    fitPoint,
    setFitPoint,
    ownedIds,
    setOwnedIds,
    currentCharacterId,
    setCurrentCharacterId,
    equippedByCharacter,
    setEquippedByCharacter,
    backgroundId,
    setBackgroundId,
  } = useCharacterStore();
  // 미리 착용: 구매/차감/실제 장착 상태와 분리된 화면 전용 임시 상태
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activeTab, setActiveTab] = useState<ShopTab>('head');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const currentCharacter = findCharacter(currentCharacterId);
  const equippedIds = equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED;

  // 화면에 보여줄 착용 상태 = 실제 착용 상태 + 미리 착용 중인 파츠
  const displayedIds = useMemo(
    () =>
      preview && preview.tab !== 'bg'
        ? { ...equippedIds, [preview.tab]: preview.id }
        : equippedIds,
    [equippedIds, preview],
  );
  const background = BACKGROUND_ITEMS.find((item) => item.id === backgroundId) ?? null;
  const displayedBackgroundId = preview?.tab === 'bg' ? preview.id : backgroundId;
  const displayedBackground = BACKGROUND_ITEMS.find((item) => item.id === displayedBackgroundId) ?? null;

  const entries = getEntries(activeTab);
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null;
  const activeTabInfo = TABS.find((tab) => tab.key === activeTab);
  const previewEntry = preview
    ? getEntries(preview.tab).find((entry) => entry.id === preview.id) ?? null
    : null;

  const equippedParts = useMemo(
    () => getEquippedParts(currentCharacter, displayedIds),
    [currentCharacter, displayedIds],
  );

  const isOwned = (entry: ShopEntry) => ownedIds.has(entry.id);
  const isPreviewing = (entry: ShopEntry) =>
    preview !== null && preview.tab === activeTab && preview.id === entry.id;

  const isActive = (entry: ShopEntry) => {
    if (activeTab === 'character') return entry.id === currentCharacterId;
    if (activeTab === 'bg') return entry.id === backgroundId;
    return equippedIds[activeTab] === entry.id;
  };

  const updateEquipped = (category: PartCategory, itemId: string | null) => {
    setEquippedByCharacter((previous) => ({
      ...previous,
      [currentCharacterId]: {
        ...(previous[currentCharacterId] ?? EMPTY_EQUIPPED),
        [category]: itemId,
      },
    }));
  };

  const handleTabChange = (tab: ShopTab) => {
    setActiveTab(tab);
    setSelectedId(null);
    setPreview(null);
    setFeedback(null);
  };

  const handlePurchase = (entry: ShopEntry) => {
    // 준비 중이거나 이미 보유한 항목은 구매 불가 (중복 구매 방지)
    if (!entry.available || isOwned(entry)) return;

    // 구매 전 클라이언트에서 잔액 선검증
    if (fitPoint < entry.price) {
      setFeedback({ type: 'insufficient', entry, shortage: entry.price - fitPoint });
      return;
    }

    setFitPoint((previous) => previous - entry.price);
    setOwnedIds((previous) => new Set(previous).add(entry.id));
    // 구매만 하고 장착은 별도 동작이므로 미리보기는 종료
    setPreview(null);
    setFeedback({ type: 'purchased', entry, tab: activeTab });
  };

  const handleActivate = (entry: ShopEntry) => {
    if (!entry.available || !isOwned(entry)) return;

    if (activeTab === 'character') setCurrentCharacterId(entry.id);
    else if (activeTab === 'bg') setBackgroundId(entry.id);
    // 같은 카테고리에 착용 중이던 아이템은 자동으로 보유 상태가 됨
    else updateEquipped(activeTab, entry.id);

    setPreview(null);
    setFeedback({ type: 'activated', entry, tab: activeTab });
  };

  const handleDeactivate = (entry: ShopEntry) => {
    // 캐릭터는 해제 개념이 없음 (다른 캐릭터로 교체만 가능)
    if (activeTab === 'character') return;

    if (activeTab === 'bg') setBackgroundId(null);
    // 착용 해제 시 해당 레이어를 비워 기본 파츠 상태로 복구 (환불 없음)
    else updateEquipped(activeTab, null);

    setPreview(null);
    setFeedback({ type: 'deactivated', entry, tab: activeTab });
  };

  // 미보유 아이템을 구매 없이 캐릭터에 임시로 적용 / 해제
  const handleTogglePreview = (entry: ShopEntry) => {
    if (!isPreviewTab(activeTab) || !entry.available || isOwned(entry)) return;

    if (isPreviewing(entry)) {
      setPreview(null);
      setFeedback({ type: 'previewOff', entry, tab: activeTab });
      return;
    }
    setPreview({ tab: activeTab, id: entry.id });
    setFeedback({ type: 'previewOn', entry, tab: activeTab });
  };

  const handleCardClick = (entry: ShopEntry) => {
    if (!entry.available) return;
    // 선택된 착용 중 아이템/배경을 다시 터치하면 해제
    if (entry.id === selectedId && isActive(entry) && activeTab !== 'character') {
      handleDeactivate(entry);
      return;
    }
    // 다른 아이템을 고르면 이전 미리보기는 종료
    if (preview && preview.id !== entry.id) setPreview(null);
    setSelectedId(entry.id);
    setFeedback(null);
  };

  // suffix: 좁은 화면에서는 숨기는 보조 문구 (예: 가격)
  type Action = { label: string; disabled: boolean; run: () => void; suffix?: string };
  const NONE = () => {};

  const getPrimaryAction = (): Action => {
    if (!selectedEntry) return { label: 'FitPoint로 구매하기', disabled: true, run: NONE };
    if (!selectedEntry.available) return { label: '준비 중', disabled: true, run: NONE };
    if (!isOwned(selectedEntry)) {
      return {
        label: 'FitPoint로 구매하기',
        suffix: ` · ${selectedEntry.price.toLocaleString()} FP`,
        disabled: feedback?.type === 'insufficient',
        run: () => handlePurchase(selectedEntry),
      };
    }
    if (isActive(selectedEntry)) {
      if (activeTab === 'character') return { label: '사용 중', disabled: true, run: NONE };
      return {
        label: activeTab === 'bg' ? '배경 해제' : '착용 해제',
        disabled: false,
        run: () => handleDeactivate(selectedEntry),
      };
    }
    return { label: ACTIVATE_LABEL[activeTab], disabled: false, run: () => handleActivate(selectedEntry) };
  };

  // 미리 착용 버튼은 아이템 미선택 시(비활성) 또는 미보유 파츠/배경 선택 시에만 노출
  const getPreviewAction = (): Action | null => {
    if (!selectedEntry) return { label: '미리 착용하기', disabled: true, run: NONE };
    if (!isPreviewTab(activeTab) || !selectedEntry.available || isOwned(selectedEntry)) return null;
    return {
      label: isPreviewing(selectedEntry) ? '미리보기 끄기' : '미리 착용하기',
      disabled: false,
      run: () => handleTogglePreview(selectedEntry),
    };
  };

  const primaryAction = getPrimaryAction();
  const previewAction = getPreviewAction();
  const isDeactivateAction = primaryAction.label === '착용 해제' || primaryAction.label === '배경 해제';

  const renderMessage = () => {
    if (feedback?.type === 'insufficient') {
      return (
        <div className="flex flex-col items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          <p className="flex items-center gap-1.5 text-rose-600 font-bold">
            <CircleAlert size={ICON_SIZE.inline} aria-hidden="true" />
            {feedback.entry.name} · {feedback.entry.price.toLocaleString()} FP · {feedback.shortage.toLocaleString()} FitPoint 부족
          </p>
          <p className="text-gray-500">FitPoint가 부족해 구매할 수 없어요. 미션을 완료하면 FitPoint를 받을 수 있어요.</p>
          <button
            type="button"
            onClick={() => navigate('/missions')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2F8A5B] bg-white border border-[#59B985]/40 px-3 py-1 rounded-full cursor-pointer"
          >
            <Target size={ICON_SIZE.badge} aria-hidden="true" />
            미션 수행하고 FitPoint 모으기
          </button>
        </div>
      );
    }

    let icon = <Info size={ICON_SIZE.inline} className="shrink-0 text-gray-400" aria-hidden="true" />;
    let lines: string[];
    if (feedback?.type === 'purchased') {
      icon = <CircleCheck size={ICON_SIZE.inline} className="shrink-0 text-[#2F8A5B]" aria-hidden="true" />;
      lines = [
        `${feedback.entry.name} 구매 완료 · -${feedback.entry.price.toLocaleString()} FP · ${ACTIVATE_LABEL[feedback.tab].replace('하기', '')} 가능`,
        '이미 보유한 항목은 다시 구매할 수 없어요.',
      ];
    } else if (feedback?.type === 'previewOn') {
      icon = <Eye size={ICON_SIZE.inline} className="shrink-0 text-sky-700" aria-hidden="true" />;
      lines = [`${feedback.entry.name} 미리 착용 중 · 구매 전이라 FitPoint는 차감되지 않아요`];
    } else if (feedback?.type === 'previewOff') {
      lines = ['미리보기를 종료했어요'];
    } else if (feedback?.type === 'activated') {
      icon = <CircleCheck size={ICON_SIZE.inline} className="shrink-0 text-[#2F8A5B]" aria-hidden="true" />;
      if (feedback.tab === 'character') lines = [`캐릭터 교체 완료 · ${feedback.entry.name}`];
      else if (feedback.tab === 'bg') lines = [`${withParticle(feedback.entry.name, '을', '를')} 배경으로 적용했어요`];
      else lines = [`${withParticle(feedback.entry.name, '을', '를')} 착용했어요`];
    } else if (feedback?.type === 'deactivated') {
      lines = [
        feedback.tab === 'bg'
          ? '배경 해제 완료 · 기본 배경으로 돌아왔어요'
          : `착용 해제 완료 · ${withParticle(feedback.entry.name, '은', '는')} 보유 중`,
      ];
    } else if (!selectedEntry) {
      lines = ['아이템을 선택해 주세요'];
    } else if (!isOwned(selectedEntry)) {
      lines = [`${selectedEntry.name} 선택 · 미보유 · ${selectedEntry.price.toLocaleString()} FP`];
    } else {
      lines = [`${selectedEntry.name} 선택 · ${isActive(selectedEntry) ? '사용 중' : '보유 중'}`];
    }

    return (
      <div className="flex items-start justify-center gap-1.5">
        <span className="mt-px">{icon}</span>
        <div className="text-left space-y-0.5">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    );
  };

  const renderStatusBadge = (entry: ShopEntry) => {
    const base = 'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full';
    if (!entry.available) {
      return (
        <span className={`${base} bg-gray-100 text-gray-500`}>
          <Lock size={ICON_SIZE.badge} aria-hidden="true" />
          잠금 · 준비 중
        </span>
      );
    }
    if (isActive(entry)) {
      return (
        <span className={`${base} bg-[#59B985] text-white`}>
          <Check size={ICON_SIZE.badge} strokeWidth={3} aria-hidden="true" />
          {activeTab === 'character' ? '사용 중' : activeTab === 'bg' ? '적용 중' : '착용 중'}
        </span>
      );
    }
    if (isOwned(entry)) {
      return <span className={`${base} bg-[#DCEEFF] text-sky-800`}>보유 중</span>;
    }
    return (
      <span className={`${base} bg-[#FFE8A8] text-amber-900`}>
        <Gem size={ICON_SIZE.badge} aria-hidden="true" />
        <span className="tabular-nums">{entry.price.toLocaleString()}</span>
      </span>
    );
  };

  const ActiveTabIcon = CATEGORY_ICON[activeTab];

  // 버튼 공통 크기와 상태별 색상 (비활성은 회색 + 그림자 없음으로 확실히 구분)
  const buttonBase =
    'h-10 px-4 rounded-full text-[13px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition';
  const disabledButton = 'bg-gray-100 text-gray-400 cursor-not-allowed';

  return (
    <div className="min-h-screen bg-[#F8F5EC] pb-24 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 - 보유 FitPoint 실시간 노출 */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 flex items-center justify-center text-gray-700">
              <Menu size={ICON_SIZE.nav} aria-hidden="true" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-lg bg-[#DDF3E8] text-[#2F8A5B] flex items-center justify-center">
                  <Palette size={ICON_SIZE.inline} aria-hidden="true" />
                </span>
                <h1 className="text-base font-bold text-gray-800">꾸미기 상점</h1>
              </div>
              <FitPointChip amount={fitPoint} />
            </div>
          </div>
          <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <User size={ICON_SIZE.nav} aria-hidden="true" />
          </span>
        </div>

        {/* 미리 착용 / 구매 / 장착 액션 패널 */}
        <div className="px-4 py-2.5">
          {/* 아주 좁은 화면(360px 미만)에서는 버튼을 세로로 배치해 문구가 꺾이지 않도록 */}
          <div className="flex flex-col min-[360px]:flex-row gap-2">
            {previewAction && (
              <button
                type="button"
                onClick={previewAction.run}
                disabled={previewAction.disabled}
                className={`${buttonBase} w-full min-[360px]:w-auto min-[360px]:flex-1 ${
                  previewAction.disabled
                    ? disabledButton
                    : 'bg-[#DCEEFF] text-sky-800 cursor-pointer hover:brightness-95'
                }`}
              >
                {previewAction.label === '미리보기 끄기' ? (
                  <EyeOff size={ICON_SIZE.title} aria-hidden="true" />
                ) : (
                  <Eye size={ICON_SIZE.title} aria-hidden="true" />
                )}
                {previewAction.label}
              </button>
            )}
            <button
              type="button"
              onClick={primaryAction.run}
              disabled={primaryAction.disabled}
              className={`${buttonBase} w-full min-[360px]:w-auto min-[360px]:flex-[1.4] ${
                primaryAction.disabled
                  ? disabledButton
                  : isDeactivateAction
                    ? 'bg-white text-[#2F8A5B] border-2 border-[#59B985] cursor-pointer'
                    : 'bg-[#59B985] text-white shadow-sm cursor-pointer hover:brightness-95'
              }`}
            >
              {primaryAction.label.startsWith('FitPoint로 구매하기') && (
                <Gem size={ICON_SIZE.inline} aria-hidden="true" />
              )}
              {primaryAction.label}
              {primaryAction.suffix && (
                <span className="hidden min-[400px]:inline -ml-1">{primaryAction.suffix}</span>
              )}
            </button>
          </div>
          <div className="text-[11px] text-gray-500 mt-2" aria-live="polite">
            {renderMessage()}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 캐릭터 미리보기 - 착용 파츠 레이어 병합, 배경은 영역 배경으로 분리 */}
        <CharacterStage
          equippedParts={equippedParts}
          label={`${currentCharacter.name} 미리보기`}
          statusText={`${currentCharacter.name} · ${background?.name ?? '기본 배경'}`}
          backgroundSrc={displayedBackground?.imageSrc ?? null}
          previewName={previewEntry?.name ?? null}
          reservePreviewSpace
        />

        {/* 카테고리 탭 - 아이콘 + 텍스트 5칸 그리드 (좁은 화면에서도 잘리지 않도록) */}
        <div
          className="grid grid-cols-5 gap-1.5"
          role="tablist"
          aria-label="상점 카테고리"
        >
          {TABS.map((tab) => {
            const TabIcon = CATEGORY_ICON[tab.key];
            const selected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => handleTabChange(tab.key)}
                className={`min-w-0 h-14 rounded-2xl text-[12px] flex flex-col items-center justify-center gap-1 cursor-pointer transition border ${
                  selected
                    ? 'bg-[#59B985] border-[#59B985] text-white font-bold shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <TabIcon
                  size={ICON_SIZE.tab}
                 
                  className={selected ? 'text-white' : 'text-gray-400'}
                  aria-hidden="true"
                />
                <span className="leading-none whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
            <ActiveTabIcon size={ICON_SIZE.title} className="text-[#2F8A5B]" aria-hidden="true" />
            {activeTabInfo?.title}
          </h2>
          <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-100 px-2 py-0.5 rounded-full">
            {entries.length}개
          </span>
        </div>

        {/* 아이템 그리드 */}
        {entries.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {entries.map((entry) => {
              const active = isActive(entry);
              const selected = entry.id === selectedId;
              const previewing = isPreviewing(entry);

              // 잠금 캐릭터: 가격/보유 표시 없이 잠금 상태만 표시
              if (!entry.available) {
                return (
                  <button
                    type="button"
                    key={entry.id}
                    disabled
                    aria-pressed={false}
                    aria-label={`${entry.name}, 준비 중`}
                    className="p-2 rounded-2xl text-left border border-dashed border-gray-300 bg-white/60 cursor-not-allowed"
                  >
                    <div className="h-28 rounded-xl bg-gray-100 flex flex-col items-center justify-center gap-1.5">
                      <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400">
                        <Lock size={ICON_SIZE.tab} aria-hidden="true" />
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400">이미지 준비 중</span>
                    </div>
                    <div className="pt-2 px-0.5 space-y-1">
                      <p className="text-sm font-bold text-gray-400 truncate">{entry.name}</p>
                      {renderStatusBadge(entry)}
                    </div>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => handleCardClick(entry)}
                  aria-pressed={selected}
                  aria-label={`${entry.name}, ${active ? '사용 중' : isOwned(entry) ? '보유' : `${entry.price} FitPoint`}`}
                  className={`relative p-2 rounded-2xl text-left border bg-white cursor-pointer transition ${
                    selected
                      ? 'border-[#59B985] ring-2 ring-[#59B985]/40'
                      : 'border-gray-100 shadow-sm'
                  }`}
                >
                  <div
                    className="relative h-28 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: entry.bgColor }}
                  >
                    <Thumb thumb={entry.thumb} />
                    {previewing && (
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 bg-[#DCEEFF] text-sky-800 border border-dashed border-sky-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        <Eye size={ICON_SIZE.badge} aria-hidden="true" /> 미리보기 중
                      </span>
                    )}
                  </div>
                  {/* 선택 표시: 그린 테두리 + 체크 아이콘 */}
                  {selected && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#59B985] border-2 border-white flex items-center justify-center">
                      <Check size={ICON_SIZE.inline} className="text-white" strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                  <div className="pt-2 px-0.5 space-y-1">
                    <p className="text-sm font-bold text-gray-800 truncate">{entry.name}</p>
                    {renderStatusBadge(entry)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-4 flex flex-col items-center gap-2 text-center text-sm text-gray-500 bg-white/70 rounded-2xl border border-dashed border-gray-200">
            <span className="w-10 h-10 rounded-full bg-[#DDF3E8] text-[#2F8A5B] flex items-center justify-center">
              <ActiveTabIcon size={ICON_SIZE.tab} aria-hidden="true" />
            </span>
            {EMPTY_MESSAGE[activeTab]}
          </div>
        )}
      </div>

      <BottomNav active="shop" />
    </div>
  );
};
