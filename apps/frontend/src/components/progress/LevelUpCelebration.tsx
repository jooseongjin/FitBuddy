import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CharacterCanvas, type EquippedParts } from '../CharacterCanvas';
import { CharacterMotion } from './CharacterMotion';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { withParticle } from '../../lib/korean';

export type LevelUpCelebrationProps = {
  from: number;
  to: number;
  /** 현재 착용 상태의 캐릭터. 없으면 반짝이만 표시 */
  equippedParts?: EquippedParts | null;
  characterName?: string;
  onClose: () => void;
};

// 반짝이 8개: 퍼지는 방향(dx, dy)과 시작 지연 — 하늘색(XP)·노란색(축하)을 번갈아
const SPARKLES = [
  { x: '8%', y: '18%', dx: '-14px', dy: '-12px', size: 16, delay: 400, tone: 'text-sky-500' },
  { x: '84%', y: '12%', dx: '14px', dy: '-14px', size: 14, delay: 450, tone: 'text-amber-400' },
  { x: '90%', y: '60%', dx: '16px', dy: '6px', size: 10, delay: 500, tone: 'text-sky-400' },
  { x: '2%', y: '64%', dx: '-16px', dy: '6px', size: 12, delay: 520, tone: 'text-amber-400' },
  { x: '46%', y: '-4%', dx: '0px', dy: '-16px', size: 12, delay: 420, tone: 'text-amber-400' },
  { x: '76%', y: '86%', dx: '12px', dy: '12px', size: 9, delay: 560, tone: 'text-sky-500' },
  { x: '18%', y: '88%', dx: '-12px', dy: '12px', size: 9, delay: 580, tone: 'text-sky-400' },
  { x: '66%', y: '30%', dx: '8px', dy: '-8px', size: 8, delay: 620, tone: 'text-amber-300' },
];

/**
 * 레벨업 축하 모달 (UI 7)
 * 순서: 배경 fade(0ms) → 모달 scale-in(100ms) → 캐릭터 pop(300ms) → 반짝이(400ms) → 레벨 숫자 바뀜(600ms)
 * 여러 레벨이 한 번에 오르면 "Lv.8 → Lv.10"으로 한 번만 표시
 * 언제 띄울지는 이 컴포넌트가 아니라 공용 상태의 규칙(설계서 5.4)이 정한다.
 */
export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  from,
  to,
  equippedParts,
  characterName = '캐릭터',
  onClose,
}) => {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'intro' | 'pop' | 'done'>('intro');
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const jump = to - from;

  // 부모가 다시 그려져도 연출 타이머가 처음부터 다시 시작되지 않도록 onClose는 의존성에서 분리
  const close = useEffectEvent(() => onClose());
  useEffect(() => {
    closeRef.current?.focus();
    const timers = [setTimeout(() => setPhase('pop'), 300), setTimeout(() => setPhase('done'), 600)];
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const shownLevel = reduced || phase === 'done' ? to : from;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/45 animate-fb-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[18rem] bg-white rounded-3xl px-5 pt-5 pb-5 text-center shadow-xl animate-fb-scale-in [animation-delay:100ms]"
      >
        <div className="relative mx-auto w-40 h-40">
          <div
            aria-hidden="true"
            className="absolute inset-1 rounded-full bg-[radial-gradient(circle,#DCEEFF_0%,rgba(220,238,255,0)_70%)]"
          />
          <div className="relative flex items-center justify-center w-full h-full">
            {equippedParts ? (
              <div className="w-36">
                <CharacterMotion popKey={phase === 'intro' ? 'intro' : 'pop'} breathe={false}>
                  <CharacterCanvas equippedParts={equippedParts} label={`${characterName} 레벨업`} />
                </CharacterMotion>
              </div>
            ) : (
              <Sparkles size={56} className="text-sky-500" aria-hidden="true" />
            )}
          </div>
          {!reduced &&
            SPARKLES.map((sparkle, index) => (
              <Sparkles
                key={index}
                aria-hidden="true"
                size={sparkle.size}
                className={`absolute ${sparkle.tone} animate-fb-sparkle`}
                style={
                  {
                    left: sparkle.x,
                    top: sparkle.y,
                    animationDelay: `${sparkle.delay}ms`,
                    '--fb-dx': sparkle.dx,
                    '--fb-dy': sparkle.dy,
                  } as React.CSSProperties
                }
              />
            ))}
        </div>

        <h2 id="levelup-title" className="mt-1 text-2xl font-black tracking-tight text-sky-700">
          LEVEL UP!
        </h2>
        <div className="mt-2 flex items-center justify-center gap-2" aria-label={`레벨 ${from}에서 ${to}로`}>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-black text-gray-400">Lv.{from}</span>
          <span className="text-sm font-bold text-gray-400" aria-hidden="true">
            →
          </span>
          <span className="rounded-full bg-[#DCEEFF] px-2.5 py-0.5 text-sm font-black text-sky-700 tabular-nums">
            Lv.{shownLevel}
          </span>
        </div>
        <p className="mt-2 text-[13px] font-medium text-gray-600">
          {jump > 1
            ? `${withParticle(characterName, '이', '가')} 한 번에 ${jump}단계 성장했어요!`
            : `${withParticle(characterName, '이', '가')} 한 단계 성장했어요!`}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-4 h-10 w-full rounded-full bg-[#59B985] text-[13px] font-bold text-white shadow-sm cursor-pointer hover:brightness-95"
        >
          좋아요
        </button>
      </div>
    </div>
  );
};
