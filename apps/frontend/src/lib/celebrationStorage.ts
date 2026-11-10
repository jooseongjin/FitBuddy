// 레벨업 축하를 이미 보여준 레벨 저장 (설계서 5.4)
// - 사용자별로 브라우저에 저장. 같은 레벨 축하를 다시 띄우지 않는 기준
// - 저장소를 쓸 수 없으면(사생활 보호 모드 등) 메모리에만 두고 available=false 를 알려
//   마이페이지 진입 축하(B~D)는 건너뛴다 (오표시보다 누락을 택함)

const KEY_PREFIX = 'fb.celebratedLevel.';
let memoryValue: number | null = null;

// mock 모드는 레벨·XP가 탭 단위로 초기화되므로 축하 기록도 탭 단위(sessionStorage)로 맞춘다
// (브라우저에 계속 남기면 새 탭에서 Lv.8로 다시 시작해도 Lv.9 축하가 '이미 본 것'으로 처리돼 안 뜸)
// 실제 서버 모드(VITE_PROGRESS_API=http)는 레벨이 서버에 남으므로 브라우저(localStorage)에 계속 저장
const isMockMode = (import.meta as { env?: Record<string, string> }).env?.VITE_PROGRESS_API !== 'http';
const store = (): Storage => (isMockMode ? sessionStorage : localStorage);

/** 로그인 사용자 구분값. 아직 사용자 ID를 저장하지 않아 기본값 사용 (로그인 연동 시 교체) */
export const currentUserKey = (): string => {
  try {
    return localStorage.getItem('userId') ?? 'me';
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
