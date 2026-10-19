import React from 'react';
import { Eye, PawPrint } from 'lucide-react';
import { CharacterCanvas, type EquippedParts } from './CharacterCanvas';
import { ICON_SIZE } from './categoryIcons';

type CharacterStageProps = {
  equippedParts: EquippedParts;
  label: string;
  /** 실제 적용 상태 (예: 기본 캐릭터 · 기본 배경) */
  statusText: string;
  /** 배경 이미지. 없으면 기본 민트 배경 */
  backgroundSrc?: string | null;
  /** 미리보기 중인 아이템 이름. 있으면 좌측 상단에 별도 배지로 표시 */
  previewName?: string | null;
  /** 미리보기 배지 자리를 미리 확보해 캐릭터 위치가 흔들리지 않게 할지 여부 */
  reservePreviewSpace?: boolean;
};

/**
 * 캐릭터 미리보기 영역 (상점/마이페이지 공용)
 * - 미리보기 배지(하늘색 점선)와 현재 상태 표시(흰색 + 발바닥)는 위치와 모양을 달리해 구분
 */
export const CharacterStage: React.FC<CharacterStageProps> = ({
  equippedParts,
  label,
  statusText,
  backgroundSrc = null,
  previewName = null,
  reservePreviewSpace = false,
}) => (
  <div
    className={`relative rounded-3xl border-4 border-white shadow-sm px-4 pb-4 overflow-hidden ${
      reservePreviewSpace ? 'pt-10' : 'pt-4'
    } ${backgroundSrc ? 'bg-cover bg-center' : 'bg-[radial-gradient(circle_at_50%_38%,#F2FBF6_0%,#DDF3E8_70%)]'}`}
    style={backgroundSrc ? { backgroundImage: `url(${backgroundSrc})` } : undefined}
  >
    {previewName && (
      <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-[#DCEEFF] text-sky-800 border border-dashed border-sky-300 text-[11px] font-bold px-2.5 py-1 rounded-full">
        <Eye size={ICON_SIZE.badge} aria-hidden="true" />
        미리보기 중 · {previewName}
      </span>
    )}
    <div className="flex justify-center">
      <div className="relative">
        {/* 캐릭터 발밑 그림자: 일러스트가 미리보기 영역에 자연스럽게 놓이도록 */}
        <div
          className="absolute bottom-[1%] left-1/2 -translate-x-1/2 w-[45%] h-[7%] rounded-[50%] bg-[#59B985]/20"
          aria-hidden="true"
        />
        <div className="relative">
          <CharacterCanvas equippedParts={equippedParts} size="shop" label={label} />
        </div>
      </div>
    </div>
    <div className="text-center mt-2">
      <span className="inline-flex items-center gap-1.5 bg-white text-[#2F8A5B] text-xs font-bold px-3 py-1 rounded-full">
        <PawPrint size={ICON_SIZE.badge} aria-hidden="true" />
        {statusText}
      </span>
    </div>
  </div>
);
