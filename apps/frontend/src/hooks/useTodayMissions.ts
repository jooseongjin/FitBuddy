import { useEffect, useState } from 'react';
import api from '../api/axios';
import { progressApi } from '../api/progressClient';
import { TODAY_MISSIONS, type MissionItem } from '../data/missions';

type RecommendedMission = {
  user_mission_id: number;
  title: string;
  description: string | null;
  target_value: number;
  target_unit: string;
  base_point: number;
  current_value: number;
  mission_status: 'assigned' | 'completed';
};

export const useTodayMissions = () => {
  const [missions, setMissions] = useState<readonly MissionItem[]>(progressApi.isMock ? TODAY_MISSIONS : []);
  const [loading, setLoading] = useState(!progressApi.isMock);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (progressApi.isMock) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ data: RecommendedMission[] }>('/missions/recommended');
        if (!active) return;
        setMissions(data.data.map((mission) => ({
          id: String(mission.user_mission_id),
          title: mission.title,
          desc: mission.description ?? '',
          target: mission.target_value,
          unit: mission.target_unit,
          startProgress: mission.mission_status === 'completed' ? mission.target_value : mission.current_value,
          basePoint: mission.base_point,
          guide: [mission.description ?? mission.title],
          serverStatus: mission.mission_status,
        })));
        setError(null);
      } catch {
        if (active) setError('오늘의 미션을 불러오지 못했어요.');
      } finally {
        if (active) setLoading(false);
      }
    };
    const onHealthSynced = () => void load();
    void load();
    window.addEventListener('fitbuddy:health-synced', onHealthSynced);
    return () => {
      active = false;
      window.removeEventListener('fitbuddy:health-synced', onHealthSynced);
    };
  }, []);

  return { missions, loading, error };
};