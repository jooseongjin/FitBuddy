import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * 숫자가 이전 값에서 새 값으로 부드럽게 바뀌는 효과 (FP·XP·연속 일수, 기본 600ms)
 * 동작 줄이기 설정이면 바로 새 값을 보여준다.
 */
export const useCountUp = (target: number, duration = 600): number => {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (target - from) * easeOut(t));
      setValue(next);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);

  return reduced ? target : value;
};
