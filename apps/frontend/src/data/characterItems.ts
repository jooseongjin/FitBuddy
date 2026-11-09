import type {
  Anchor,
  Box,
  CharacterRig,
  EquippedParts,
  LayerFit,
  PartLayer,
} from '../components/CharacterCanvas';
import type { IconImage } from '../components/ItemThumb';

// 상점(SCR-SHP-01)과 홈(SCR-HOM-01)이 같은 캐릭터/아이템 데이터를 쓰도록 분리한 공통 데이터

export type PartCategory = 'head' | 'clothes' | 'acc';

export type CharacterDef = {
  id: string;
  name: string;
  // 실제 에셋이 없으면 null → 준비 중(선택 불가)
  rig: CharacterRig | null;
  price: number;
  owned: boolean;
};

// 캐릭터 한 명에게 씌우는 아이템 레이어 (+ 그 캐릭터용 미세 보정)
export type PartLayerDef = Omit<PartLayer, 'fit'> & { fit?: LayerFit };

export type PartItem = {
  id: string;
  name: string;
  price: number;
  owned: boolean;
  // 상점 카드 썸네일. 에셋이 없으면 null (잠금 아이콘)
  icon: IconImage | null;
  // 캐릭터 ID별 레이어. 캐릭터마다 몸 모양이 달라 전용 이미지·보정값을 따로 둠
  // 레이어가 없는 캐릭터에게는 '준비 중'으로 표시되고 착용할 수 없음
  layers: Partial<Record<string, PartLayerDef>>;
  // 캐릭터 ID별 '아이템을 착용한 모습' 기본 이미지 (선택)
  // 디자인상 레이어로 겹치기 어려운 경우, 착용하면 캐릭터 기본 이미지를 이 이미지로 바꾸고 이 아이템 레이어는 그리지 않음
  // 이미지는 기본 이미지와 같은 크기·같은 틀이어야 함 (다른 파츠 기준점을 그대로 씀)
  baseSwaps?: Partial<Record<string, string>>;
  // 교체된 기본 이미지(baseSwaps 이미지 경로)별 레이어 (선택). 교체된 모습에서 위치가 달라지는 아이템만 지정
  // 예: 새싹 모자를 쓴 토끼는 귀가 처져(롭이어) 별 머리핀을 처진 귀에 꽂음
  layersOnSwap?: Partial<Record<string, PartLayerDef>>;
  bgColor: string;
};

// 배경은 캐릭터 레이어가 아니라 미리보기 영역의 배경 이미지로 적용
export type BackgroundItem = {
  id: string;
  name: string;
  price: number;
  owned: boolean;
  thumbSrc: string;
  imageSrc: string;
};

export type EquippedIds = Record<PartCategory, string | null>;

// 측정값(x1, y1, x2, y2: 원본 픽셀, 양 끝 포함) → Box
const box = (x1: number, y1: number, x2: number, y2: number): Box => ({
  x: x1,
  y: y1,
  width: x2 - x1 + 1,
  height: y2 - y1 + 1,
});

// 머리 슬롯/모자 공통 기준점: 영역 하단 중앙 + 영역 너비
const bottomCenter = (area: Box): Anchor => ({
  x: area.x + area.width / 2,
  y: area.y + area.height,
  width: area.width,
});

// 1254×1254 틀 전체. 캐릭터와 같은 틀에 제자리로 그려진 아이템 이미지는 틀째로 겹침
const FULL_FRAME_1254 = bottomCenter(box(0, 0, 1253, 1253));

// char_base.png (1254×1254). 그림 영역 x14–1238, y105–1213
// 머리 슬롯: 이미지에 함께 그려진 초록 헤어밴드 영역(x305–949, y236–482)
// 모자를 씌우면 헤어밴드를 덮도록 모자 하단을 헤어밴드 하단에 맞춤
// 의상 슬롯: 목걸이 뼈다귀 태그 영역(x547–706, y918–987). 의상의 목 파임이 태그를 감싸도록 맞춤
// 액세서리 슬롯: 캐릭터 이미지 전체(하단 중앙). 액세서리는 귀·눈·몸 옆 등 위치가 제각각이라
// 캐릭터를 축소한 300×300 틀에 제자리에 그려져 있으므로, 틀 전체를 캐릭터 이미지 전체에 맞춤
const DOG_RIG: CharacterRig = {
  src: '/char_base.png',
  width: 1254,
  height: 1254,
  // 새싹 모자의 잎이 이미지 위로 약 130px 나가므로 위쪽 여백 150px, 가로는 헤어밴드 중심 기준으로 대칭
  view: { x: -75, y: -150, width: 1404, height: 1404 },
  slots: {
    head: bottomCenter(box(305, 236, 949, 482)),
    clothes: bottomCenter(box(547, 918, 706, 987)),
    acc: FULL_FRAME_1254,
  },
};

// char_cat.png (1254×1254). 그림 영역 x159–1147, y58–1213
// 머리 슬롯: 초록 헤어밴드(외곽선 포함 x258–995, y234–480)
// 고양이 아이템 이미지는 모두 고양이 그림 틀에 제자리로 그려져 있음
// - 모자(cat_hat_*), 액세서리(cat_acc_*): 1254×1254 틀 → 모자는 헤어밴드 기준점, 액세서리는 틀 전체를 맞춤
// - 의상(cat_clothes_*): 고양이를 1/4.18로 줄인 300×300 틀 → 틀 전체를 고양이 이미지 전체에 맞춤
const CAT_HEADBAND = bottomCenter(box(258, 234, 995, 480));
const CAT_RIG: CharacterRig = {
  src: '/char_cat.png',
  width: 1254,
  height: 1254,
  // 방울 비니의 방울이 이미지 위로 약 125px 나가므로 강아지와 같은 여백 사용
  view: { x: -75, y: -150, width: 1404, height: 1404 },
  slots: {
    head: CAT_HEADBAND,
    clothes: FULL_FRAME_1254,
    acc: FULL_FRAME_1254,
  },
};

// char_rabbit.png (1254×1254). 그림 영역 x231–1104, y5–1240 (귀가 길어 위쪽 여백이 거의 없음)
// 토끼 아이템 이미지는 모두 토끼 그림 틀에 제자리로 그려져 있어, 슬롯은 모두 틀 전체를 씀
// - 모자(rabbit_hat_*)·의상(rabbit_clothes_*): 토끼를 1/4.18로 줄인 300×300 틀
// - 액세서리(rabbit_acc_*): 1254×1254 틀
// - 새싹 모자: 토끼 귀와 겹치는 디자인 문제로 레이어 대신 '새싹 모자를 쓴 토끼' 이미지(char_rabbit_sprout.png)로 통째로 교체
const RABBIT_RIG: CharacterRig = {
  src: '/char_rabbit.png',
  width: 1254,
  height: 1254,
  view: { x: -75, y: -75, width: 1404, height: 1404 },
  slots: {
    head: FULL_FRAME_1254,
    clothes: FULL_FRAME_1254,
    acc: FULL_FRAME_1254,
  },
};

// 캐릭터 추가 방법:
// 1. public 폴더에 캐릭터 PNG 추가 (크기 자유, 투명 배경)
// 2. 원본 픽셀 기준으로 head/clothes/acc 슬롯 기준점과 표시 영역(view)을 측정해 rig 지정
// 3. 아이템의 layers에 이 캐릭터용 레이어(이미지·기준점·보정값) 추가
// rig가 null인 캐릭터는 상점에서 '준비 중' 잠금 카드로만 표시되고 선택 불가
// 캐릭터는 구매하지 않고 모두 기본 보유 → 상점 캐릭터 탭에서 바로 교체
export const CHARACTERS: CharacterDef[] = [
  { id: 'char_base', name: '두리', rig: DOG_RIG, price: 0, owned: true },
  { id: 'char_cat', name: '나비', rig: CAT_RIG, price: 0, owned: true },
  { id: 'char_rabbit', name: '보리', rig: RABBIT_RIG, price: 0, owned: true },
];
export const DEFAULT_CHARACTER_ID = 'char_base';
const DOG = 'char_base';
const CAT = 'char_cat';
const RABBIT = 'char_rabbit';
// 새싹 모자를 쓴 토끼 (새싹 모자 착용 시 토끼 기본 이미지를 이 이미지로 교체)
const RABBIT_SPROUT_SRC = '/char_rabbit_sprout.png';

// 상점 썸네일: icon_*.png (1254×1254, 투명 여백 포함). 그림 영역(알파 > 16)만 잘라 카드에 같은 크기로 표시
const icon = (src: string, area: Box): IconImage => ({ src, width: 1254, height: 1254, box: area });

// 모자 레이어: PNG마다 크기와 여백이 제각각이라 실제 그림 영역(알파 > 16)을 측정해, 영역 하단 중앙을 머리 슬롯에 맞춤
const hatLayer = (src: string, width: number, height: number, area: Box, fit?: LayerFit): PartLayerDef => ({
  src,
  width,
  height,
  anchor: bottomCenter(area),
  fit,
});

// 고양이 모자(cat_hat_*.png, 1254×1254): 고양이 틀에 제자리로 그려져 있어 기준점이 고양이 헤어밴드와 같음
// fit은 고양이에 겹쳐 그려 보며 맞춘 보정값. 기준: 챙이 헤어밴드를 모두 덮고(드러나는 헤어밴드 픽셀 0),
// 눈은 가리지 않도록. 귀는 캡·비니·버킷햇은 모자 밖으로 보이고, 새싹 모자는 곰 귀 모양이 고양이 귀를 덮는 디자인이라
// 원본의 0.98배(시안 크기), 높이는 고양이 헤어밴드가 딱 가려지는 선(드러나는 헤어밴드 픽셀 0)까지 올려 맞춤 (고양이 귀는 가려짐)
const catHat = (src: string, fit?: LayerFit): PartLayerDef => ({
  src,
  width: 1254,
  height: 1254,
  anchor: CAT_HEADBAND,
  fit,
});

// 강아지 의상 PNG는 모두 같은 300×300 틀에 그려져 있고 가운데 목 파임(x131–167, y221–234)이 같음
// 레이어는 목 파임 하단 중앙을 의상 슬롯(목걸이 태그 하단)에 맞춤
const DOG_CLOTHES_NECK = bottomCenter(box(131, 221, 167, 234));
const dogClothes = (src: string): PartLayerDef => ({ src, width: 300, height: 300, anchor: DOG_CLOTHES_NECK });

// 캐릭터 그림 틀에 제자리로 그려진 아이템 (고양이 의상·액세서리, 토끼 모자·의상·액세서리)
// 틀 전체를 캐릭터 이미지 전체에 맞춰 겹침 (보정 불필요)
// - inFrame300: 캐릭터를 1/4.18로 줄인 300×300 틀
// - inFrame1254: 캐릭터 그림과 같은 1254×1254 틀
const FRAME_300 = bottomCenter(box(0, 0, 299, 299));
const inFrame300 = (src: string): PartLayerDef => ({ src, width: 300, height: 300, anchor: FRAME_300 });
const inFrame1254 = (src: string): PartLayerDef => ({ src, width: 1254, height: 1254, anchor: FULL_FRAME_1254 });

// 강아지 액세서리 PNG는 300×300 틀(캐릭터 이미지를 1/4.18로 축소한 좌표)에 제자리에 그려져 있음
// 레이어는 틀 하단 중앙을 액세서리 슬롯에 맞춤
const dogAcc = (src: string, fit?: LayerFit): PartLayerDef => ({
  src,
  width: 300,
  height: 300,
  anchor: FRAME_300,
  fit,
});

// 아이템명/가격은 UI 설계서(SCR-SHP-01) 기준
// 강아지 fit: 기본 캐릭터에 겹쳐 렌더링해 보며 조정한 값
// - 새싹 모자/버킷햇: 디자인 시안 스크린샷(목걸이 너비 기준 원본의 1/2 크기)에서 역산
//   새싹 모자: 원본의 1.36배, 안쪽 호 가운데 아랫선이 헤어밴드 윗선 바로 위(y241), 양끝이 귀를 덮음
//   버킷햇: 원본의 1.31배, 챙 가운데 아랫선이 y407로 헤어밴드를 모두 가리고 챙이 귀를 덮음
// TODO: 의상 가격과 기본 보유 여부는 임시값 (등산 자켓 대신 햇살 우비를 기본 보유/착용으로 지정). 기획 확정 후 수정
export const PART_ITEMS: Record<PartCategory, PartItem[]> = {
  head: [
    {
      id: 'hat_cap',
      name: '그린 캡',
      price: 0,
      owned: true,
      icon: icon('/icon_hat_cap.png', box(71, 289, 1175, 1001)),
      layers: {
        [DOG]: hatLayer('/hat_cap.png', 868, 872, box(154, 144, 717, 473)),
        [CAT]: catHat('/cat_hat_cap.png'),
        [RABBIT]: inFrame300('/rabbit_hat_cap.png'),
      },
      bgColor: '#E8F3EE',
    },
    {
      id: 'hat_sprout',
      name: '새싹 모자',
      price: 0,
      owned: true,
      icon: icon('/icon_hat_sprout.png', box(61, 248, 1192, 1001)),
      layers: {
        [DOG]: hatLayer('/hat_sprout.png', 829, 832, box(55, 91, 794, 551), { dx: 0.0078, dy: 0.0188, scale: 1.5562 }),
        [CAT]: catHat('/cat_hat_sprout.png', { dy: -0.185, scale: 0.98 }),
      },
      // 토끼는 새싹 모자를 쓴 토끼 이미지로 기본 이미지를 교체
      baseSwaps: { [RABBIT]: RABBIT_SPROUT_SRC },
      bgColor: '#E8F5E9',
    },
    {
      id: 'hat_beanie',
      name: '방울 비니',
      price: 480,
      owned: false,
      icon: icon('/icon_hat_beanie.png', box(122, 169, 1129, 1034)),
      layers: {
        [DOG]: hatLayer('/hat_beanie.png', 706, 704, box(91, 21, 616, 444), { dy: 0.04, scale: 1.08 }),
        [CAT]: catHat('/cat_hat_beanie.png', { scale: 1.03 }),
        [RABBIT]: inFrame300('/rabbit_hat_beanie.png'),
      },
      bgColor: '#FCE8E6',
    },
    {
      id: 'hat_bucket',
      name: '별빛 버킷햇',
      price: 720,
      owned: false,
      icon: icon('/icon_hat_bucket.png', box(35, 309, 1217, 975)),
      layers: {
        [DOG]: hatLayer('/hat_bucket.png', 895, 857, box(90, 63, 806, 471), { dy: 0.1991, scale: 1.4547 }),
        [CAT]: catHat('/cat_hat_bucket.png', { dy: 0.08 }),
        [RABBIT]: inFrame300('/rabbit_hat_bucket.png'),
      },
      bgColor: '#EDE7F6',
    },
  ],
  clothes: [
    {
      id: 'dog_clothes_raincoat',
      name: '햇살 우비',
      price: 0,
      owned: true,
      icon: icon('/icon_clothes_raincoat.png', box(105, 153, 1145, 1109)),
      layers: {
        [DOG]: dogClothes('/dog_clothes_raincoat.png'),
        [CAT]: inFrame300('/cat_clothes_raincoat.png'),
        [RABBIT]: inFrame300('/rabbit_clothes_raincoat.png'),
      },
      bgColor: '#FFF8E1',
    },
    {
      id: 'dog_clothes_hoodie',
      name: '민트 후드티',
      price: 480,
      owned: false,
      icon: icon('/icon_clothes_hoodie.png', box(85, 253, 1167, 1039)),
      layers: {
        [DOG]: dogClothes('/dog_clothes_hoodie.png'),
        [CAT]: inFrame300('/cat_clothes_hoodie.png'),
        [RABBIT]: inFrame300('/rabbit_clothes_hoodie.png'),
      },
      bgColor: '#E8F5E9',
    },
    {
      id: 'dog_clothes_overalls',
      name: '데님 멜빵바지',
      price: 600,
      owned: false,
      icon: icon('/icon_clothes_overalls.png', box(103, 162, 1150, 1154)),
      layers: {
        [DOG]: dogClothes('/dog_clothes_overalls.png'),
        [CAT]: inFrame300('/cat_clothes_overalls.png'),
        [RABBIT]: inFrame300('/rabbit_clothes_overalls.png'),
      },
      bgColor: '#E3F2FD',
    },
    {
      id: 'dog_clothes_tank',
      name: '발바닥 민소매',
      price: 360,
      owned: false,
      icon: icon('/icon_clothes_tank.png', box(126, 218, 1130, 1091)),
      layers: {
        [DOG]: dogClothes('/dog_clothes_tank.png'),
        [CAT]: inFrame300('/cat_clothes_tank.png'),
        [RABBIT]: inFrame300('/rabbit_clothes_tank.png'),
      },
      bgColor: '#F1F8E9',
    },
  ],
  // 액세서리 fit (강아지 기준)
  // - 별 머리핀: 틀 위치 그대로 오른쪽 귀 위
  // - 백팩/물병 가방: 크기는 틀 그대로, 밑면을 발바닥 바닥선(y1212)에 맞춰 바닥에 세워 둔 모양
  // - 선글라스: 렌즈 중점을 눈 높이(627, 560)에 두고, 테 양끝(x77–221)이 그 높이의 얼굴 윤곽선(x298–956)에 닿도록
  //   배율 4.57 (원본 대비). 눈은 모두 덮고 눈썹·볼·코와는 겹치지 않음
  // TODO: 액세서리 가격과 보유 여부는 임시값. 기획 확정 후 수정
  acc: [
    {
      id: 'dog_acc_star_clip',
      name: '별 머리핀',
      price: 240,
      owned: false,
      icon: icon('/icon_star_clip.png', box(169, 320, 1119, 988)),
      layers: {
        [DOG]: dogAcc('/dog_acc_star_clip.png'),
        [CAT]: inFrame1254('/cat_acc_star_clip.png'),
        [RABBIT]: inFrame1254('/rabbit_acc_star_clip.png'),
      },
      // 새싹 모자를 쓴 토끼: 서 있던 귀가 모자에 가려지므로 오른쪽 처진 귀 윗부분(모자 챙 바로 아래)에 꽂음
      // 핀 중심을 원래 자리(948, 294)에서 처진 귀 위(1025, 770)로 옮김 (1254 틀 기준)
      layersOnSwap: {
        [RABBIT_SPROUT_SRC]: { ...inFrame1254('/rabbit_acc_star_clip.png'), fit: { dx: 0.0614, dy: 0.3796 } },
      },
      bgColor: '#FFF8E1',
    },
    {
      id: 'dog_acc_backpack',
      name: '민트 백팩',
      price: 600,
      owned: false,
      icon: icon('/icon_backpack.png', box(130, 161, 1123, 1077)),
      layers: {
        [DOG]: dogAcc('/dog_acc_backpack.png', { dy: 0.0298 }),
        [CAT]: inFrame1254('/cat_acc_backpack.png'),
        [RABBIT]: inFrame1254('/rabbit_acc_backpack.png'),
      },
      bgColor: '#E8F5E9',
    },
    {
      id: 'dog_acc_bottle_bag',
      name: '물병 가방',
      price: 420,
      owned: false,
      icon: icon('/icon_bottle_bag.png', box(266, 141, 1032, 1105)),
      layers: {
        [DOG]: dogAcc('/dog_acc_bottle_bag.png', { dy: 0.0332 }),
        [CAT]: inFrame1254('/cat_acc_bottle_bag.png'),
        [RABBIT]: inFrame1254('/rabbit_acc_bottle_bag.png'),
      },
      bgColor: '#E0F2F1',
    },
    {
      id: 'dog_acc_sunglasses',
      name: '선글라스',
      price: 360,
      owned: false,
      icon: icon('/icon_sunglasses.png', box(114, 445, 1232, 875)),
      layers: {
        [DOG]: dogAcc('/dog_acc_sunglasses.png', { dx: 0.0036, dy: 0.0299, scale: 1.0931 }),
        [CAT]: inFrame1254('/cat_acc_sunglasses.png'),
        [RABBIT]: inFrame1254('/rabbit_acc_sunglasses.png'),
      },
      bgColor: '#EDE7F6',
    },
  ],
};

// 배경 PNG는 300×300 불투명 이미지. 캐릭터 레이어와 분리해 미리보기 영역을 꽉 채워(cover) 표시
// TODO: 배경 가격과 보유 여부는 임시값. 기획 확정 후 수정
export const BACKGROUND_ITEMS: BackgroundItem[] = [
  { id: 'dog_bg_park', name: '초록 공원', price: 300, owned: false, thumbSrc: '/dog_bg_park.png', imageSrc: '/dog_bg_park.png' },
  {
    id: 'dog_bg_playground',
    name: '러닝 트랙',
    price: 450,
    owned: false,
    thumbSrc: '/dog_bg_playground.png',
    imageSrc: '/dog_bg_playground.png',
  },
  { id: 'dog_bg_room', name: '아늑한 방', price: 300, owned: false, thumbSrc: '/dog_bg_room.png', imageSrc: '/dog_bg_room.png' },
  { id: 'dog_bg_sunset', name: '노을 언덕', price: 450, owned: false, thumbSrc: '/dog_bg_sunset.png', imageSrc: '/dog_bg_sunset.png' },
];

// 캐릭터별 초기 착용 상태
// 시연 기본값: 두리로 시작하고, 기본 아이템(그린 캡·새싹 모자·햇살 우비)은 보유만 하고 장착하지 않은 상태
// 나비·보리도 처음 교체했을 때 아무것도 착용하지 않은 기본 모습
// TODO: 전역 상태/서버 연동 전까지 홈과 상점 모두 이 초기값에서 시작
export const INITIAL_EQUIPPED: Record<string, EquippedIds> = {
  [DEFAULT_CHARACTER_ID]: { head: null, clothes: null, acc: null },
};
export const EMPTY_EQUIPPED: EquippedIds = { head: null, clothes: null, acc: null };

export const findCharacter = (characterId: string) =>
  CHARACTERS.find((character) => character.id === characterId) ?? CHARACTERS[0];

export const findPart = (category: PartCategory, itemId: string | null) =>
  PART_ITEMS[category].find((item) => item.id === itemId) ?? null;

/** 이 캐릭터가 착용할 수 있는 아이템인지 (캐릭터 전용 레이어가 있는지) */
export const isPartAvailableFor = (item: PartItem, characterId: string) =>
  item.layers[characterId] !== undefined || item.baseSwaps?.[characterId] !== undefined;

// 아이템 + 캐릭터 → 그 캐릭터용 레이어. 레이어가 없거나 기본 이미지 교체 아이템이면 그리지 않음
// 기본 이미지가 교체된 상태(swapSrc)면 그 모습 전용 레이어(layersOnSwap)를 먼저 씀
const toLayer = (item: PartItem | null, characterId: string, swapSrc?: string): PartLayer | null => {
  if (!item || item.baseSwaps?.[characterId]) return null;
  return (swapSrc ? item.layersOnSwap?.[swapSrc] : undefined) ?? item.layers[characterId] ?? null;
};

// 캐릭터 + 착용 아이템 ID → CharacterCanvas에 넘길 레이어
// 착용 아이템 중 기본 이미지 교체(baseSwaps)가 있으면 캐릭터 기본 이미지만 그 이미지로 바꿈 (기준점·표시 영역은 그대로)
export const getEquippedParts = (character: CharacterDef, equippedIds: EquippedIds): EquippedParts => {
  const head = findPart('head', equippedIds.head);
  const clothes = findPart('clothes', equippedIds.clothes);
  const acc = findPart('acc', equippedIds.acc);
  const swapSrc = [head, clothes, acc]
    .map((item) => item?.baseSwaps?.[character.id])
    .find((src) => src !== undefined);
  return {
    base: character.rig && swapSrc ? { ...character.rig, src: swapSrc } : character.rig,
    clothes: toLayer(clothes, character.id, swapSrc),
    head: toLayer(head, character.id, swapSrc),
    acc: toLayer(acc, character.id, swapSrc),
  };
};
