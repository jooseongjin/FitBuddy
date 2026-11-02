// 오늘의 맞춤 미션 (홈·미션 목록·미션 상세 공용)
// TODO: 미션 추천 API(API-04 GET /missions/recommended) 연동 전 mock — 기존 미션 화면의 예시 값을 그대로 옮김
// 완료 여부는 이 파일이 아니라 useCompletedMissions()로 판단

export type MissionItem = {
  id: string;
  title: string;
  desc: string;
  /** 진행 중 표시 (예: 6,842/8,000) */
  progress: string;
  /** 완료 시 표시 (목표 달성) */
  goal: string;
  /** 보상 기본 포인트 (mock 서버 적립에 사용, 실제는 서버 Missions.base_point) */
  basePoint: number;
  guide: string[];
};

export const TODAY_MISSIONS: MissionItem[] = [
  {
    id: '1',
    title: '아침 스트레칭',
    desc: '목과 어깨를 천천히 풀어주세요.',
    progress: '7/10분',
    goal: '10/10분',
    basePoint: 40,
    guide: ['바른 자세로 앉아 어깨에 힘을 빼요.', '목을 천천히 좌우로 10초씩 기울여요.', '어깨를 크게 10번 돌리면 완료!'],
  },
  {
    id: '2',
    title: '가볍게 8천 보',
    desc: '편안한 속도로 걸어보세요.',
    progress: '6,842/8,000',
    goal: '8,000/8,000걸음',
    basePoint: 120,
    guide: ['편한 운동화를 신고 가볍게 몸을 풀어요.', '대화할 수 있는 편안한 속도로 걸어요.', '오늘 누적 8,000걸음을 채우면 완료!'],
  },
  {
    id: '3',
    title: '스쿼트 루틴',
    desc: '올바른 자세로 천천히 앉았다 서요.',
    progress: '12/20회',
    goal: '20/20회',
    basePoint: 80,
    guide: ['발을 어깨너비로 벌리고 서요.', '무릎이 발끝을 넘지 않게 천천히 앉아요.', '20회를 채우면 완료!'],
  },
];

export const findMission = (id: string | undefined) => TODAY_MISSIONS.find((mission) => mission.id === id) ?? null;
