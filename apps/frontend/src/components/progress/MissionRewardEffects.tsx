import React from 'react';
import type { MissionRewardResult } from '../../api/progressTypes';
import { XpGainBadge } from './XpGainBadge';
import { StreakPlusOne } from './StreakPlusOne';

/**
 * 미션 완료 보상 효과 묶음 (팀원 미션 완료 화면 연동용)
 * XP 획득(UI 6) + Streak +1(UI 10)을 응답 값 그대로 보여준다.
 * 레벨업 축하(UI 7)는 useProgress().applyMissionReward(result)를 호출하면 공용 상태가 알아서 띄운다.
 */
export const MissionRewardEffects: React.FC<{ result: MissionRewardResult; className?: string }> = ({
  result,
  className = '',
}) => (
  <div className={`flex flex-col items-center gap-3 ${className}`}>
    <XpGainBadge amount={result.earnedXp} autoHide={false} />
    <StreakPlusOne {...result.streak} />
  </div>
);
