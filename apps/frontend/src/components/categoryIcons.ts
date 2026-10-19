import { HardHat, PawPrint, Shirt, Sparkles, Trees, type LucideIcon } from 'lucide-react';

// 아이콘 공통 규칙: lucide-react, 선 굵기는 기본값(2)으로 홈/미션 화면과 동일하게 사용
// 크기: 배지 12 · 본문 14 · 카드/섹션 제목 16 · 카테고리 탭 18 · 헤더/하단 메뉴 20
export const ICON_SIZE = {
  badge: 12,
  inline: 14,
  title: 16,
  tab: 18,
  nav: 20,
} as const;

export type CategoryKey = 'character' | 'head' | 'clothes' | 'acc' | 'bg';

// 카테고리 아이콘 (lucide-react에 일반 모자 아이콘이 없어 머리는 HardHat 사용)
export const CATEGORY_ICON: Record<CategoryKey, LucideIcon> = {
  character: PawPrint,
  head: HardHat,
  clothes: Shirt,
  acc: Sparkles,
  bg: Trees,
};
