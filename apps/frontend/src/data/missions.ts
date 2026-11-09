// 오늘의 맞춤 미션 (홈·미션 목록·미션 상세 공용)
// TODO: 미션 추천 API(API-04 GET /missions/recommended) 연동 전 mock — 기존 미션 화면의 예시 값을 그대로 옮김
// 진행도·완료 여부는 이 파일이 아니라 useMissionStates()로 판단

export type MissionItem = {
  id: string;
  title: string;
  desc: string;
  /** 목표량과 단위 (예: 8000 걸음) */
  target: number;
  unit: string;
  /** 오늘 시작 진행도 (mock). 시연 기본값: 아침 스트레칭은 목표 달성·보상 대기, 나머지는 진행 중 */
  startProgress: number;
  /** 보상 기본 포인트 (mock 서버 적립에 사용, 실제는 서버 Missions.base_point) */
  basePoint: number;
  guide: string[];
};

export const TODAY_MISSIONS: MissionItem[] = [
  {
    id: '1',
    title: '아침 스트레칭',
    desc: '목과 어깨를 천천히 풀어주세요.',
    target: 10,
    unit: '분',
    startProgress: 10,
    basePoint: 40,
    guide: ['바른 자세로 앉아 어깨에 힘을 빼요.', '목을 천천히 좌우로 10초씩 기울여요.', '어깨를 크게 10번 돌리면 완료!'],
  },
  {
    id: '2',
    title: '가볍게 8천 보',
    desc: '편안한 속도로 걸어보세요.',
    target: 8000,
    unit: '걸음',
    startProgress: 6842,
    basePoint: 120,
    guide: ['편한 운동화를 신고 가볍게 몸을 풀어요.', '대화할 수 있는 편안한 속도로 걸어요.', '오늘 누적 8,000걸음을 채우면 완료!'],
  },
  {
    id: '3',
    title: '스쿼트 루틴',
    desc: '올바른 자세로 천천히 앉았다 서요.',
    target: 20,
    unit: '회',
    startProgress: 12,
    basePoint: 80,
    guide: ['발을 어깨너비로 벌리고 서요.', '무릎이 발끝을 넘지 않게 천천히 앉아요.', '20회를 채우면 완료!'],
  },
];

export const findMission = (id: string | undefined) => TODAY_MISSIONS.find((mission) => mission.id === id) ?? null;

/**
 * 미션 상태
 * - in_progress: 목표 미달성 → 보상을 받을 수 없음
 * - ready: 목표 달성, 보상 대기 → [보상 받기]
 * - done: 보상 받음
 */
export type MissionStatus = 'in_progress' | 'ready' | 'done';

/** 진행도 표시 (예: '6,842/8,000걸음'). 목표를 넘으면 목표값으로 */
export const progressLabel = (mission: MissionItem, current: number) =>
  `${Math.min(current, mission.target).toLocaleString()}/${mission.target.toLocaleString()}${mission.unit}`;

/** 목표까지 남은 양 (예: '1,158걸음') */
export const remainingLabel = (mission: MissionItem, current: number) =>
  `${Math.max(0, mission.target - current).toLocaleString()}${mission.unit}`;

/** 진행률 0~100 */
export const progressPercent = (mission: MissionItem, current: number) =>
  Math.min(100, Math.round((current / mission.target) * 100));
