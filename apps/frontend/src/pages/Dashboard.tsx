import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Footprints, Zap, Clock } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { HeaderStatus } from '../components/progress/HeaderStatus';
import { LevelBanner } from '../components/progress/LevelBanner';
import { StreakCard } from '../components/progress/StreakCard';
import { StreakRepairSheet } from '../components/progress/StreakRepairSheet';
import { Toast } from '../components/progress/Toast';
import { useProgress } from '../context/progressStore';
import { useCharacterStore } from '../context/characterStore';
import { useCompletedMissions } from '../hooks/useCompletedMissions';
import { TODAY_MISSIONS } from '../data/missions';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { streak, isMock, repairStreak } = useProgress();
  const { fitPoint } = useCharacterStore();
  const completed = useCompletedMissions();
  const [repairOpen, setRepairOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; seq: number } | null>(null);

  const goMissions = useCallback(() => navigate('/missions'), [navigate]);
  const closeRepair = useCallback(() => setRepairOpen(false), []);
  const closeToast = useCallback(() => setToast(null), []);
  const handleRepaired = useCallback((keptDays: number) => {
    setRepairOpen(false);
    setToast((previous) => ({ message: `${keptDays}일 연속 기록을 지켰어요!`, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  const doneCount = TODAY_MISSIONS.filter((mission) => completed.includes(mission.id)).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b border-gray-100 flex justify-between items-center z-10">
        <div>
          <h1 className="text-base font-bold text-gray-800">사용자님, 오늘도 가볍게!</h1>
          <HeaderStatus />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 오늘의 건강 대시보드 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800">오늘의 건강 대시보드</h2>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
              좋은 페이스!
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div>
              <Footprints className="mx-auto text-emerald-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">6,842</p>
              <p className="text-[10px] text-gray-400">걸음 / 10,000</p>
            </div>
            <div>
              <Zap className="mx-auto text-orange-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">428</p>
              <p className="text-[10px] text-gray-400">소비 kcal</p>
            </div>
            <div>
              <Clock className="mx-auto text-blue-500 mb-1" size={20} />
              <p className="text-base font-extrabold text-gray-800">34분</p>
              <p className="text-[10px] text-gray-400">운동 시간</p>
            </div>
          </div>
        </div>

        {/* 캐릭터 레벨 배너 - 레벨·XP는 미션 완료로 쌓임 */}
        <LevelBanner title="조금만 더 걸으면 새 배지를 받아요!" subtitle="앞으로 3,158걸음 · +120 FP" />

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
              {doneCount}/{TODAY_MISSIONS.length} 완료
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            {TODAY_MISSIONS.map((mission) => {
              const done = completed.includes(mission.id);
              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => navigate(`/missions/${mission.id}`)}
                  className={`w-full text-left bg-white p-4 rounded-xl flex justify-between items-center cursor-pointer transition ${
                    done ? 'border border-gray-200' : 'border-2 border-emerald-500'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-gray-800">{mission.title}</p>
                    <p className={`text-[11px] mt-0.5 ${done ? 'text-gray-400' : 'text-emerald-600 font-semibold'}`}>
                      {done ? `${mission.goal} 완료` : mission.progress}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                      done ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {done ? '완료됨' : '진행중'}
                  </span>
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
