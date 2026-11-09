import { useMemo, useSyncExternalStore } from 'react';
import { progressApi } from '../api/progressClient';
import { mockProgressServer } from '../mocks/mockProgressServer';
import { TODAY_MISSIONS, type MissionStatus } from '../data/missions';
import { useCompletedMissions } from './useCompletedMissions';

export type MissionState = { status: MissionStatus; current: number };

const NONE: Readonly<Record<string, number>> = {};
const subscribe = (onChange: () => void) => mockProgressServer.subscribe(onChange);
const getProgress = () => (progressApi.isMock ? mockProgressServer.todayMissionProgress() : NONE);

/**
 * 오늘 미션별 상태 (진행 중 / 목표 달성·보상 대기 / 보상 받음) — 홈·미션 목록·미션 상세 공용
 * - mock: mock 서버의 진행도와 완료 기록
 * TODO: API-04 /missions/recommended 응답의 진행도·mission_status로 교체 (지금 실제 서버 모드는 진행도를 몰라 '보상 대기'로 표시)
 */
export const useMissionStates = (): Record<string, MissionState> => {
  const completed = useCompletedMissions();
  const progress = useSyncExternalStore(subscribe, getProgress, getProgress);
  return useMemo(
    () =>
      Object.fromEntries(
        TODAY_MISSIONS.map((mission) => {
          // 실제 서버 모드: 진행도를 아직 받지 못해(API-04 미연동) 막지 않고 보상 요청을 허용 — 달성 여부는 서버가 판단(409)
          const current = progressApi.isMock ? (progress[mission.id] ?? mission.startProgress) : mission.target;
          const status: MissionStatus = completed.includes(mission.id)
            ? 'done'
            : current >= mission.target
              ? 'ready'
              : 'in_progress';
          return [mission.id, { status, current }];
        }),
      ),
    [completed, progress],
  );
};
