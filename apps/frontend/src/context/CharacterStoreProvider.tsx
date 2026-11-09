import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  CharacterStoreContext,
  INITIAL_CHARACTER_ID,
  INITIAL_EQUIPPED_BY_CHARACTER,
  INITIAL_FIT_POINT,
  INITIAL_OWNED_IDS,
  type CharacterStore,
} from './characterStore';
import { progressApi } from '../api/progressClient';
import { mockProgressServer } from '../mocks/mockProgressServer';
import type { EquippedIds } from '../data/characterItems';

// 보유·착용·캐릭터·배경은 서버 연동 전까지 탭 단위 저장(sessionStorage)
// 같은 탭에서는 새로고침해도 유지, 탭을 새로 열면 초기값 (mock 서버 잔액·내역과 같은 기준)
// TODO: API-08 GET /character, API-09 POST /character/customize 연동 시 서버 값으로 교체
const STORAGE_KEY = 'fb.character.v1';

// 이전 버전이 브라우저(localStorage)에 계속 남기던 값은 정리
try {
  localStorage.removeItem(STORAGE_KEY);
} catch {
  // 무시
}

type SavedCharacter = {
  ownedIds: string[];
  currentCharacterId: string;
  equippedByCharacter: Record<string, EquippedIds>;
  backgroundId: string | null;
};

const loadSaved = (): SavedCharacter | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedCharacter;
    return Array.isArray(saved.ownedIds) && typeof saved.currentCharacterId === 'string' ? saved : null;
  } catch {
    return null;
  }
};

const subscribeMock = (onChange: () => void) => mockProgressServer.subscribe(onChange);
const readMockBalance = () => mockProgressServer.balance;

/**
 * 상점·마이페이지·홈이 함께 쓰는 FitPoint·보유·착용 상태
 * - FitPoint 잔액: mock이면 mock 서버 잔액을 그대로 표시 (거래 내역과 항상 일치),
 *   실제 서버면 GET /points/balance 값 + 미션·복구 응답의 balance
 */
export const CharacterStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMock = progressApi.isMock;
  const mockBalance = useSyncExternalStore(subscribeMock, readMockBalance);
  const [serverBalance, setServerBalance] = useState(INITIAL_FIT_POINT);
  const fitPoint = isMock ? mockBalance : serverBalance;

  const [saved] = useState(loadSaved);
  const [ownedIds, setOwnedIds] = useState(() => (saved ? new Set(saved.ownedIds) : INITIAL_OWNED_IDS));
  const [currentCharacterId, setCurrentCharacterId] = useState(saved?.currentCharacterId ?? INITIAL_CHARACTER_ID);
  const [equippedByCharacter, setEquippedByCharacter] = useState(saved?.equippedByCharacter ?? INITIAL_EQUIPPED_BY_CHARACTER);
  const [backgroundId, setBackgroundId] = useState<string | null>(saved?.backgroundId ?? null);

  // 실제 서버: 처음 한 번 잔액 조회 (실패하면 기존 값 유지)
  useEffect(() => {
    if (isMock) return;
    let cancelled = false;
    progressApi.getBalance().then(
      (balance) => {
        if (!cancelled) setServerBalance(balance);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [isMock]);

  useEffect(() => {
    try {
      const data: SavedCharacter = { ownedIds: [...ownedIds], currentCharacterId, equippedByCharacter, backgroundId };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // 저장소 사용 불가: 메모리 값만 유지
    }
  }, [ownedIds, currentCharacterId, equippedByCharacter, backgroundId]);

  // 서버 응답의 잔액 반영. mock은 이미 mock 서버 잔액이 기준이라 값이 다를 때만 맞춤 (/dev/ui 잔액 지정)
  const setFitPoint = useCallback(
    (balance: number) => {
      if (!isMock) setServerBalance(balance);
      else if (mockProgressServer.balance !== balance) mockProgressServer.devSetBalance(balance);
    },
    [isMock],
  );

  // 상점 구매 차감. 잔액이 부족하면 false, 아무것도 바꾸지 않음. XP·레벨과는 무관
  const spendFitPoint = useCallback(
    (amount: number, itemName = '상점 아이템') => {
      if (amount < 0) return false;
      if (isMock) {
        try {
          mockProgressServer.purchase(amount, itemName);
          return true;
        } catch {
          return false;
        }
      }
      // TODO: API-09 연동 전 — 실제 서버 모드에서도 화면에서만 차감 (서버 잔액과 달라질 수 있음)
      if (serverBalance < amount) return false;
      setServerBalance((previous) => previous - amount);
      return true;
    },
    [isMock, serverBalance],
  );

  /** /dev/ui 초기화: 보유·착용·캐릭터·배경을 처음 상태로 */
  const resetCharacterState = useCallback(() => {
    setOwnedIds(INITIAL_OWNED_IDS);
    setCurrentCharacterId(INITIAL_CHARACTER_ID);
    setEquippedByCharacter(INITIAL_EQUIPPED_BY_CHARACTER);
    setBackgroundId(null);
  }, []);

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
      resetCharacterState,
    }),
    [fitPoint, setFitPoint, spendFitPoint, ownedIds, currentCharacterId, equippedByCharacter, backgroundId, resetCharacterState],
  );

  return <CharacterStoreContext.Provider value={value}>{children}</CharacterStoreContext.Provider>;
};
