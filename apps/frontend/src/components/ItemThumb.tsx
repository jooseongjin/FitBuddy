import React, { useEffect, useRef, useState } from 'react';
import type { Box } from './CharacterCanvas';

/** 아이템 썸네일 이미지와 투명 여백을 제외한 실제 그림 영역 (원본 픽셀 단위) */
export type IconImage = {
  src: string;
  width: number;
  height: number;
  box: Box;
};

// 고해상도 화면에서도 선명하도록 표시 크기보다 크게 그림
const THUMB_RESOLUTION = 240;
// 그림 영역 주변 여백 비율. 모든 아이템이 같은 크기로 보이도록 공통 적용
const THUMB_PADDING = 0.1;

/** 상점 카드용 아이템 썸네일. 원본 여백과 관계없이 그림 영역을 같은 크기로 가운데 정렬 */
export const ItemThumb: React.FC<{ icon: IconImage }> = ({ icon }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      // 원본을 다른 해상도로 다시 내보내도 같은 비율의 영역을 잘라 그림
      const ratio = image.naturalWidth / icon.width;
      const { box } = icon;
      const inner = THUMB_RESOLUTION * (1 - THUMB_PADDING * 2);
      const scale = inner / Math.max(box.width, box.height);
      const drawWidth = box.width * scale;
      const drawHeight = box.height * scale;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        box.x * ratio,
        box.y * ratio,
        box.width * ratio,
        box.height * ratio,
        (THUMB_RESOLUTION - drawWidth) / 2,
        (THUMB_RESOLUTION - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    };
    image.onerror = () => {
      if (!cancelled) setFailedSrc(icon.src);
    };
    image.src = icon.src;
    return () => {
      cancelled = true;
    };
  }, [icon]);

  // 로딩 실패 시 숨김
  if (failedSrc === icon.src) return null;

  return (
    <canvas
      ref={canvasRef}
      className="block h-[88%] w-auto aspect-square"
      width={THUMB_RESOLUTION}
      height={THUMB_RESOLUTION}
      aria-hidden="true"
    />
  );
};
