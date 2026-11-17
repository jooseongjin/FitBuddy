import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import api from './axios';
import { addDays, kstDateKey } from '../domain/kst';

export type HealthMetrics = {
  metric_date: string;
  steps: number;
  active_calories: number;
  exercise_minutes: number;
  source: 'healthkit' | 'health_connect' | null;
  synced_at: string | null;
};

const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0));

const todayRange = () => {
  const today = kstDateKey(Date.now());
  return {
    startDate: new Date(`${today}T00:00:00+09:00`).toISOString(),
    endDate: new Date(`${addDays(today, 1)}T00:00:00+09:00`).toISOString(),
  };
};

export const getTodayHealthMetrics = async (): Promise<HealthMetrics> => {
  const { data } = await api.get<{ data: HealthMetrics }>('/health/today');
  return data.data;
};

const syncNativeHealth = async (requestPermissions: boolean): Promise<HealthMetrics> => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('건강 앱 연동은 iOS/Android 앱에서 사용할 수 있어요. 웹 브라우저에서는 연결할 수 없습니다.');
  }

  const availability = await Health.isAvailable();
  if (!availability.available) {
    throw new Error(availability.reason ?? '이 기기에서 건강 데이터에 접근할 수 없습니다.');
  }

  const permissions: Parameters<typeof Health.requestAuthorization>[0] = {
    read: ['steps', 'calories', 'workouts'],
    write: [],
  };
  const authorization = requestPermissions
    ? await Health.requestAuthorization(permissions)
    : await Health.checkAuthorization(permissions);
  const requested = ['steps', 'calories', 'workouts'] as const;
  if (!requested.some((type) => authorization.readAuthorized.includes(type))) {
    throw new Error('건강 데이터 읽기 권한이 허용되지 않았습니다. 기기 설정에서 권한을 확인해 주세요.');
  }

  const range = todayRange();
  const canRead = (type: typeof requested[number]) => authorization.readAuthorized.includes(type);
  const [stepsResult, stepSamples, caloriesResult, calorieSamples, workoutResult] = await Promise.all([
    canRead('steps')
      ? Health.queryAggregated({ ...range, dataType: 'steps', bucket: 'day', aggregation: 'sum' }).catch(() => ({ samples: [] }))
      : Promise.resolve({ samples: [] }),
    canRead('steps')
      ? Health.readSamples({ ...range, dataType: 'steps', limit: 1000 }).catch(() => ({ samples: [] }))
      : Promise.resolve({ samples: [] }),
    canRead('calories')
      ? Health.queryAggregated({ ...range, dataType: 'calories', bucket: 'day', aggregation: 'sum' }).catch(() => ({ samples: [] }))
      : Promise.resolve({ samples: [] }),
    canRead('calories')
      ? Health.readSamples({ ...range, dataType: 'calories', limit: 1000 }).catch(() => ({ samples: [] }))
      : Promise.resolve({ samples: [] }),
    canRead('workouts')
      ? Health.queryWorkouts({ ...range, limit: 100 }).catch(() => ({ workouts: [] }))
      : Promise.resolve({ workouts: [] }),
  ]);

  const exerciseMinutes = Math.round(workoutResult.workouts.reduce((minutes, workout) => minutes + workout.duration / 60, 0));
  const source = Capacitor.getPlatform() === 'ios' ? 'healthkit' : 'health_connect';
  const deviceType = (value?: string): 'watch' | 'phone' | 'other' | 'unknown' => {
    if (value === 'watch') return 'watch';
    if (value === 'phone') return 'phone';
    if (value === 'fitnessBand' || value === 'ring') return 'other';
    return 'unknown';
  };
  const records = [
    ...stepSamples.samples.flatMap((sample) => sample.platformId ? [{
      external_id: sample.platformId,
      record_type: 'steps' as const,
      value: sample.value,
      unit: 'count' as const,
      start_at: sample.startDate,
      end_at: sample.endDate,
      source_app: sample.sourceId ?? sample.sourceName ?? null,
      device_type: deviceType(sample.deviceType),
    }] : []),
    ...calorieSamples.samples.flatMap((sample) => sample.platformId ? [{
      external_id: sample.platformId,
      record_type: 'calories' as const,
      value: sample.value,
      unit: 'kcal' as const,
      start_at: sample.startDate,
      end_at: sample.endDate,
      source_app: sample.sourceId ?? null,
      device_type: deviceType(sample.deviceType),
    }] : []),
    ...workoutResult.workouts.flatMap((workout) => workout.platformId ? [{
      external_id: workout.platformId,
      record_type: 'exercise' as const,
      exercise_type: workout.workoutType,
      value: workout.duration / 60,
      unit: 'min' as const,
      start_at: workout.startDate,
      end_at: workout.endDate,
      source_app: workout.sourceId ?? workout.sourceName ?? null,
      device_type: 'unknown' as const,
    }] : []),
  ];
  const { data } = await api.put<{ data: HealthMetrics }>('/health/today', {
    steps: sum(stepsResult.samples.map((sample) => sample.value)),
    active_calories: sum(caloriesResult.samples.map((sample) => sample.value)),
    exercise_minutes: exerciseMinutes,
    source,
    records,
  });

  if (typeof window !== 'undefined') window.dispatchEvent(new Event('fitbuddy:health-synced'));
  return data.data;
};

export const connectAndSyncHealth = () => syncNativeHealth(true);
export const refreshAuthorizedHealth = () => syncNativeHealth(false);