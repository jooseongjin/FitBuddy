import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

const getSnapshot = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false);

/** 기기 설정 '동작 줄이기' 여부 */
export const usePrefersReducedMotion = (): boolean => useSyncExternalStore(subscribe, getSnapshot, () => false);
