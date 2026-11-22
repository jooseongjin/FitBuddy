import React, { useEffect, useEffectEvent, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export type XpGainBadgeProps = {
  /** 미션 완료 응답의 earned_xp. 0 이하이면 아무것도 그리지 않음 */
  amount: number;
  /** 효과가 끝나면 호출 (레벨업 축하로 이어 붙일 때 사용) */
  onDone?: () => void;
  /** false면 사라지지 않고 계속 표시 (보상 목록 등 정적 표시용) */
  autoHide?: boolean;
  className?: string;
};

/**
 * XP 획득 효과 (UI 6) — 독립 컴포넌트
 * 전역 상태를 읽지 않으므로 팀원의 미션 완료 화면 어디에나 둘 수 있다.
 * 다시 실행하려면 부모에서 key를 바꾼다.
 */
export const XpGainBadge: React.FC<XpGainBadgeProps> = ({ amount, onDone, autoHide = true, className = '' }) => {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);

  const done = useEffectEvent(() => onDone?.());
  useEffect(() => {
    if (!autoHide || amount <= 0) return;
    // 동작 줄이기: 움직임 없이 1초간 표시
    const timer = setTimeout(() => {
      setVisible(false);
      done();
    }, reduced ? 1000 : 800);
    return () => clearTimeout(timer);
  }, [amount, autoHide, reduced]);

  if (amount <= 0 || !visible) return null;

  return (
    <span
      role="status"
      aria-label={`경험치 ${amount} 획득`}
      className={`inline-flex items-center gap-1 rounded-full bg-[#DCEEFF] border-2 border-white px-3 py-1 text-[15px] font-black text-sky-700 shadow-[0_4px_10px_rgba(2,132,199,0.18)] ${
        autoHide ? 'animate-fb-float-up' : ''
      } ${className}`}
    >
      <Sparkles size={16} aria-hidden="true" />+{amount.toLocaleString()} XP
    </span>
  );
};
