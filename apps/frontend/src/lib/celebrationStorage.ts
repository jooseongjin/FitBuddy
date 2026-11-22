// 레벨업 축하를 이미 보여준 레벨 저장 (설계서 5.4)
// - 사용자별로 브라우저에 저장. 같은 레벨 축하를 다시 띄우지 않는 기준
// - 저장소를 쓸 수 없으면(사생활 보호 모드 등) 메모리에만 두고 available=false 를 알려
//   마이페이지 진입 축하(B~D)는 건너뛴다 (오표시보다 누락을 택함)

const KEY_PREFIX = 'fb.celebratedLevel.';
let memoryValue: number | null = null;

// mock 모드는 레벨·XP가 탭 단위로 초기화되므로 축하 기록도 탭 단위(sessionStorage)로 맞춘다
// (브라우저에 계속 남기면 새 탭에서 Lv.8로 다시 시작해도 Lv.9 축하가 '이미 본 것'으로 처리돼 안 뜸)
// 실제 서버 모드(기본값)는 레벨이 서버에 남으므로 브라우저(localStorage)에 계속 저장
// progressClient와 같은 기준: VITE_PROGRESS_API=mock 일 때만 mock (값이 없으면 실제 서버)
const isMockMode = (import.meta as { env?: Record<string, string> }).env?.VITE_PROGRESS_API === 'mock';
const store = (): Storage => (isMockMode ? sessionStorage : localStorage);

/**
 * 로그인 사용자 구분값: 로그인 응답으로 저장한 계정 번호(user_number)
 * 같은 브라우저에서 계정을 바꿔도 다른 계정의 축하 기록과 섞이지 않게 계정별로 저장
 * 로그인 정보가 없으면(시연·비로그인) 'me'
 */
export const currentUserKey = (): string => {
  try {
    const session = JSON.parse(localStorage.getItem('fb.session.user') ?? 'null') as { user_number?: unknown } | null;
    return typeof session?.user_number === 'number' && session.user_number > 0 ? `u${session.user_number}` : 'me';
  } catch {
    return 'me';
  }
};

export const readCelebratedLevel = (userKey = currentUserKey()): { available: boolean; level: number | null } => {
  try {
    const raw = store().getItem(KEY_PREFIX + userKey);
    const level = raw === null ? null : Number(raw);
    return { available: true, level: level !== null && Number.isFinite(level) ? level : null };
  } catch {
    return { available: false, level: memoryValue };
  }
};

export const writeCelebratedLevel = (level: number, userKey = currentUserKey()) => {
  memoryValue = level;
  try {
    store().setItem(KEY_PREFIX + userKey, String(level));
  } catch {
    // 저장소 사용 불가: 메모리 값만 유지
  }
};

/** /dev/ui 테스트용: "첫 진입" 상태로 되돌림 */
export const clearCelebratedLevel = (userKey = currentUserKey()) => {
  memoryValue = null;
  try {
    store().removeItem(KEY_PREFIX + userKey);
  } catch {
    // 무시
  }
};
