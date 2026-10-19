import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import {
  BACKGROUND_ITEMS,
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  INITIAL_EQUIPPED,
  PART_ITEMS,
  type EquippedIds,
} from '../data/characterItems';

// 상점/마이페이지가 함께 쓰는 캐릭터 꾸미기 상태
// 화면 전용 상태(선택 아이템, 미리보기, 탭, 안내 문구)는 각 페이지에서 관리
export type CharacterStore = {
  fitPoint: number;
  setFitPoint: Dispatch<SetStateAction<number>>;
  ownedIds: Set<string>;
  setOwnedIds: Dispatch<SetStateAction<Set<string>>>;
  currentCharacterId: string;
  setCurrentCharacterId: Dispatch<SetStateAction<string>>;
  // 캐릭터마다 착용 상태를 따로 유지. 카테고리별로 하나만 착용
  equippedByCharacter: Record<string, EquippedIds>;
  setEquippedByCharacter: Dispatch<SetStateAction<Record<string, EquippedIds>>>;
  // null이면 기본 배경
  backgroundId: string | null;
  setBackgroundId: Dispatch<SetStateAction<string | null>>;
};

// TODO: 백엔드 API 연동 전 mock 값 (홈/미션 화면의 하드코딩 값과 동일)
export const INITIAL_FIT_POINT = 2480;

// 아이템 데이터의 owned 값을 초기 보유 목록으로 사용
export const INITIAL_OWNED_IDS = new Set<string>(
  [...CHARACTERS, ...Object.values(PART_ITEMS).flat(), ...BACKGROUND_ITEMS]
    .filter((entry) => entry.owned)
    .map((entry) => entry.id),
);

export const INITIAL_CHARACTER_ID = DEFAULT_CHARACTER_ID;
export const INITIAL_EQUIPPED_BY_CHARACTER = INITIAL_EQUIPPED;

export const CharacterStoreContext = createContext<CharacterStore | null>(null);

export const useCharacterStore = () => {
  const store = useContext(CharacterStoreContext);
  if (!store) throw new Error('useCharacterStore는 CharacterStoreProvider 안에서만 사용할 수 있습니다.');
  return store;
};
