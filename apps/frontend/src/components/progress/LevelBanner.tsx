import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { useProgress } from '../../context/progressStore';
import { useCharacterStore } from '../../context/characterStore';
import { EMPTY_EQUIPPED, findCharacter, getEquippedParts } from '../../data/characterItems';
import { getXpProgress } from '../../domain/levelRules';
import { CHARACTER_NICKNAME } from '../../config/progressConfig';
import { CharacterCanvas } from '../CharacterCanvas';
import { CharacterMotion } from './CharacterMotion';

type LevelBannerProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

/**
 * 홈·미션 화면의 캐릭터 레벨 배너 (기존 "LEVEL 08 · 두리" 배너 대체)
 * - 레벨·XP는 공용 상태, 캐릭터는 상점에서 착용한 그대로 (CharacterCanvas + 숨쉬기)
 * - XP 진행 바: 기준이 없으면 "레벨 기준 준비 중", 최대 레벨이면 "최고 레벨"
 */
export const LevelBanner: React.FC<LevelBannerProps> = ({ title, subtitle, className = '' }) => {
  const { character: progress } = useProgress();
  const { currentCharacterId, equippedByCharacter } = useCharacterStore();
  const character = findCharacter(currentCharacterId);
  const equippedIds = equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED;
  const parts = useMemo(() => getEquippedParts(character, equippedIds), [character, equippedIds]);
  const view = progress ? getXpProgress(progress) : null;

  return (
    <div className={`bg-[#EEF7FF] p-4 rounded-2xl border border-[#DCEEFF] flex justify-between items-center gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-[#DCEEFF] text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
            Lv.{progress?.level ?? '-'} · {CHARACTER_NICKNAME}
          </span>
          {progress && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-700 whitespace-nowrap">
              <Sparkles size={11} aria-hidden="true" />
              {progress.totalEarnedXp.toLocaleString()} XP
            </span>
          )}
        </div>
        <h3 className="text-sm font-bold text-gray-800 mt-1">{title}</h3>
        {subtitle && <p className="text-xs text-blue-600 mt-0.5">{subtitle}</p>}
        {view && (
          <div className="mt-2 space-y-1">
            <div className="relative h-1.5 rounded-full bg-white overflow-hidden" aria-hidden="true">
              {view.kind !== 'pending' && (
                <div
                  className="fb-xp-fill animate-fb-fill absolute inset-0 rounded-full bg-gradient-to-r from-sky-300 to-sky-600"
                  style={{ transform: `scaleX(${view.kind === 'max' ? 1 : view.ratio})` }}
                />
              )}
            </div>
            <p className="text-[10px] text-sky-800/80">
              {view.kind === 'progress' && `다음 레벨까지 ${view.remaining.toLocaleString()} XP`}
              {view.kind === 'pending' && '레벨 기준 준비 중이에요'}
              {view.kind === 'max' && '최고 레벨에 도착했어요'}
            </p>
          </div>
        )}
      </div>
      <div className="shrink-0 w-[84px]">
        <CharacterMotion>
          <CharacterCanvas equippedParts={parts} size="shop" label={`${CHARACTER_NICKNAME} 캐릭터`} />
        </CharacterMotion>
      </div>
    </div>
  );
};
