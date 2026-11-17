import React, { useMemo } from 'react';
import { CharacterCanvas } from './CharacterCanvas';
import { useCharacterStore } from '../context/characterStore';
import { BACKGROUND_ITEMS, EMPTY_EQUIPPED, findCharacter, getEquippedParts } from '../data/characterItems';

/**
 * 동그란 캐릭터 아바타: 지금 캐릭터 + 실제 착용 중인 아이템 + 적용한 배경
 * (상점 미리 착용은 반영하지 않음 — 공용 상태의 실제 착용·배경만 사용)
 * 전신 그림을 확대해 얼굴 위주로 보이도록 잘라서 표시
 */
export const CharacterAvatar: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const { currentCharacterId, equippedByCharacter, backgroundId } = useCharacterStore();
  const character = findCharacter(currentCharacterId);
  const parts = useMemo(
    () => getEquippedParts(findCharacter(currentCharacterId), equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED),
    [currentCharacterId, equippedByCharacter],
  );
  const background = BACKGROUND_ITEMS.find((item) => item.id === backgroundId) ?? null;

  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm ${className} ${
        background ? 'bg-cover bg-center' : 'bg-[radial-gradient(circle_at_50%_40%,#F2FBF6_0%,#DDF3E8_75%)]'
      }`}
      style={background ? { backgroundImage: `url(${background.imageSrc})` } : undefined}
    >
      {/* 전신을 1.25배로 키우고 살짝 올려 얼굴·귀·모자가 원 안에 들어오도록 (토끼 긴 귀까지 확인) */}
      <span className="absolute left-1/2 top-[-4%] w-[125%] h-[125%] -translate-x-1/2" aria-hidden="true">
        <CharacterCanvas equippedParts={parts} size="fill" label={`${character.name} 아바타`} />
      </span>
    </span>
  );
};
