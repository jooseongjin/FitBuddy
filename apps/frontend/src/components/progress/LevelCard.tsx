import React from 'react';
import { Clock, Sparkles, Trophy } from 'lucide-react';
import type { CharacterProgress } from '../../api/progressTypes';
import { getXpProgress } from '../../domain/levelRules';
import { AnimatedNumber } from './AnimatedNumber';
import { MockTag } from './MockTag';

type LevelCardProps = {
  progress: CharacterProgress;
  /** mock API 사용 중이면 진행 바 기준값 옆에 "임시 값" 표시 */
  isMock?: boolean;
  className?: string;
};

/**
 * 레벨 카드 (UI 4) + XP 진행 바 (UI 5)
 * - 레벨업 버튼 없음: 미션 완료로 XP가 쌓이면 자동으로 오름
 * - XP는 하늘색(FP는 노란색)으로 구분
 * - 레벨 기준이 없으면(B2 미정) "기준 준비 중", 최대 레벨이면 "최고 레벨"
 */
export const LevelCard: React.FC<LevelCardProps> = ({ progress, isMock = false, className = '' }) => {
  const view = getXpProgress(progress);
  const isMax = view.kind === 'max';

  return (
    <div className={`rounded-2xl border border-sky-100 bg-white px-3.5 py-3 space-y-2.5 ${className}`} aria-label="캐릭터 레벨">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isMax && <Trophy size={18} className="text-amber-600 shrink-0" aria-hidden="true" />}
          <span className="text-xl font-black text-sky-700 leading-none">
            Lv.<AnimatedNumber value={progress.level} />
          </span>
          {isMax && <span className="text-xs font-bold text-amber-700">최고 레벨</span>}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 bg-[#DCEEFF] rounded-full px-2 py-0.5 shrink-0">
          <Sparkles size={12} aria-hidden="true" />
          누적 <AnimatedNumber value={progress.totalEarnedXp} /> XP
        </span>
      </div>

      {/* XP 진행 바 */}
      <div
        className={`relative h-2.5 rounded-full overflow-hidden ${
          view.kind === 'pending' ? 'bg-gray-100 border border-dashed border-gray-300' : 'bg-[#DCEEFF]'
        }`}
        role="progressbar"
        aria-label="다음 레벨까지 XP"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={view.kind === 'progress' ? Math.round(view.ratio * 100) : view.kind === 'max' ? 100 : undefined}
      >
        {view.kind !== 'pending' && (
          <div
            className="fb-xp-fill animate-fb-fill absolute inset-0 rounded-full bg-gradient-to-r from-sky-300 to-sky-600"
            style={{ transform: `scaleX(${view.kind === 'max' ? 1 : view.ratio})` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        {view.kind === 'progress' && (
          <span className="text-gray-600">
            다음 레벨까지 <b className="text-sky-700 tabular-nums">{view.remaining.toLocaleString()} XP</b>
          </span>
        )}
        {view.kind === 'pending' && (
          <span className="inline-flex items-center gap-1 text-gray-400">
            <Clock size={12} aria-hidden="true" />
            레벨 기준 준비 중이에요
          </span>
        )}
        {view.kind === 'max' && <span className="text-gray-500">가장 높은 레벨에 도착했어요</span>}
        {view.kind === 'progress' && <MockTag show={isMock} label="임시 기준" />}
      </div>
      <p className="text-[10px] text-gray-400">레벨은 미션을 완료해 XP가 쌓이면 자동으로 올라요</p>
    </div>
  );
};
