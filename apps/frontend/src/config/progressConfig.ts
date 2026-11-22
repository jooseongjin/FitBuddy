// 프론트엔드 정책 값 (설계서 1.2 — 프론트에서 정한 값)
// 백엔드와 협의가 필요한 값(레벨 기준·복구 비용·횟수)은 여기 두지 않고 서버 응답을 사용한다.

/** Streak 위험 배너를 띄우는 KST 시각 (20시 이후) */
export const RISK_BANNER_HOUR = 20;

// 캐릭터 이름(두리·나비·보리)은 data/characterItems.ts의 CHARACTERS에서 현재 캐릭터 기준으로 표시
