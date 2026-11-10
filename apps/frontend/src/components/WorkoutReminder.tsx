import { useEffect, useSyncExternalStore } from 'react';
import { msUntil, readReminder, reminderPermission, showWorkoutNotification, subscribeReminder } from '../lib/reminderSettings';
import { useProgress } from '../context/progressStore';

/**
 * 운동 알림: 정한 시각에 앱(탭)이 열려 있고 오늘 미션을 아직 안 했으면 브라우저 알림을 띄운다.
 * 화면에는 아무것도 그리지 않음
 */
export const WorkoutReminder: React.FC = () => {
  const settings = useSyncExternalStore(subscribeReminder, readReminder);
  const { streak } = useProgress();
  const todayCompleted = streak?.todayCompleted ?? false;

  useEffect(() => {
    if (!settings.enabled || reminderPermission() !== 'granted') return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!todayCompleted) showWorkoutNotification();
        schedule(); // 다음 날 같은 시각
      }, msUntil(settings.time));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [settings.enabled, settings.time, todayCompleted]);

  return null;
};
