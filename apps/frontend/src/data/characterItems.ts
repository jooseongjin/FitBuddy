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
  // 실제 에셋이 없으면 null → 준비 중(선택/구매 불가)
  rig: CharacterRig | null;
  price: number;
  owned: boolean;
};

export type PartItem = {
  id: string;
  name: string;
  price: number;
  owned: boolean;
  // 에셋이 없으면 null (카드는 잠금 아이콘, 캐릭터에는 그리지 않음)
  icon: IconImage | null;
  layer: Omit<PartLayer, 'fit'> | null;
  // 캐릭터별 미세 보정. 머리 모양이 캐릭터마다 달라 공통 값을 두지 않음
  fitByCharacter?: Record<string, LayerFit>;
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
  // 새싹 핀의 잎이 이미지 위로 약 130px 나가므로 위쪽 여백 150px, 가로는 헤어밴드 중심 기준으로 대칭
  view: { x: -75, y: -150, width: 1404, height: 1404 },
  slots: {
    head: bottomCenter(box(305, 236, 949, 482)),
    clothes: bottomCenter(box(547, 918, 706, 987)),
    acc: bottomCenter(box(0, 0, 1253, 1253)),
  },
};

// 캐릭터 추가 방법:
// 1. public 폴더에 캐릭터 PNG 추가 (크기 자유, 투명 배경)
// 2. 원본 픽셀 기준으로 head/clothes/acc 슬롯 기준점과 표시 영역(view)을 측정해 rig 지정
// 3. 필요하면 아이템의 fitByCharacter에 이 캐릭터용 보정값 추가
// rig가 null인 캐릭터는 상점에서 '준비 중' 잠금 카드로만 표시되고 선택/구매 불가
export const CHARACTERS: CharacterDef[] = [
  { id: 'char_base', name: '기본 캐릭터', rig: DOG_RIG, price: 0, owned: true },
  // TODO: 추가 예정 캐릭터. 이미지 에셋과 가격이 정해지면 rig/price 지정
  // (현재 기본 캐릭터가 강아지 외형이므로 강아지는 별도 슬롯을 두지 않음)
  { id: 'char_cat', name: '고양이', rig: null, price: 0, owned: false },
  { id: 'char_bird', name: '새', rig: null, price: 0, owned: false },
];
export const DEFAULT_CHARACTER_ID = 'char_base';

// 머리 아이템 PNG는 크기와 여백이 제각각이라, 아이템마다 실제 그림 영역(알파 > 16)을 측정해 사용
// 썸네일(icon)은 그림 영역만 잘라 카드에 같은 크기로, 레이어(layer)는 영역 하단 중앙을 머리 슬롯에 맞춤
// icon_*.png와 hat_*.png는 같은 파일이라 그림 영역도 같음
const headItem = (iconSrc: string, layerSrc: string, width: number, height: number, area: Box) => ({
  icon: { src: iconSrc, width, height, box: area },
  layer: { src: layerSrc, width, height, anchor: bottomCenter(area) },
});

const CAP = headItem('/icon_cap.png', '/hat_cap.png', 868, 872, box(154, 144, 717, 473));
const SPROUT = headItem('/icon_sprout.png', '/hat_sprout.png', 829, 832, box(55, 91, 794, 551));
const BEANIE = headItem('/icon_beanie.png', '/hat_beanie.png', 706, 704, box(91, 21, 616, 444));
const BUCKET = headItem('/icon_bucket.png', '/hat_bucket.png', 895, 857, box(90, 63, 806, 471));

// 강아지 의상 PNG는 모두 같은 300×300 틀에 그려져 있고 가운데 목 파임(x131–167, y221–234)이 같음
// 레이어는 목 파임 하단 중앙을 의상 슬롯(목걸이 태그 하단)에 맞추고, 썸네일은 옷 그림 영역만 잘라 사용
const DOG_CLOTHES_NECK = bottomCenter(box(131, 221, 167, 234));
const dogClothesItem = (src: string, area: Box) => ({
  icon: { src, width: 300, height: 300, box: area },
  layer: { src, width: 300, height: 300, anchor: DOG_CLOTHES_NECK },
});

const HOODIE = dogClothesItem('/dog_clothes_hoodie.png', box(89, 209, 209, 265));
const OVERALLS = dogClothesItem('/dog_clothes_overalls.png', box(105, 214, 192, 266));
const RAINCOAT = dogClothesItem('/dog_clothes_raincoat.png', box(89, 209, 209, 265));
const TANK = dogClothesItem('/dog_clothes_tank.png', box(101, 213, 196, 264));

// 강아지 액세서리 PNG는 300×300 틀(캐릭터 이미지를 1/4.18로 축소한 좌표)에 제자리에 그려져 있음
// 레이어는 틀 하단 중앙을 액세서리 슬롯에 맞추고, 썸네일은 소품 그림 영역만 잘라 사용
const DOG_ACC_FRAME = bottomCenter(box(0, 0, 299, 299));
const dogAccItem = (src: string, area: Box) => ({
  icon: { src, width: 300, height: 300, box: area },
  layer: { src, width: 300, height: 300, anchor: DOG_ACC_FRAME },
});

const STAR_CLIP = dogAccItem('/dog_acc_star_clip.png', box(237, 85, 264, 108));
const BACKPACK = dogAccItem('/dog_acc_backpack.png', box(18, 209, 74, 280));
const BOTTLE_BAG = dogAccItem('/dog_acc_bottle_bag.png', box(254, 215, 280, 279));
const SUNGLASSES = dogAccItem('/dog_acc_sunglasses.png', box(76, 124, 222, 158));

// 아이템명/가격은 UI 설계서(SCR-SHP-01) 기준
// fitByCharacter: 기본 캐릭터에 겹쳐 렌더링해 보며 조정한 값
// - 새싹 핀/버킷햇: 디자인 시안 스크린샷(목걸이 너비 기준 원본의 1/2 크기)에서 역산
//   새싹 핀: 원본의 1.36배, 안쪽 호 가운데 아랫선이 헤어밴드 윗선 바로 위(y241), 양끝이 귀를 덮음
//   버킷햇: 원본의 1.31배, 챙 가운데 아랫선이 y407로 헤어밴드를 모두 가리고 챙이 귀를 덮음
// TODO: 의상 가격과 기본 보유 여부는 임시값 (등산 자켓 대신 햇살 우비를 기본 보유/착용으로 지정). 기획 확정 후 수정
export const PART_ITEMS: Record<PartCategory, PartItem[]> = {
  head: [
    { id: 'hat_cap', name: '구름 캡', price: 0, owned: true, ...CAP, bgColor: '#E8F3EE' },
    {
      id: 'hat_sprout',
      name: '새싹 핀',
      price: 0,
      owned: true,
      ...SPROUT,
      fitByCharacter: { char_base: { dx: 0.0078, dy: 0.0188, scale: 1.5562 } },
      bgColor: '#E8F5E9',
    },
    {
      id: 'hat_beanie',
      name: '방울 비니',
      price: 480,
      owned: false,
      ...BEANIE,
      fitByCharacter: { char_base: { dy: 0.04, scale: 1.08 } },
      bgColor: '#FCE8E6',
    },
    {
      id: 'hat_bucket',
      name: '별빛 버킷햇',
      price: 720,
      owned: false,
      ...BUCKET,
      fitByCharacter: { char_base: { dy: 0.1991, scale: 1.4547 } },
      bgColor: '#EDE7F6',
    },
  ],
  clothes: [
    { id: 'dog_clothes_raincoat', name: '햇살 우비', price: 0, owned: true, ...RAINCOAT, bgColor: '#FFF8E1' },
    { id: 'dog_clothes_hoodie', name: '민트 후드티', price: 480, owned: false, ...HOODIE, bgColor: '#E8F5E9' },
    { id: 'dog_clothes_overalls', name: '데님 멜빵바지', price: 600, owned: false, ...OVERALLS, bgColor: '#E3F2FD' },
    { id: 'dog_clothes_tank', name: '발바닥 민소매', price: 360, owned: false, ...TANK, bgColor: '#F1F8E9' },
  ],
  // 액세서리 fitByCharacter (기본 캐릭터 기준)
  // - 별 머리핀: 틀 위치 그대로 오른쪽 귀 위
  // - 백팩/물병 가방: 크기는 틀 그대로, 밑면을 발바닥 바닥선(y1212)에 맞춰 바닥에 세워 둔 모양
  // - 선글라스: 렌즈 중점을 눈 높이(627, 560)에 두고, 테 양끝(x77–221)이 그 높이의 얼굴 윤곽선(x298–956)에 닿도록
  //   배율 4.57 (원본 대비). 눈은 모두 덮고 눈썹·볼·코와는 겹치지 않음
  // TODO: 액세서리 가격과 보유 여부는 임시값. 기획 확정 후 수정
  acc: [
    { id: 'dog_acc_star_clip', name: '별 머리핀', price: 240, owned: false, ...STAR_CLIP, bgColor: '#FFF8E1' },
    {
      id: 'dog_acc_backpack',
      name: '민트 백팩',
      price: 600,
      owned: false,
      ...BACKPACK,
      fitByCharacter: { char_base: { dy: 0.0298 } },
      bgColor: '#E8F5E9',
    },
    {
      id: 'dog_acc_bottle_bag',
      name: '물병 가방',
      price: 420,
      owned: false,
      ...BOTTLE_BAG,
      fitByCharacter: { char_base: { dy: 0.0332 } },
      bgColor: '#E0F2F1',
    },
    {
      id: 'dog_acc_sunglasses',
      name: '선글라스',
      price: 360,
      owned: false,
      ...SUNGLASSES,
      fitByCharacter: { char_base: { dx: 0.0036, dy: 0.0299, scale: 1.0931 } },
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

// 캐릭터별 초기 착용 상태 (설계서 시안: 구름 캡 + 등산 자켓 → 자켓 에셋이 없어 햇살 우비로 대체)
// TODO: 전역 상태/서버 연동 전까지 홈과 상점 모두 이 초기값에서 시작
export const INITIAL_EQUIPPED: Record<string, EquippedIds> = {
  [DEFAULT_CHARACTER_ID]: { head: 'hat_cap', clothes: 'dog_clothes_raincoat', acc: null },
};
export const EMPTY_EQUIPPED: EquippedIds = { head: null, clothes: null, acc: null };

export const findCharacter = (characterId: string) =>
  CHARACTERS.find((character) => character.id === characterId) ?? CHARACTERS[0];

export const findPart = (category: PartCategory, itemId: string | null) =>
  PART_ITEMS[category].find((item) => item.id === itemId) ?? null;

// 아이템 + 캐릭터 → 캐릭터별 보정값을 적용한 레이어
const toLayer = (item: PartItem | null, characterId: string): PartLayer | null =>
  item?.layer ? { ...item.layer, fit: item.fitByCharacter?.[characterId] } : null;

// 캐릭터 + 착용 아이템 ID → CharacterCanvas에 넘길 레이어
export const getEquippedParts = (character: CharacterDef, equippedIds: EquippedIds): EquippedParts => ({
  base: character.rig,
  clothes: toLayer(findPart('clothes', equippedIds.clothes), character.id),
  head: toLayer(findPart('head', equippedIds.head), character.id),
  acc: toLayer(findPart('acc', equippedIds.acc), character.id),
});
