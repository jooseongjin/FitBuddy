import React, { useMemo } from 'react';
import { useProgress } from '../../context/progressStore';
import { useCharacterStore } from '../../context/characterStore';
import { EMPTY_EQUIPPED, findCharacter, getEquippedParts } from '../../data/characterItems';
import { LevelUpCelebration } from './LevelUpCelebration';
import { CHARACTER_NICKNAME } from '../../config/progressConfig';

/**
 * 공용 상태에 축하가 있으면 모달을 띄운다 (ProgressStoreProvider가 한 번만 렌더링)
 * 화면당 모달은 하나 — 떠 있는 동안 같은 이벤트가 또 와도 새로 띄우지 않음 (5.4 E)
 */
export const LevelUpCelebrationHost: React.FC = () => {
  const { celebration, dismissCelebration } = useProgress();
  const { currentCharacterId, equippedByCharacter } = useCharacterStore();

  const character = findCharacter(currentCharacterId);
  const equippedIds = equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED;
  const parts = useMemo(() => getEquippedParts(character, equippedIds), [character, equippedIds]);

  if (!celebration) return null;
  return (
    <LevelUpCelebration
      key={`${celebration.from}-${celebration.to}`}
      from={celebration.from}
      to={celebration.to}
      equippedParts={parts}
      characterName={CHARACTER_NICKNAME}
      onClose={dismissCelebration}
    />
  );
};
