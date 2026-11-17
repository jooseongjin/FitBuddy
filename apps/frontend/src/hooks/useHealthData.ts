import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { connectAndSyncHealth, getTodayHealthMetrics, refreshAuthorizedHealth, type HealthMetrics } from '../api/healthApi';

const EMPTY: HealthMetrics = {
  metric_date: '',
  steps: 0,
  active_calories: 0,
  exercise_minutes: 0,
  source: null,
  synced_at: null,
};

export const useHealthData = () => {
  const [metrics, setMetrics] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMetrics(await getTodayHealthMetrics());
      setError(null);
    } catch {
      setError('건강 기록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const saved = await getTodayHealthMetrics();
        if (!active) return;
        setMetrics(saved);
        if (Capacitor.isNativePlatform() && saved.source) {
          try {
            setMetrics(await refreshAuthorizedHealth());
          } catch {
            // Permission may have been revoked; retain the last server snapshot without prompting.
          }
        }
      } catch {
        if (active) setError('건강 기록을 불러오지 못했어요.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      setMetrics(await connectAndSyncHealth());
      setError(null);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '건강 데이터를 동기화하지 못했어요.');
      return false;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { metrics, loading, syncing, error, sync, refresh };
};