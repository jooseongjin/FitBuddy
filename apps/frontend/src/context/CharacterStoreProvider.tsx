import React, { useMemo, useState } from 'react';
import {
  CharacterStoreContext,
  INITIAL_CHARACTER_ID,
  INITIAL_EQUIPPED_BY_CHARACTER,
  INITIAL_FIT_POINT,
  INITIAL_OWNED_IDS,
  type CharacterStore,
} from './characterStore';

// TODO: 서버 연동 전까지 메모리에만 보관 (새로고침 시 초기값으로 돌아감)
export const CharacterStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fitPoint, setFitPoint] = useState(INITIAL_FIT_POINT);
  const [ownedIds, setOwnedIds] = useState(INITIAL_OWNED_IDS);
  const [currentCharacterId, setCurrentCharacterId] = useState(INITIAL_CHARACTER_ID);
  const [equippedByCharacter, setEquippedByCharacter] = useState(INITIAL_EQUIPPED_BY_CHARACTER);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);

  const value = useMemo<CharacterStore>(
    () => ({
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
    }),
    [fitPoint, ownedIds, currentCharacterId, equippedByCharacter, backgroundId],
  );

  return <CharacterStoreContext.Provider value={value}>{children}</CharacterStoreContext.Provider>;
};
