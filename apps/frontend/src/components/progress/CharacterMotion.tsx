import React, { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type CharacterMotionProps = {
  children: React.ReactNode;
  /** 값이 바뀔 때마다 통통 튀는 효과(fb-pop) 실행. 착용·해제·미리보기 상태를 문자열로 넘김 */
  popKey?: string;
  /** 대기 중 숨쉬기 효과 (기본 켜짐) */
  breathe?: boolean;
};

const POP_FRAMES: Keyframe[] = [
  { transform: 'scale(0.94)' },
  { transform: 'scale(1.04)', offset: 0.6 },
  { transform: 'scale(1)' },
];

/**
 * 캐릭터 애니메이션 래퍼 (UI 1)
 * CharacterCanvas 내부 렌더링은 건드리지 않고, 바깥 상자에만 효과를 준다.
 * 자식을 다시 마운트하지 않도록 Web Animations API로 pop을 실행 (Canvas 깜빡임 방지)
 */
export const CharacterMotion: React.FC<CharacterMotionProps> = ({ children, popKey, breathe = true }) => {
  const popRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const firstKey = useRef(popKey);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    // 처음 그릴 때는 효과 없이, 이후 바뀔 때만
    if (popKey === firstKey.current || reduced) {
      firstKey.current = popKey;
      return;
    }
    firstKey.current = popKey;
    popRef.current?.animate?.(POP_FRAMES, { duration: 250, easing: 'ease-out' });
    ringRef.current?.animate?.(
      [
        { opacity: 0.9, transform: 'scale(0.85)' },
        { opacity: 0, transform: 'scale(1.15)' },
      ],
      { duration: 450, easing: 'ease-out' },
    );
  }, [popKey, reduced]);

  return (
    <div className={`relative ${breathe ? 'animate-fb-breathe' : ''}`} style={{ transformOrigin: '50% 92%' }}>
      {/* 착용 순간 반짝임 테두리 (평소에는 보이지 않음) */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-[6%] rounded-full border-[3px] border-dotted border-[#59B985]/70 opacity-0"
      />
      <div ref={popRef} style={{ transformOrigin: '50% 92%' }}>
        {children}
      </div>
    </div>
  );
};
