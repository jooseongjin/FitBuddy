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
  /** 서버 응답의 잔액(balance)을 반영. 화면에서 직접 더하거나 빼지 않는다 (설계서 4.1) */
  setFitPoint: (balance: number) => void;
  /** FP 차감 공통 함수 (상점 구매). 잔액이 부족하면 false, 아무것도 바꾸지 않음. 성공하면 FitPoint 내역에 기록 */
  spendFitPoint: (amount: number, itemName?: string) => boolean;
  /** /dev/ui 초기화용: 보유·착용·캐릭터·배경을 처음 상태로 */
  resetCharacterState: () => void;
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

// 실제 서버 모드에서 잔액 조회 전 표시값. mock 모드는 mock 서버 잔액(거래 내역 합계)을 사용
export const INITIAL_FIT_POINT = 0;

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
