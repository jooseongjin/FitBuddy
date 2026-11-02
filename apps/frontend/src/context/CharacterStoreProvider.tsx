import React, { useCallback, useMemo, useState } from 'react';
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

  // 서버 연동 후에는 응답의 잔액(balance)으로 setFitPoint 하고, 화면에서 직접 빼지 않는다 (설계서 4.1)
  const spendFitPoint = useCallback(
    (amount: number) => {
      if (amount < 0 || fitPoint < amount) return false;
      setFitPoint((previous) => previous - amount);
      return true;
    },
    [fitPoint],
  );

  const value = useMemo<CharacterStore>(
    () => ({
      fitPoint,
      setFitPoint,
      spendFitPoint,
      ownedIds,
      setOwnedIds,
      currentCharacterId,
      setCurrentCharacterId,
      equippedByCharacter,
      setEquippedByCharacter,
      backgroundId,
      setBackgroundId,
    }),
    [fitPoint, spendFitPoint, ownedIds, currentCharacterId, equippedByCharacter, backgroundId],
  );

  return <CharacterStoreContext.Provider value={value}>{children}</CharacterStoreContext.Provider>;
};
