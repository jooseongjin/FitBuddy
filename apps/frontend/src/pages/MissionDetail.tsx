import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Flame, Gem, LoaderCircle } from 'lucide-react';
import { HeaderStatus } from '../components/progress/HeaderStatus';
import { LevelBanner } from '../components/progress/LevelBanner';
import { XpGainBadge } from '../components/progress/XpGainBadge';
import { StreakPlusOne } from '../components/progress/StreakPlusOne';
import { CharacterCanvas } from '../components/CharacterCanvas';
import { CharacterMotion } from '../components/progress/CharacterMotion';
import { useProgress } from '../context/progressStore';
import { useCharacterStore } from '../context/characterStore';
import { useCompletedMissions } from '../hooks/useCompletedMissions';
import { completeMission } from '../api/missionRewardApi';
import { ApiError, type MissionRewardResult } from '../api/progressTypes';
import { findMission } from '../data/missions';
import { EMPTY_EQUIPPED, findCharacter, getEquippedParts } from '../data/characterItems';

export const MissionDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const mission = findMission(id);
  const { applyMissionReward, releaseCelebration } = useProgress();
  const { currentCharacterId, equippedByCharacter } = useCharacterStore();
  const completed = useCompletedMissions();
  const isCompleted = mission !== null && completed.includes(mission.id);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<MissionRewardResult | null>(null);
  const [showModal, setShowModal] = useState(false);

  const parts = useMemo(
    () => getEquippedParts(findCharacter(currentCharacterId), equippedByCharacter[currentCharacterId] ?? EMPTY_EQUIPPED),
    [currentCharacterId, equippedByCharacter],
  );

  // 보상 모달을 보지 않고 화면을 떠나도 미뤄 둔 레벨업 축하는 띄움
  const release = useEffectEvent(() => releaseCelebration());
  useEffect(() => () => release(), []);

  const handleComplete = async () => {
    if (!mission || submitting) return;
    if (isCompleted) {
      if (reward) setShowModal(true);
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await completeMission(mission.id, mission.basePoint);
      // FP·XP·레벨·Streak 갱신. 레벨업 축하는 보상 모달을 닫은 뒤에 띄움
      applyMissionReward(result, { deferCelebration: true });
      setReward(result);
      setShowModal(true);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : '보상을 받지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModalAndGo = (path: string) => {
    setShowModal(false);
    releaseCelebration();
    navigate(path);
  };

  if (!mission) {
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto shadow-md flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-bold text-gray-700">미션을 찾을 수 없어요.</p>
        <button
          type="button"
          onClick={() => navigate('/missions')}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
        >
          미션 목록으로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto shadow-md relative">
      {/* 상단 헤더 */}
      <div className="bg-white p-4 sticky top-0 border-b border-gray-100 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/missions')} aria-label="미션 목록으로" className="cursor-pointer">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-base font-bold text-gray-800">운동 미션</h1>
        </div>
        <HeaderStatus showStreak={false} />
      </div>

      <div className="p-4 space-y-4">
        {/* 미션 타이틀 배너 */}
        <LevelBanner title={mission.title} subtitle={`목표 달성 보상 · +${mission.basePoint} FP · XP`} />

        {/* 진행 상태 카드 */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className={isCompleted ? 'text-emerald-600' : 'text-gray-700'}>{isCompleted ? '✓ 완료됨' : '진행중'}</span>
            <span className="text-gray-500">{mission.goal}</span>
          </div>

          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-400'} w-full`}></div>
          </div>

          <p className="text-xs text-emerald-600 font-medium pt-1">
            {isCompleted
              ? reward
                ? `+${reward.earnedPoint} FP · +${reward.earnedXp} XP 획득 · 보상 지급 완료`
                : '오늘 완료한 미션이에요 · 보상 지급 완료'
              : '목표를 달성했어요! 보상을 받아보세요.'}
          </p>
        </div>

        {/* 가이드 안내 */}
        <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3">
          <h3 className="text-xs font-bold text-gray-800">이렇게 해 보세요</h3>
          <ol className="space-y-2 text-xs text-gray-600">
            {mission.guide.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="w-4 h-4 shrink-0 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 하단 액션 버튼 */}
        <button
          type="button"
          onClick={() => void handleComplete()}
          disabled={submitting || (isCompleted && !reward)}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition inline-flex items-center justify-center gap-1.5 ${
            isCompleted
              ? reward
                ? 'bg-white border border-emerald-500 text-emerald-700 cursor-pointer'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:cursor-wait'
          }`}
        >
          {submitting ? (
            <>
              <LoaderCircle size={16} className="animate-fb-spin" aria-hidden="true" />
              보상 받는 중…
            </>
          ) : isCompleted ? (
            reward ? '획득한 보상 확인' : '오늘 완료한 미션이에요'
          ) : errorMessage ? (
            '다시 시도'
          ) : (
            '미션 완료 및 보상 받기'
          )}
        </button>
        {errorMessage && (
          <p role="alert" className="flex items-center justify-center gap-1 text-xs font-bold text-rose-600">
            <CircleAlert size={13} aria-hidden="true" />
            {errorMessage}
          </p>
        )}
      </div>

      {/* 보상 모달 (SCR-MOD-01) + XP 획득(UI 6) + Streak +1(UI 10) */}
      {showModal && reward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fb-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-title"
            className="bg-white w-full max-w-xs rounded-2xl p-6 text-center space-y-4 animate-fb-scale-in"
          >
            <div className="mx-auto w-28">
              <CharacterMotion popKey="reward">
                <CharacterCanvas equippedParts={parts} label="보상을 받은 캐릭터" />
              </CharacterMotion>
            </div>
            <div>
              <h3 id="reward-title" className="text-lg font-bold text-gray-800">
                {mission.title}, 해냈어요!
              </h3>
              <p className="text-xs text-gray-500 mt-1">오늘의 보상을 받았어요.</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2">
              <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-lg">
                <Gem size={20} />
                <span>+{reward.earnedPoint.toLocaleString()} FitPoint</span>
              </div>
              <XpGainBadge amount={reward.earnedXp} autoHide={false} />
              <p className="text-xs text-gray-500">현재 보유: {reward.balance.toLocaleString()} FitPoint</p>
            </div>

            {reward.streak.increased ? (
              <StreakPlusOne {...reward.streak} />
            ) : (
              <p className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Flame size={13} className="text-orange-400" aria-hidden="true" />
                오늘의 연속 기록은 이미 이어졌어요 ({reward.streak.current}일)
              </p>
            )}

            {reward.level.after > reward.level.before && (
              <p className="text-xs font-bold text-sky-700">레벨이 올랐어요! 창을 닫으면 축하해 드릴게요</p>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => closeModalAndGo('/dashboard')}
                className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                홈으로 이동
              </button>
              <button
                type="button"
                onClick={() => closeModalAndGo('/missions')}
                className="w-full py-2 text-gray-500 font-semibold rounded-xl text-xs cursor-pointer"
              >
                다른 미션 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
