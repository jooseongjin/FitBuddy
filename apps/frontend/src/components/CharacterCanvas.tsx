import React, { useEffect, useRef } from 'react';

/** 이미지 원본 픽셀 좌표계의 사각형 */
export type Box = { x: number; y: number; width: number; height: number };

/** 정렬 기준점: 가로 중심 x, 기준선 y, 기준 너비 (원본 픽셀 단위) */
export type Anchor = { x: number; y: number; width: number };

export type PartSlot = 'clothes' | 'head' | 'acc';

/**
 * 캐릭터 기준 정보. 캐릭터 PNG의 원본 픽셀 좌표계를 캐릭터 좌표계로 사용
 * 캐릭터마다 머리/몸 위치가 다르므로 슬롯 기준점은 캐릭터별로 지정
 */
export type CharacterRig = {
  src: string;
  /** 기준점을 측정한 원본 이미지 크기. 같은 비율로 다시 내보내면 해상도가 달라도 그대로 사용 가능 */
  width: number;
  height: number;
  /** 캔버스에 보여줄 영역 (모자 등이 이미지 밖으로 나가는 여백 포함) */
  view: Box;
  /** 파츠 슬롯 기준점. 슬롯이 없으면 위치를 알 수 없으므로 해당 아이템은 그리지 않음 */
  slots: Partial<Record<PartSlot, Anchor>>;
};

/** 아이템 미세 보정. dx/dy는 슬롯 기준 너비 대비 비율, scale은 슬롯 너비 대비 배율 */
export type LayerFit = { dx?: number; dy?: number; scale?: number };

/** 착용 아이템 레이어 */
export type PartLayer = {
  src: string;
  width: number;
  height: number;
  /** 아이템 PNG 안의 기준점. 슬롯 기준점 위치에 놓이고, 기준 너비가 슬롯 너비에 맞춰짐 */
  anchor: Anchor;
  fit?: LayerFit;
};

// null이면 해당 레이어를 그리지 않음
export type EquippedParts = {
  /** 1. 기본 캐릭터 */
  base: CharacterRig | null;
  /** 2. 의상 */
  clothes: PartLayer | null;
  /** 3. 머리 장식(모자) */
  head: PartLayer | null;
  /** 4. 액세서리 */
  acc: PartLayer | null;
};

export type CharacterCanvasSize = 'home' | 'shop' | 'thumb';

export type CharacterCanvasProps = {
  /** 캐릭터와 착용 레이어. 객체가 바뀔 때마다 다시 그리므로 호출부에서 useMemo 등으로 참조를 유지 */
  equippedParts: EquippedParts;
  /** 표시 크기 프리셋 (home: 홈 배너 100px, shop: 상점/마이페이지 뷰어, thumb: 카드 썸네일) */
  size?: CharacterCanvasSize;
  /** 스크린 리더용 대체 텍스트 */
  label?: string;
};

const SIZE_CLASS: Record<CharacterCanvasSize, string> = {
  home: 'w-[100px] h-[100px]',
  shop: 'w-[280px] max-w-full h-auto aspect-square',
  thumb: 'h-full w-auto aspect-square',
};

// 고해상도 화면에서도 선명하도록 표시 크기보다 크게 그림
const CANVAS_RESOLUTION = 480;

// 레이어 병합 순서: 1 기본 → 2 의상 → 3 모자 → 4 액세서리 (SCR-SHP-01)
const PART_ORDER: PartSlot[] = ['clothes', 'head', 'acc'];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

/** 아이템 기준점을 캐릭터 슬롯 기준점에 맞췄을 때의 위치/크기 (캐릭터 좌표계) */
const placeLayer =(slot: Anchor, layer: PartLayer): Box => {
  const fit = layer.fit ?? {};
  const scale = (slot.width * (fit.scale ?? 1)) / layer.anchor.width;
  return {
    x: slot.x + (fit.dx ?? 0) * slot.width - layer.anchor.x * scale,
    y: slot.y + (fit.dy ?? 0) * slot.width - layer.anchor.y * scale,
    width: layer.width * scale,
    height: layer.height * scale,
  };
};

/** 기본 캐릭터와 착용 파츠를 순서대로 겹쳐 그리는 공통 Canvas (홈/상점/마이페이지 공용) */
export const CharacterCanvas: React.FC<CharacterCanvasProps> = ({
  equippedParts,
  size = 'shop',
  label = '현재 캐릭터',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    let cancelled = false;
    const rig = equippedParts.base;

    const drawCharacter = async () => {
      if (!rig) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      // 슬롯 기준점이 없는 파츠는 위치를 정할 수 없으므로 제외
      const parts = PART_ORDER.flatMap((slot) => {
        const layer = equippedParts[slot];
        const anchor = rig.slots[slot];
        return layer && anchor ? [{ layer, box: placeLayer(anchor, layer) }] : [];
      });
      const [baseImage, ...partImages] = await Promise.all([
        loadImage(rig.src),
        ...parts.map(({ layer }) => loadImage(layer.src)),
      ]);
      // 이미지 로딩 중 파츠가 바뀌면 이전 결과는 그리지 않음
      if (cancelled) return;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingQuality = 'high';

      // 캐릭터 좌표계(rig.view) → 캔버스. 비율을 유지하고 가운데 정렬
      const { view } = rig;
      const scale = Math.min(canvas.width / view.width, canvas.height / view.height);
      context.setTransform(
        scale,
        0,
        0,
        scale,
        (canvas.width - view.width * scale) / 2 - view.x * scale,
        (canvas.height - view.height * scale) / 2 - view.y * scale,
      );

      if (baseImage) context.drawImage(baseImage, 0, 0, rig.width, rig.height);
      partImages.forEach((image, index) => {
        if (!image) return;
        const { box } = parts[index];
        context.drawImage(image, box.x, box.y, box.width, box.height);
      });
    };

    void drawCharacter();
    return () => {
      cancelled = true;
    };
  }, [equippedParts]);

  return (
    <canvas
      ref={canvasRef}
      className={`block ${SIZE_CLASS[size]}`}
      width={CANVAS_RESOLUTION}
      height={CANVAS_RESOLUTION}
      role="img"
      aria-label={label}
    />
  );
};
