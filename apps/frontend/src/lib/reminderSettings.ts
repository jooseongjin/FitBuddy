// 운동 알림 설정 (브라우저 알림 Notification API)
// - 켜면 브라우저 알림 권한을 요청하고, 정한 시각에 앱이 열려 있으면 알림을 띄운다 (WorkoutReminder)
// TODO: 앱을 닫아도 매일 오는 알림은 서비스 워커 + 웹 푸시(백엔드 푸시 발송·구독 저장 API)가 필요해 아직 범위 밖

const KEY = 'fb.reminder.v1';

export type ReminderSettings = { enabled: boolean; time: string };
export type ReminderPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, time: '19:00' };
export const REMINDER_TIMES = ['07:00', '08:00', '12:00', '18:00', '19:00', '20:00', '21:00'] as const;

const listeners = new Set<() => void>();
let cached: ReminderSettings | null = null;

export const readReminder = (): ReminderSettings => {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<ReminderSettings>) : {};
    cached = {
      enabled: saved.enabled === true,
      time: typeof saved.time === 'string' && /^\d{2}:\d{2}$/.test(saved.time) ? saved.time : DEFAULT_REMINDER.time,
    };
  } catch {
    cached = DEFAULT_REMINDER;
  }
  return cached;
};

export const writeReminder = (settings: ReminderSettings) => {
  cached = settings;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 저장소 사용 불가: 이번 접속 동안만 유지
  }
  listeners.forEach((listener) => listener());
};

export const subscribeReminder = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const reminderPermission = (): ReminderPermission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

/** 권한 요청. 이미 정해진 권한이면 그대로 돌려줌 */
export const requestReminderPermission = async (): Promise<ReminderPermission> => {
  const current = reminderPermission();
  if (current !== 'default') return current;
  try {
    return await Notification.requestPermission();
  } catch {
    return reminderPermission();
  }
};

export const showWorkoutNotification = (body = '오늘의 운동 미션을 하고 FitPoint를 받아 보세요!') => {
  if (reminderPermission() !== 'granted') return false;
  try {
    new Notification('FitBuddy 운동 알림', { body, icon: '/favicon.svg', tag: 'fitbuddy-reminder' });
    return true;
  } catch {
    return false;
  }
};

/** 지금부터 다음 HH:MM(기기 시각)까지 남은 ms */
export const msUntil = (time: string, now = new Date()): number => {
  const [hour, minute] = time.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};
