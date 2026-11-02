// 한국 시간(KST, UTC+9) 날짜 계산 도우미
// 날짜는 'YYYY-MM-DD' 문자열로 다룬다. 기기 시간대와 관계없이 KST 기준 (설계서 6.1)
// 실제 서비스에서는 서버가 날짜를 판단하고, 프론트는 mock과 화면 표시에서만 사용한다.

export type DateKey = string; // 'YYYY-MM-DD'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 시각 → KST 날짜 */
export const kstDateKey = (time: Date | number): DateKey => {
  const ms = typeof time === 'number' ? time : time.getTime();
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
};

/** 시각 → KST 시(0~23) */
export const kstHour = (time: Date | number): number => {
  const ms = typeof time === 'number' ? time : time.getTime();
  return new Date(ms + KST_OFFSET_MS).getUTCHours();
};

const toUtcMs = (key: DateKey) => Date.parse(`${key}T00:00:00Z`);

export const addDays = (key: DateKey, days: number): DateKey =>
  new Date(toUtcMs(key) + days * DAY_MS).toISOString().slice(0, 10);

/** b - a (일) */
export const diffDays = (a: DateKey, b: DateKey): number => Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);

/** 'YYYY-MM' */
export const monthKey = (key: DateKey): string => key.slice(0, 7);

/** 다음 달 1일 */
export const nextMonthFirst = (key: DateKey): DateKey => {
  const [year, month] = key.split('-').map(Number);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return next;
};

/** 월요일 시작 주의 7일 (오늘이 포함된 주) */
export const weekOf = (key: DateKey): DateKey[] => {
  const weekday = new Date(toUtcMs(key)).getUTCDay(); // 0=일
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = addDays(key, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

export const weekdayLabel = (key: DateKey): string => WEEKDAY_LABEL[new Date(toUtcMs(key)).getUTCDay()];

/** '10월 31일 (토)' */
export const formatKoreanDate = (key: DateKey): string => {
  const [, month, day] = key.split('-').map(Number);
  return `${month}월 ${day}일 (${weekdayLabel(key)})`;
};

/** '12월 1일' */
export const formatMonthDay = (key: DateKey): string => {
  const [, month, day] = key.split('-').map(Number);
  return `${month}월 ${day}일`;
};
