import { useSyncExternalStore } from 'react';
import { progressApi } from '../api/progressClient';
import { mockProgressServer } from '../mocks/mockProgressServer';

const NONE: readonly string[] = [];
const subscribe = (onChange: () => void) => mockProgressServer.subscribe(onChange);
const getSnapshot = () => (progressApi.isMock ? mockProgressServer.todayCompletedMissionIds() : NONE);

/**
 * 오늘 완료한 미션 ID 목록 (mock 서버 기준)
 * TODO: 미션 목록 API(API-04 /missions/recommended)가 연결되면 응답의 mission_status를 사용
 */
export const useCompletedMissions = (): readonly string[] => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
