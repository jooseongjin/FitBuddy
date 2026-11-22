import React from 'react';
import { useCountUp } from '../../hooks/useCountUp';

/** 숫자 변화 애니메이션 (FP·XP·연속 일수). 천 단위 쉼표 표시 */
export const AnimatedNumber: React.FC<{ value: number; duration?: number; className?: string }> = ({
  value,
  duration,
  className,
}) => {
  const shown = useCountUp(value, duration);
  return <span className={`tabular-nums ${className ?? ''}`}>{shown.toLocaleString()}</span>;
};
