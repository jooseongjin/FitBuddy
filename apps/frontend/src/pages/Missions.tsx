import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { HeaderStatus } from '../components/progress/HeaderStatus';
import { LevelBanner } from '../components/progress/LevelBanner';
import { StreakRiskBanner } from '../components/progress/StreakRiskBanner';
import { useProgress } from '../context/progressStore';
import { useMissionStates } from '../hooks/useMissionStates';
import { shouldShowRiskBanner } from '../domain/streakRules';
import { RISK_BANNER_HOUR } from '../config/progressConfig';
import { TODAY_MISSIONS, progressLabel } from '../data/missions';
import { MISSION_BADGE } from '../components/missionBadge';

export const Missions: React.FC = () => {
  const navigate = useNavigate();
  const { streak } = useProgress();
  const states = useMissionStates();

  const count = (status: string) => TODAY_MISSIONS.filter((mission) => states[mission.id].status === status).length;
  const doneCount = count('done');
  const readyCount = count('ready');
  const showRisk = streak !== null && shouldShowRiskBanner(streak, RISK_BANNER_HOUR);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b border-gray-100 flex justify-between items-center z-10">
        <div>
          <h1 className="text-base font-bold text-gray-800">오늘의 맞춤 미션</h1>
          <HeaderStatus />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 캐릭터 응원 배너 - 미션을 완료하면 XP가 쌓여 레벨이 올라요 */}
        <LevelBanner
          title={doneCount === 0 ? '오늘 첫 미션을 완료하고 연속 기록을 이어가요!' : '미션을 완료하면 XP가 쌓여 레벨이 올라요'}
          subtitle={`오늘 ${doneCount}/${TODAY_MISSIONS.length} 완료`}
        />

        {/* 연속 기록이 끊길 위험 (오늘 미완료 + 20시 이후) */}
        {showRisk && streak && (
          <StreakRiskBanner
            days={streak.currentStreak}
            onGoMissions={() => {
              // 보상 대기 미션이 있으면 먼저, 없으면 진행 중 미션
              const next =
                TODAY_MISSIONS.find((mission) => states[mission.id].status === 'ready') ??
                TODAY_MISSIONS.find((mission) => states[mission.id].status !== 'done');
              if (next) navigate(`/missions/${next.id}`);
            }}
          />
        )}

        {/* 미션 리스트 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-800">운동 미션</h2>
            <span className="text-xs text-gray-500">
              진행중 {TODAY_MISSIONS.length - doneCount - readyCount} · 보상 대기 {readyCount} · 완료 {doneCount}
            </span>
          </div>

          {TODAY_MISSIONS.map((m) => {
            const { status, current } = states[m.id];
            const done = status === 'done';
            const badge = MISSION_BADGE[status];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate(`/missions/${m.id}`)}
                className={`w-full text-left bg-white p-4 rounded-xl border transition cursor-pointer flex justify-between items-center gap-2 ${
                  done ? 'border-gray-200' : status === 'ready' ? 'border-amber-400 border-2 shadow-sm' : 'border-emerald-500 shadow-sm'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-800">{m.title}</h3>
                    <span className="text-xs text-emerald-600 font-semibold tabular-nums">{progressLabel(m, current)}</span>
                  </div>
                  <p className="text-xs text-gray-400">{m.desc}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-emerald-600">+{m.basePoint} FP</span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap ${badge.className}`}>{badge.label}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 하단 GNB (상점·마이페이지와 같은 공용 메뉴) */}
      <BottomNav active="missions" />
    </div>
  );
};
