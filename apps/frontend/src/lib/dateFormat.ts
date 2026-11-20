// 서버 시각(ISO, UTC 또는 +09:00)을 한국 시간으로 표시

const DATE = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
const DATE_TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const parse = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** '2026년 12월 20일' (값이 없거나 형식이 다르면 '-') */
export const formatKstDate = (iso: string | null | undefined): string => {
  const date = parse(iso);
  return date ? DATE.format(date) : '-';
};

/** '2026. 11. 20. 14:05' */
export const formatKstDateTime = (iso: string | null | undefined): string => {
  const date = parse(iso);
  return date ? DATE_TIME.format(date) : '-';
};
