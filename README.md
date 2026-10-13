# 🏋️‍♂️ FitBuddy (핏버디)
> **게이미피케이션 기반 단기 몰입형 헬스케어 및 웰니스 관리 플랫폼**  
> 부담 없는 초간단 온보딩과 2D Canvas 캐릭터 육성/커스터마이징을 통해 운동 지속성을 극대화하는 맞춤형 헬스케어 서비스

---

## 📌 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [팀원 및 역할](#2-팀원-및-역할)
3. [주요 타깃 & 페르소나](#3-주요-타깃--페르소나)
4. [핵심 기능 (MVP)](#4-핵심-기능-mvp)
5. [시스템 아키텍처](#5-시스템-아키텍처)
6. [기술 스택 & 기술적 의사결정](#6-기술-스택--기술적-의사결정)
7. [데이터베이스 설계 (ERD)](#7-데이터베이스-설계-erd)
8. [API 명세서](#8-api-명세서)
9. [핵심 비즈니스 로직 & 흐름도](#9-핵심-비즈니스-로직--흐름도)
10. [비기능 요구사항 & 동시성/정합성 제어](#10-비기능-요구사항--동시성정합성-제어)
11. [보안 요구사항](#11-보안-요구사항)
12. [핵심 지표 & DoD (Definition of Done)](#12-핵심-지표--dod-definition-of-done)

---

## 1. 프로젝트 개요

기존 헬스케어 앱의 복잡한 초기 설정과 즉각적인 보상 부재로 인한 중도 이탈 문제를 해결하기 위해 기획된 **단기 몰입형 헬스케어 서비스**입니다.

- **온보딩 간소화**: 초간단 운동 선호도 설문(3문항)으로 진입 장벽 최소화[cite: 1, 2]
- **게이미피케이션**: 미션 수행을 통한 **FitPoint** 적립 및 2D Canvas 캐릭터 육성/파츠 장착[cite: 1, 2]
- **Rule-based 미션 추천**: 사용자 운동 경험, 목표, 선호 시간대 분석 기반 개인화 루틴 배정 (매일 KST 00:00)[cite: 1, 2]
- **Streak & 복구**: 연속 운동 달성 기록 관리 및 월 제한 기반 Streak 보호/복구 로직[cite: 1, 2]
- **정합성 & 동시성**: 트랜잭션 원장 관리, 조건부 UPDATE 및 유저 행 잠금(`FOR UPDATE`)을 통한 포인트/재고 중복 차감 방지[cite: 1]

---

## 2. 팀원 및 역할

| 이름 | 역할 | 담당 업무[cite: 1, 2] |
| :--- | :--- | :--- |
| **주성진** | **PM / QA / UI Front** | 프로젝트 총괄(PM), 통합 QA 검증, 프론트엔드 UI/UX 개발[cite: 2] |
| **차명실** | **Front Lead** | 프론트엔드 개발 리드, 2D Canvas 캐릭터 레이어링 및 메인 대시보드 구현[cite: 1, 2] |
| **정우진** | **Back Lead** | 백엔드 개발 리드, TRD 작성, DB 스키마 설계 및 트랜잭션/배치 로직 구현[cite: 1, 2] |
| **박상욱** | **BE Logic / API** | 백엔드 비즈니스 로직 구현, RESTful API 연동 및 결제/구독 모듈 개발[cite: 2] |

---

## 3. 주요 타깃 & 페르소나

* **Primary User**: 운동 초심자 및 실패 경험자[cite: 2]
* **Secondary User**: 바쁜 일상 속에서 습관 형성을 원하는 2030 세대[cite: 2]
* **대표 페르소나**:
  * **특성**: 캐릭터 육성 및 수집 등 게이미피케이션에 친숙하며, 즉각적인 시각적 보상을 선호함[cite: 2]
  * **Pain Point**: 기존 헬스 앱의 초기 설정이 너무 복잡하고 단조로운 데이터 위주라 지속적인 동기부여가 안 됨[cite: 2]
  * **Needs**: 진입 장벽이 낮고, 운동 완료 시 캐릭터 성장과 포인트 보상이 주어지는 직관적이고 재미있는 서비스[cite: 2]

---

## 4. 핵심 기능 (MVP)

| 기능 ID | 핵심 기능 | 상세 설명[cite: 1, 2] | 우선순위[cite: 1, 2] |
| :--- | :--- | :--- | :---: |
| **F-01 / FR-01** | **간단 온보딩** | 운동 경험, 목표, 선호 시간대 등 최소 문항 설문 작성 후 즉시 진입[cite: 1, 2] | **상**[cite: 1, 2] |
| **F-02 / FR-02** | **맞춤형 미션 추천** | Rule-based 엔진 기반으로 KST 00:00마다 일일 2~3개 맞춤 미션 자동 배정[cite: 1, 2] | **상**[cite: 1, 2] |
| **F-03 / FR-03** | **FitPoint 시스템** | 미션 완수 시 포인트 지급 (Basic 1.0x~1.2x / Premium 1.5x~2.0x 부스트)[cite: 1, 2] | **상**[cite: 1, 2] |
| **F-04 / FR-04** | **캐릭터 커스텀** | 2D Canvas 파츠 레이어링 상점, 포인트 소모를 통한 아이템 구매/장착 및 레벨업[cite: 1, 2] | **상**[cite: 1, 2] |
| **F-05 / FR-05** | **Streak & 이탈 방지** | 연속 운동 달성 기록 관리 및 놓친 어제 기록에 대한 월 제한 복구 기능[cite: 1, 2] | **중**[cite: 1, 2] |
| **F-06 / FR-06** | **구독 & 결제 API** | Freemium 모델 연동, Premium 구독 상태 관리 및 결제 실패 처리[cite: 1, 2] | **상 / 중**[cite: 1, 2] |
| **F-07 / FR-07** | **리워드 교환** | 적립 포인트를 이용한 리워드 응모 및 기프티콘 교환[cite: 1] | **중**[cite: 1] |

---

## 5. 시스템 아키텍처
### 아키텍처 주요 요소 설명
1. **클라이언트 (Frontend)**: 온보딩 설문 UI, 메인 대시보드, 2D Canvas 캐릭터, Streak 화면을 보여주며 REST/JSON 방식으로 서버와 통신합니다.[cite: 1]
2. **REST API 서버 (Backend)**: 인증, 온보딩, 미션 추천·완료, 포인트 적립/차감, 캐릭터 육성, Streak, 구독, 리워드 비즈니스 로직을 처리합니다.[cite: 1, 2]
3. **Database (RDBMS)**: Users를 중심으로 15개 테이블을 설계하고, 포인트는 원장(Point_transactions)에 기록하며 잔액은 합계로 계산합니다.[cite: 1]
4. **결제 모듈**: API 서버가 호출하며 모의 결제 또는 PG 테스트 모드로 구현됩니다.[cite: 1, 2]
5. **일일 배치 (Batch Scheduler)**: 매일 00:00 KST에 사용자별 맞춤 미션 2~3개를 DB에 중복 없이 안전하게 INSERT 배정합니다.[cite: 1]

---

## 6. 기술 스택 & 기술적 의사결정 (ADR)

### 기술 스택 목록
| 영역 | 역할 | 기술 스택 | 선정 이유[cite: 1, 2] |
| :--- | :--- | :--- | :--- |
| **프론트엔드** | 캐릭터 렌더링 & UI | React, HTML5 2D Canvas | 3D 라이브러리 대비 이미지 파츠 레이어링 합성만으로 가볍고 빠른 커스터마이징 연출 제공[cite: 1, 2] |
| **API** | 클라이언트-서버 통신 | RESTful, `/api/v1`, JSON | 화면별 API 분리 용이성 및 버전 관리 표준 준수[cite: 1] |
| **데이터 모델링** | ERD 설계 | DBDesigner Fork | 15개 전체 테이블 ERD 및 스키마 설계 표준화[cite: 1] |
| **인증 및 보안** | 비밀번호 저장 | `bcrypt` 단방향 해시 | 비밀번호 원문을 저장하지 않고 안전하게 관리 (자동 로그인 범위 제외)[cite: 1] |
| **데이터베이스** | 데이터 저장 및 트랜잭션 | PostgreSQL (Supabase) / MySQL (InnoDB) | 포인트 적립 및 경험치 갱신 정합성을 위한 외래 키 및 트랜잭션 지원 필수 (MyISAM 사용 불가)[cite: 1] |
| **백엔드** | 서버 비즈니스 로직 | Node.js | 비동기 I/O 기반의 빠른 요청 처리 및 RESTful API 서버 구축[cite: 1, 2] |
| **추천 알고리즘** | 미션 개인화 추천 | Rule-based Engine | 설문 답변(목표×3 + 난이도×2 + 시간대×1) 가중치 점수 기반 알고리즘[cite: 1, 2] |

### 주요 기술 의사결정 기록 (ADR)
- **ADR-01 [확정]**: 캐릭터는 3D 모션 대신 2D Canvas 파츠 이미지 레이어링 중첩 렌더링 방식을 사용합니다.[cite: 1]
- **ADR-02 [확정]**: API 스펙은 `/api/v1` Prefix 기반 RESTful JSON 규격을 따릅니다.[cite: 1]
- **ADR-03 [안]**: 포인트 잔액을 별도 컬럼에 저장하지 않고 `Point_transactions` 원장 거래 내역의 `SUM(amount)`로 실시간 계산하여 정합성을 유지합니다.[cite: 1]
- **ADR-04 [확정]**: 총 경험치(`total_earned_xp`)는 차감되지 않고 누적만 되어 포인트를 사용해도 캐릭터 레벨이 내려가지 않습니다.[cite: 1]
- **ADR-05 [확정]**: 일일 미션 배정 배치는 매일 00:00 KST에 실행되며 기존 기록 삭제 없이 신규 행을 INSERT합니다.[cite: 1]
- **ADR-06 [안]**: Streak 판정은 조회 및 미션 완료 시점에 실시간 계산하며, 배치가 값을 0으로 강제 초기화하지 않습니다.[cite: 1]
- **ADR-07 [확정]**: `Point_transactions.ref_id`는 데이터 무결성을 위해 FK 제약 조건이 없는 논리 참조로 관리합니다.[cite: 1]

---

## 7. 데이터베이스 설계 (15개 전체 테이블)

데이터베이스는 **Users** 테이블을 중심 원장으로 한 15개 테이블 구조로 설계되어 있습니다.[cite: 1]

### 15개 전체 테이블 목록
1. **Users** (회원 계정)
2. **Onboarding_profiles** (온보딩 설문 정보)
3. **Missions** (운동 미션 마스터)
4. **Tags** (미션 분류 태그)
5. **Mission_tags** (미션-태그 다대다 연결)
6. **User_missions** (회원별 일일 미션 배정 및 완료 기록)
7. **Point_transactions** (포인트 적립/사용 원장)
8. **Characters** (캐릭터 레벨 및 누적 경험치)
9. **Customization_items** (상점 커스터마이징 아이템)
10. **User_inventory** (회원 보유 아이템 및 장착 상태)
11. **Streaks** (연속 운동 달성 현황)
12. **Subscriptions** (구독 플랜 및 상태)
13. **Payment_logs** (결제 시도 및 결과 이력)
14. **Rewards** (리워드 상품 및 재고)
15. **Reward_redemptions** (리워드 응모/교환 신청 내역)

### 주요 테이블 상세 스키마

#### 1. Users (회원)
- `user_number` (INT UNSIGNED, PK, AI): 회원 고유 식별자[cite: 1]
- `user_id` (VARCHAR(255), UQ): 로그인 아이디[cite: 1]
- `password_hash` (VARCHAR(255)): 암호화된 비밀번호 해시[cite: 1]
- `email` (VARCHAR(255), UQ): 이메일 주소[cite: 1]
- `nickname` (VARCHAR(16)): 앱 표시 닉네임[cite: 1]
- `user_status` (ENUM: 'active', 'withdrawn'): 계정 상태[cite: 1]
- `created_at`, `updated_at` (DATETIME): 생성 및 수정 시각[cite: 1]

#### 2. Onboarding_profiles (온보딩 설문)
- `profile_id` (INT UNSIGNED, PK, AI): 설문 기록 번호[cite: 1]
- `Users_user_number` (INT UNSIGNED, FK, UQ): 회원 번호 (1인당 1건)[cite: 1]
- `exercise_experience` (ENUM: 'ongoing', 'experienced', 'none'): 운동 경험 (난이도 매칭)[cite: 1]
- `goal` (ENUM: 'diet', 'muscle', 'stamina'): 운동 목표 (가중치 ×3)[cite: 1]
- `preferred_time` (ENUM: 'morning', 'afternoon', 'evening', 'night'): 선호 시간대 (가중치 ×1)[cite: 1]
- `created_at` (DATETIME): 설문 제출 시각[cite: 1]

#### 3. Missions (미션)
- `Missions_id` (INT UNSIGNED, PK, AI): 미션 고유 번호[cite: 1]
- `title` (VARCHAR), `description` (TEXT): 미션 제목 및 상세 내용[cite: 1]
- `difficulty` (ENUM: 'beginner', 'intermediate', 'advanced'): 난이도 (가중치 ×2)[cite: 1]
- `base_point` (INT): 기본 지급 포인트[cite: 1]
- `is_active` (BOOLEAN): 추천 대상 활성화 여부[cite: 1]

#### 4. User_missions (회원 미션)
- `user_mission_id` (INT UNSIGNED, PK, AI): 배정 기록 번호 (완료 API 요청 식별자)[cite: 1]
- `Missions_id` (INT UNSIGNED, FK), `Users_user_number` (INT UNSIGNED, FK)[cite: 1]
- `mission_status` (ENUM: 'assigned', 'completed'): 미션 상태[cite: 1]
- `assigned_date` (DATE): KST 배정 날짜[cite: 1]
- `assigned_at` (DATETIME), `completed_at` (DATETIME, NULL 허용)[cite: 1]

#### 5. Point_transactions (포인트 거래 원장)
- `transaction_id` (INT UNSIGNED, PK, AI): 거래 번호[cite: 1]
- `Users_user_number` (INT UNSIGNED, FK): 회원 번호[cite: 1]
- `source` (ENUM: 'mission_complete', 'streak_repair', 'shop_purchase', 'reward_redeem'): 발생 원인[cite: 1]
- `ref_id` (INT, NULL 허용): 참조 기록 번호 (논리 참조)[cite: 1]
- `base_point` (INT), `multiplier` (DECIMAL(3,2)): 기본 포인트 및 적용 배율[cite: 1]
- `amount` (INT): 실제 증감 포인트 (+적립, -사용)[cite: 1]
- `created_at` (DATETIME): 거래 시각[cite: 1]

#### 6. Characters (캐릭터)
- `character_id` (INT UNSIGNED, PK, AI), `Users_user_number` (INT UNSIGNED, FK, UQ)[cite: 1]
- `level` (INT): 현재 캐릭터 레벨[cite: 1]
- `total_earned_xp` (INT): 지금까지 획득한 총 누적 경험치 (하락 불가)[cite: 1]

#### 7. Customization_items & User_inventory (상점 및 보유 아이템)
- `Customization_items`: `item_id` (PK), `item_name`, `category` (outfit, accessory, effect), `unlock_type` (free, premium), `price_point`, `grade` (common, rare, epic, legendary)[cite: 1]
- `User_inventory`: `Customization_items_item_id` (FK), `Users_user_number` (FK) [복합 PK], `is_equipped` (BOOLEAN), `acquired_at` (DATETIME)[cite: 1]

#### 8. Streaks, Subscriptions & Rewards (연속 운동, 구독, 리워드)
- `Streaks`: `streak_id` (PK), `Users_user_number` (FK, UQ), `current_streak` (INT), `last_completed_date` (DATE)[cite: 1]
- `Subscriptions`: `subscriptions_id` (PK), `Users_user_number` (FK, UQ), `plan` (basic, premium), `sub_status`, `expires_at`[cite: 1]
- `Rewards`: `reward_id` (PK), `reward_name`, `required_point`, `stock`, `is_premium_only`[cite: 1]
- `Reward_redemptions`: `redemption_id` (PK), `Users_user_number` (FK), `Rewards_reward_id` (FK), `redemption_type` (entry, exchange), `redemption_status`[cite: 1]

---

## 8. API 명세서 (17개 전체 API)

모든 API는 RESTful 표준에 따라 `/api/v1` Prefix를 사용하며, 요청 및 응답 규격은 JSON 형태를 준수합니다.[cite: 1]

| ID | 기능 | Method | Endpoint | 성공 응답 | 주요 예외 및 실패 응답[cite: 1] |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **API-01** | 회원가입 | `POST` | `/auth/signup` | `201 Created` (`user_number`) | `409 Conflict` (아이디/이메일 중복)[cite: 1] |
| **API-02** | 로그인 | `POST` | `/auth/login` | `200 OK` (인증 토큰/세션) | `401 Unauthorized`, `403 Forbidden` (탈퇴 계정)[cite: 1] |
| **API-03** | 온보딩 설문 제출 | `POST` | `/onboarding` | `201 Created` (설문 정보) | `409 Conflict` (이미 제출된 설문)[cite: 1] |
| **API-04** | 오늘의 미션 조회 | `GET` | `/missions/recommended` | `200 OK` (미션 목록) | 배정 미션 없을 시 즉시 신규 배정[cite: 1] |
| **API-05** | 미션 완료 처리 | `POST` | `/missions/{id}/complete` | `200 OK` (적립 포인트, 경험치, Streak) | `404 Not Found`, `409 Conflict` (이미 완료됨/오늘 미션 아님)[cite: 1] |
| **API-06** | 포인트 잔액 조회 | `GET` | `/points/balance` | `200 OK` (`balance`) | 원장 거래 내역 합계 산출[cite: 1] |
| **API-07** | 포인트 내역 조회 | `GET` | `/points/history` | `200 OK` (거래 내역 배열) | - |
| **API-08** | 캐릭터/아이템 조회 | `GET` | `/character` | `200 OK` (레벨, 누적 XP, 장착 파츠) | - |
| **API-09** | 아이템 구매/장착 | `POST` | `/character/customize` | `200 OK` (아이템 상태, balance) | `403 Forbidden` (Premium 전용), `409` (잔액 부족/중복 구매)[cite: 1] |
| **API-10** | Streak 현황 조회 | `GET` | `/streak` | `200 OK` (연속 일수, 남은 복구 횟수) | - |
| **API-11** | Streak 복구 | `POST` | `/streak/repair` | `200 OK` (갱신된 streak, 남은 횟수) | `409 Conflict` (이틀 이상 끊김/복구 횟수 초과/잔액 부족)[cite: 1] |
| **API-12** | Premium 구독 결제 | `POST` | `/subscription/subscribe` | `200 OK` (`plan`, `expires_at`) | `402 Payment Required` (결제 실패), `409` (이미 구독 중)[cite: 1] |
| **API-13** | 리워드 목록 조회 | `GET` | `/rewards` | `200 OK` (상품 및 재고 목록) | - |
| **API-14** | 리워드 응모/교환 | `POST` | `/rewards/{id}/redeem` | `200 OK` (`redemption_id`, 상태) | `403` (Premium 전용), `409` (재고 0/잔액 부족)[cite: 1] |
| **API-15** | 상점 전체 아이템 조회| `GET` | `/character/items` | `200 OK` (전체 아이템 목록) | 추가 제안 API[cite: 1] |
| **API-16** | 내 구독 상태 조회 | `GET` | `/subscription` | `200 OK` (구독 상태, 만료일) | 추가 제안 API[cite: 1] |
| **API-17** | 내 프로필 조회 | `GET` | `/users/me` | `200 OK` (사용자 프로필) | 추가 제안 API[cite: 1] |

---

## 9. 핵심 비즈니스 로직 & 처리 플로우

### 1) 미션 완료 흐름 (1-Transaction 원자적 처리)
---

## 10. 비기능 요구사항 & 동시성/정합성 제어

- **원자성 보장 (NFR-01)**: 미션 완료 시 포인트 적립, 경험치 갱신, Streak 업데이트, 상태 변경은 단일 DB 트랜잭션으로 처리되며 하나라도 실패 시 전체 롤백됩니다.[cite: 1]
- **중복 요청 방어 (NFR-02)**: 동일한 미션 완료 요청이 동시에 여러 번 들어올 경우 조건부 UPDATE(`WHERE mission_status = 'assigned'`)를 수행하여 오직 1회만 완수를 인정합니다.[cite: 1]
- **동시성 잠금 (NFR-03)**: 포인트 차감 시 유저 행 잠금(`SELECT ... FOR UPDATE`)을 통해 잔액 부족 차감을 방지하고, 리워드 재고 차감은 조건부 UPDATE(`WHERE stock >= 1`)로 음수 방지를 보장합니다.[cite: 1]
- **KST 시각 기준 (NFR-04)**: 날짜 판정, 월 단위 복구 횟수 초기화(매월 1일 00:00 KST), 일일 배치는 모두 한국 표준시(KST, UTC+9)를 기준으로 처리합니다.[cite: 1]
- **원장 데이터 보존 (NFR-05)**: `Point_transactions` 테이블은 수정/삭제가 없는 INSERT 전용 원장이며, 캐릭터 총 경험치(`total_earned_xp`)는 차감되지 않습니다.[cite: 1]
- **배치 재실행 안전성 (NFR-06)**: 일일 미션 배정 배치가 실패 후 재실행되어도 `(Users_user_number, Missions_id, assigned_date)` 유니크 제약 조건을 통해 중복 미션 배정이 차단됩니다.[cite: 1]

---

## 11. 보안 요구사항

- **SEC-01 (인증)**: 가입 및 로그인을 제외한 모든 API 요청은 인증 토큰/세션 검증이 필수입니다.[cite: 1]
- **SEC-02 (접근 제어)**: 모든 조회 및 변경 요청 시 서버에서 요청 유저의 소유 데이터인지 권한을 확인합니다 (`403 Forbidden`).[cite: 1]
- **SEC-03 (권한 검증)**: Premium 전용 아이템, 리워드 상품 및 배율 적용은 클라이언트 전달값을 믿지 않고 서버 DB의 `Subscriptions` 상태와 만료일로만 검증합니다.[cite: 1]
- **SEC-04 (비밀번호 안전성)**: 비밀번호 원문 및 로그 남기기를 금지하며, `bcrypt` 단방향 해시 알고리즘만 저장합니다.[cite: 1]
- **SEC-05 (결제 보안)**: 카드 번호 등 민감한 결제 정보는 DB에 저장하지 않으며, API 시크릿 키는 환경 변수(`ENV`)로 주입합니다.[cite: 1]

---

## 12. 핵심 지표, DoD & Risk List

### 핵심 성과 지표 (KPI)
- 가입 직후 초기 이탈률 (D+1 Churn Rate) **30% 이하**[cite: 2]
- 가입 후 30일 차 잔존율 (D+30 Retention) **25% 이상 유지**[cite: 2]
- 주간 일일 미션 달성률 **60% 이상**[cite: 2]
- 개인 맞춤형 미션 추천 수락률 **70% 이상 달성**[cite: 2]

### 완료 정의 (Definition of Done)
1. 해당 기능의 모든 FR/NFR 세부 요구사항 구현 완료[cite: 1]
2. 정상 및 예외 흐름(동시성 요청, 잔액 부족, 중복 완료 등) 테스트 케이스 통과[cite: 1]
3. Point_transactions 원장 내역 합계와 사용자 표시 잔액의 일치성 검증[cite: 1]
4. KST 00:00 날짜 경계 조건 판정 테스트 통과[cite: 1]
5. 코드 리뷰 및 통합 QA 확인 마침[cite: 1]

### Risk List & 대응 방안
1. **DB 엔진 트랜잭션 제약**: MyISAM 엔진은 외래 키와 트랜잭션을 지원하지 않으므로 PostgreSQL(Supabase) 또는 MySQL InnoDB 엔진 사용을 엄격히 강제합니다.[cite: 1]
2. **Streak 복구 충돌**: 일일 배치가 `current_streak`를 0으로 강제 수정할 경우 기존 복구 로직과 충돌하므로, Streak 연속성은 배치가 아닌 조회/완료 시점에 실시간 계산합니다.[cite: 1]
3. **아이템 파츠 매핑**: `Customization_items`에 이미지 경로 정보가 누락되지 않도록 `image_key` 컬럼을 선제적으로 구성합니다.[cite: 1]
