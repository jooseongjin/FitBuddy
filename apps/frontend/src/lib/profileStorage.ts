// 내 계정·프로필 정보 (마이페이지 > 프로필 수정)
// - 로그인했으면: 로그인 응답의 user(user_number, user_id, nickname)를 그대로 사용 (토큰이 있을 때만)
// - 로그인 없이 대시보드로 시작했으면: 임시 값(MOCK_ACCOUNT)으로 화면 형태만 보여준다
// - 화면에서 수정한 닉네임·이메일은 계정(아이디)별로 브라우저에 저장해 위 값보다 우선 적용
// TODO: 프로필 조회·수정 API(TRD API-17 "내 프로필 조회", 수정 API는 미정)가 생기면 서버 값으로 교체
//   - 로그인 응답에 이메일·가입일이 없어, 로그인한 경우 이메일은 비어 있고 가입일은 '정보 없음'
//   - 운동 목표·시간은 온보딩 화면이 쓰는 키(onboarding_goal, onboarding_time)를 그대로 사용해 온보딩 결과와 맞춘다.

export const GOAL_OPTIONS = [
  { id: 'habit', title: '운동 습관 만들기' },
  { id: 'stamina', title: '기초 체력 기르기' },
  { id: 'health', title: '건강하게 몸 관리하기' },
] as const;

export const TIME_OPTIONS = [
  { id: '5', title: '5분 정도' },
  { id: '10', title: '10분 정도' },
  { id: '20', title: '20분 정도' },
] as const;

export const NICKNAME_MAX = 16; // 백엔드 가입 규칙과 같은 최대 길이
/** 닉네임이 없을 때 표시 (화면에서 뒤에 '님'을 붙임) */
export const DEFAULT_NICKNAME = '사용자';

/** 임시 계정 정보 — 로그인 응답·프로필 API 연동 전까지 화면 형태 확인용 */
const MOCK_ACCOUNT = {
  userNumber: 1,
  userId: 'testuser01',
  nickname: '두리친구',
  email: 'testuser01@fitbuddy.app',
  joinedAt: '2026-11-02',
};

const ACCOUNT_KEY = 'fb.profile.v1';
const SESSION_USER_KEY = 'fb.session.user';
const GOAL_KEY = 'onboarding_goal';
const TIME_KEY = 'onboarding_time';

export type Profile = {
  userNumber: number;
  userId: string;
  nickname: string;
  /** 모르면 '' (로그인 응답에는 이메일이 없음) */
  email: string;
  /** 가입일 (YYYY-MM-DD). 모르면 null */
  joinedAt: string | null;
  goal: string;
  minutes: string;
  /** 계정 정보가 임시 값이면 true → 화면에 "임시 값" 표시 */
  isMock: boolean;
};

export type EditableProfile = Pick<Profile, 'nickname' | 'email' | 'goal' | 'minutes'>;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** 로그인 토큰(JWT) 본문의 user_id. 토큰이 없거나 형식이 다르면 null */
const userIdFromToken = (): string | null => {
  const payload = read('token')?.split('.')[1];
  if (!payload) return null;
  try {
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    return typeof json.user_id === 'string' ? json.user_id : null;
  } catch {
    return null;
  }
};

/** 로그인한 계정. email은 로그인 응답에 없어 회원가입 화면에서 받은 값만 저장 */
type SessionUser = { user_number: number; user_id: string; nickname: string; email?: string };

const readStoredSession = (): SessionUser | null => {
  try {
    const session = JSON.parse(read(SESSION_USER_KEY) ?? 'null') as SessionUser | null;
    return session && typeof session.user_id === 'string' ? session : null;
  } catch {
    return null;
  }
};

/**
 * 로그인 성공 시 응답의 user를 저장 (Login.tsx, 회원가입 직후 자동 로그인 Signup.tsx). 프로필 화면이 이 값을 그대로 보여준다
 * @param extra 회원가입 화면에서 입력한 이메일 (로그인 응답에 없음)
 * @returns 저장 성공 여부
 */
export const saveLoginUser = (user: unknown, extra?: { email?: string }): boolean => {
  const raw = user as Partial<SessionUser> | null;
  if (!raw || typeof raw.user_id !== 'string') {
    // 응답에 user가 없으면 이전 계정 정보가 남지 않도록 지움 (토큰의 아이디만 사용)
    try {
      localStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // 무시
    }
    return false;
  }
  try {
    // 같은 계정으로 다시 로그인하면 가입 때 저장한 이메일을 유지
    const previous = readStoredSession();
    const keptEmail = previous?.user_id === raw.user_id ? previous.email : undefined;
    const session: SessionUser = {
      user_number: typeof raw.user_number === 'number' ? raw.user_number : 0,
      user_id: raw.user_id,
      nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
      // 우선순위: 화면에서 받은 이메일 → 로그인 응답의 email(백엔드가 추가하면 바로 사용) → 같은 계정의 이전 값
      email: extra?.email?.trim() || (typeof (raw as { email?: unknown }).email === 'string' ? (raw as { email: string }).email : undefined) || keptEmail,
    };
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
};

/** 로그인 정보. 토큰이 없으면(로그인하지 않고 시작) null */
const readSessionUser = (): SessionUser | null => {
  if (!read('token')) return null;
  try {
    const session = JSON.parse(read(SESSION_USER_KEY) ?? 'null') as SessionUser | null;
    if (session && typeof session.user_id === 'string') return session;
  } catch {
    // 형식이 다르면 토큰의 아이디만 사용
  }
  const userId = userIdFromToken();
  return userId ? { user_number: 0, user_id: userId, nickname: '' } : null;
};

/** 화면에서 수정한 값. 다른 계정의 수정값은 쓰지 않도록 owner(아이디)로 구분 */
const readSavedAccount = (owner: string): Partial<Pick<Profile, 'nickname' | 'email'>> => {
  try {
    const saved = JSON.parse(read(ACCOUNT_KEY) ?? '{}') as Record<string, unknown>;
    if (saved.owner !== owner) return {};
    return {
      nickname: typeof saved.nickname === 'string' ? saved.nickname : undefined,
      email: typeof saved.email === 'string' ? saved.email : undefined,
    };
  } catch {
    return {};
  }
};

export const readProfile = (): Profile => {
  const session = readSessionUser();
  const base = session
    ? { userNumber: session.user_number, userId: session.user_id, nickname: session.nickname, email: session.email ?? '', joinedAt: null, isMock: false }
    : { ...MOCK_ACCOUNT, isMock: true };
  const saved = readSavedAccount(base.userId);
  const goal = read(GOAL_KEY);
  const minutes = read(TIME_KEY);
  return {
    ...base,
    nickname: saved.nickname ?? base.nickname,
    email: saved.email ?? base.email,
    goal: GOAL_OPTIONS.some((option) => option.id === goal) ? goal! : GOAL_OPTIONS[0].id,
    minutes: TIME_OPTIONS.some((option) => option.id === minutes) ? minutes! : '10',
  };
};

/** 화면 표시용 호칭: '닉네임님' */
export const displayName = (nickname: string | null | undefined) => `${nickname?.trim() || DEFAULT_NICKNAME}님`;

/** 입력값 검사. 문제가 있는 항목만 메시지 */
export const validateProfile = (profile: EditableProfile): Partial<Record<'nickname' | 'email', string>> => {
  const errors: Partial<Record<'nickname' | 'email', string>> = {};
  const nickname = profile.nickname.trim();
  if (!nickname) errors.nickname = '닉네임을 입력해 주세요.';
  else if (nickname.length > NICKNAME_MAX) errors.nickname = `닉네임은 ${NICKNAME_MAX}자까지 쓸 수 있어요.`;
  // 이메일은 로그인 응답에 없어 비어 있을 수 있음 → 입력했을 때만 형식 검사
  const email = profile.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = '올바른 이메일 주소를 입력해 주세요.';
  return errors;
};

/** 저장 성공 여부 (저장소를 쓸 수 없으면 false). owner: 지금 계정 아이디 */
export const saveProfile = (profile: EditableProfile, owner: string): boolean => {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ owner, nickname: profile.nickname.trim(), email: profile.email.trim() }));
    localStorage.setItem(GOAL_KEY, profile.goal);
    localStorage.setItem(TIME_KEY, profile.minutes);
    return true;
  } catch {
    return false;
  }
};

export const goalTitle = (goal: string) => GOAL_OPTIONS.find((option) => option.id === goal)?.title ?? GOAL_OPTIONS[0].title;

/** '2026-11-02' → '2026년 11월 2일' */
export const formatJoinedAt = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
};
