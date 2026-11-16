// 로그인 상태와 계정별 데이터 범위
// - 로그인 여부는 저장된 토큰(JWT) 기준. 계정 정보는 로그인 응답의 user(profileStorage)
// - 이 탭의 mock 데이터(잔액·내역·레벨·Streak·보유·착용)는 "누구의 데이터인지(owner)"를 함께 기억한다.
//   로그아웃하거나 다른 계정으로 들어오면 이전 데이터를 지우고 페이지를 새로 불러와, 이전 사용자의 값이 남지 않게 한다.

import { readProfile } from './profileStorage';

const TOKEN_KEY = 'token';
const SESSION_USER_KEY = 'fb.session.user';
const OWNER_KEY = 'fb.data.owner';
const GUEST = 'guest';

/** 계정별로 지워야 하는 탭 데이터 (mock 서버·캐릭터 상태·레벨업 축하 기록) */
const TAB_DATA_KEYS = ['fb.mock.progress.v1', 'fb.character.v1'];
const TAB_DATA_PREFIXES = ['fb.celebratedLevel.'];

export type AuthState =
  | { loggedIn: true; userId: string; nickname: string | null }
  | { loggedIn: false };

const read = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};

/** 실제 인증 상태: 토큰이 있을 때만 로그인 */
export const readAuthState = (): AuthState => {
  if (!read(() => localStorage, TOKEN_KEY)) return { loggedIn: false };
  const profile = readProfile();
  if (profile.isMock) return { loggedIn: false };
  return { loggedIn: true, userId: profile.userId, nickname: profile.nickname || null };
};

const ownerOf = (auth: AuthState) => (auth.loggedIn ? `user:${auth.userId}` : GUEST);

/** 이 탭의 계정별 데이터 지우기 */
const clearTabData = () => {
  try {
    TAB_DATA_KEYS.forEach((key) => sessionStorage.removeItem(key));
    Object.keys(sessionStorage)
      .filter((key) => TAB_DATA_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // 저장소 사용 불가: 새로 불러오면 메모리 값도 초기화됨
  }
};

/**
 * 앱 시작 시 호출: 이 탭 데이터의 주인이 지금 계정과 다르면 지운다.
 * (다른 탭에서 로그인·로그아웃했거나, 예전 버전에서 남은 데이터 대비)
 * mock 서버·캐릭터 상태가 데이터를 읽기 전에 실행되어야 하므로 main.tsx에서 가장 먼저 import
 */
export const ensureTabDataOwner = () => {
  const owner = ownerOf(readAuthState());
  if (read(() => sessionStorage, OWNER_KEY) === owner) return;
  clearTabData();
  try {
    sessionStorage.setItem(OWNER_KEY, owner);
  } catch {
    // 무시
  }
};

/** 계정 전환(로그인·회원가입 직후): 이전 사용자의 탭 데이터를 지우고 새로 불러와 이동 */
export const enterAccount = (path: string) => {
  ensureTabDataOwner();
  window.location.assign(path);
};

/** 로그아웃: 토큰·계정 정보·이 탭 데이터를 지우고 로그인 화면으로 (뒤로 가기로 이전 화면이 돌아오지 않게 replace) */
export const logout = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // 무시
  }
  clearTabData();
  try {
    sessionStorage.setItem(OWNER_KEY, GUEST);
  } catch {
    // 무시
  }
  window.location.replace('/');
};

/**
 * 뒤로 가기 캐시(bfcache)로 예전 화면이 메모리째 복원될 때, 그사이 로그인 상태가 바뀌었으면 새로 불러온다.
 * (로그아웃 후 뒤로 가기 → 이전 사용자의 닉네임·잔액이 보이지 않게)
 */
export const watchBackForwardRestore = () => {
  const ownerAtLoad = ownerOf(readAuthState());
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && ownerOf(readAuthState()) !== ownerAtLoad) window.location.reload();
  });
};
