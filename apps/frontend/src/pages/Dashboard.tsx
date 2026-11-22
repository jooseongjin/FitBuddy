import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Footprints, HeartPulse, RefreshCw, Zap } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { AccountMenu } from '../components/AccountMenu';
import { HeaderStatus } from '../components/progress/HeaderStatus';
import { LevelBanner } from '../components/progress/LevelBanner';
import { StreakCard } from '../components/progress/StreakCard';
import { StreakRepairSheet } from '../components/progress/StreakRepairSheet';
import { Toast } from '../components/progress/Toast';
import { useProgress } from '../context/progressStore';
import { useCharacterStore } from '../context/characterStore';
import { useMissionStates } from '../hooks/useMissionStates';
import { progressLabel } from '../data/missions';
import { MISSION_BADGE } from '../components/missionBadge';
import { displayName, readProfile } from '../lib/profileStorage';
import { useTodayMissions } from '../hooks/useTodayMissions';
import { useHealthData } from '../hooks/useHealthData';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { streak, isMock, repairStreak } = useProgress();
  const { fitPoint } = useCharacterStore();
  const { missions, loading: missionsLoading, error: missionsError } = useTodayMissions();
  const { metrics: health, loading: healthLoading, syncing: healthSyncing, error: healthError, sync: syncHealth } = useHealthData();
  const states = useMissionStates(missions);
  const [repairOpen, setRepairOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);
  // 마이페이지 프로필 수정에서 저장한 닉네임 + '님'
  const [greetingName] = useState(() => displayName(readProfile().nickname));

  const goMissions = useCallback(() => navigate('/missions'), [navigate]);
  const closeRepair = useCallback(() => setRepairOpen(false), []);
  const closeToast = useCallback(() => setToast(null), []);
  const handleRepaired = useCallback((keptDays: number) => {
    setRepairOpen(false);
    setToast((previous) => ({ message: `${keptDays}일 연속 기록을 지켰어요!`, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  const doneCount = missions.filter((mission) => states[mission.id].status === 'done').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b border-gray-100 flex justify-between items-center z-10">
        <div>
          <h1 className="text-base font-bold text-gray-800">{greetingName}, 오늘도 가볍게!</h1>
          <HeaderStatus />
        </div>
        {/* 오른쪽 캐릭터 메뉴: 계정 정보·이용 가이드·로그아웃 (상점·마이페이지와 같은 위치) */}
        <AccountMenu />
      </div>

      <div className="p-4 space-y-4">
        {/* HealthKit / Health Connect 일일 요약 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-800"><HeartPulse size={16} className="text-rose-500" />오늘의 건강 데이터</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${health.source ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {health.source ? (health.source === 'healthkit' ? 'Apple 건강 연결됨' : 'Health Connect 연결됨') : '미연결'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div>
              <Footprints className="mx-auto text-emerald-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">{healthLoading ? '—' : health.steps.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">걸음</p>
            </div>
            <div>
              <Zap className="mx-auto text-orange-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">{healthLoading ? '—' : health.active_calories.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">활동 kcal</p>
            </div>
            <div>
              <Clock className="mx-auto text-blue-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">{healthLoading ? '—' : `${health.exercise_minutes}분`}</p>
              <p className="text-[10px] text-gray-400">운동 시간</p>
            </div>
          </div>
          <button type="button" onClick={() => void syncHealth()} disabled={healthSyncing} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <RefreshCw size={14} className={healthSyncing ? 'animate-spin' : ''} />
            {healthSyncing ? '건강 데이터 동기화 중' : health.source ? '건강 데이터 새로고침' : '기기 건강 데이터 연결'}
          </button>
          <p className="text-center text-[10px] text-gray-400">걸음·활동 칼로리·운동 세션만 읽어 미션 인증에 사용하며 건강 앱에 기록을 쓰지 않습니다. 권한은 Health Connect 설정에서 언제든 철회할 수 있습니다. <a href="/privacypolicy.html" className="underline">개인정보 처리방침</a></p>
          {healthError && <p role="status" className="text-center text-[11px] text-gray-500">{healthError}</p>}
        </div>

        <LevelBanner title="오늘의 운동을 기록하고 FitPoint를 모아요" subtitle={`오늘 ${doneCount}/${missions.length} 미션 완료 · 보유 ${fitPoint.toLocaleString()} FP`} />

        {/* 연속 기록 - 위험 배너·복구 안내 포함 (복구 팝업은 버튼으로만 열림) */}
        {streak && (
          <StreakCard streak={streak} isMock={isMock} onOpenRepair={() => setRepairOpen(true)} onGoMissions={goMissions} />
        )}

        {/* 오늘의 맞춤 미션 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800">오늘의 맞춤 미션</h2>
            <button
              type="button"
              onClick={goMissions}
              className="inline-flex items-center gap-0.5 text-xs text-gray-500 cursor-pointer hover:text-gray-700"
            >
              {doneCount}/{missions.length} 완료
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            {missionsLoading ? (
              <p className="py-4 text-center text-xs text-gray-500">오늘의 미션을 불러오는 중이에요.</p>
            ) : missionsError ? (
              <p role="alert" className="py-4 text-center text-xs text-rose-600">{missionsError}</p>
            ) : missions.map((mission) => {
              const { status, current } = states[mission.id];
              const done = status === 'done';
              const badge = MISSION_BADGE[status];
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => navigate(`/missions/${mission.id}`)}
                  className={`w-full text-left bg-white p-4 rounded-xl flex justify-between items-center cursor-pointer transition ${
                    done ? 'border border-gray-200' : status === 'ready' ? 'border-2 border-amber-400' : 'border-2 border-emerald-500'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-gray-800">{mission.title}</p>
                    <p className={`text-[11px] mt-0.5 ${done ? 'text-gray-400' : 'text-emerald-600 font-semibold'}`}>
                      {done ? `${progressLabel(mission, current)} 완료` : progressLabel(mission, current)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap ${badge.className}`}>{badge.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {repairOpen && streak && (
        <StreakRepairSheet
          streak={streak}
          balance={fitPoint}
          isMock={isMock}
          onClose={closeRepair}
          onSubmit={repairStreak}
          onSuccess={handleRepaired}
          onGoMissions={goMissions}
        />
      )}
      {toast && <Toast key={toast.seq} message={toast.message} onClose={closeToast} />}

      {/* 하단 고정 GNB (상점·마이페이지와 같은 공용 메뉴) */}
      <BottomNav active="home" />
    </div>
  );
};
