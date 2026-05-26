# [TASKS] 신규 무기 확장 및 에픽 보스 시스템 작업 분해서

`spec.md` 기반의 실행 단위 작업 목록. 본 작업군은 캐릭터/메타 프로그레션과 독립적으로 진행 가능하며, 무기 → 진화 → 보스 순으로 의존이 흐른다.

> 추정: **S = 0.5d**, **M = 1d**, **L = 2~3d**, **XL = 4d 이상**

---

## Phase A — 기반 정비

> 후속 Phase가 깔끔히 얹힐 수 있도록 공통 구조 선행.

| # | 작업 | 추정 | 의존 |
|---|------|------|------|
| A.1 | `data/` 디렉토리 도입 + 기존 무기/적 하드코딩 상수 추출 (`data/weapons.js`, `data/enemies.js`) | M | - |
| A.2 | `Weapon` 베이스 정리: `totalDamageDealt` 누적, `onLevelUp()` 표준화, `data` 기반 인스턴스화 | S | A.1 |
| A.3 | `Enemy` 공통: `team`, `armor`, `knockbackResist`, `frozenUntil`, `infected` 등 상태 필드 추가 | S | - |
| A.4 | `systems/Hazard.js` 신설: rect/circle 형 지원, `World.hazards` 컨테이너 | M | A.3 |
| A.5 | `DropItem.EvolutionCore` 정의 + 픽업 → 이벤트 emit 파이프라인 | S | - |
| A.6 | `Weapon.tags[]` 도입, 진화 무기에 `'evolution'` 태깅 규칙 마련 | S | A.2 |

---

## Phase B — 신규 기본 무기 4종

> 진화/보스와 독립 검증 가능해야 함. 각 무기는 단독 PR로 머지 가능.

| # | 작업 | 추정 | 의존 |
|---|------|------|------|
| B.1 | `retroSynthWave` 구현 (링 펄스 + 넉백 + 벽 충돌 추가 피해) | M | A.2, A.3 |
| B.2 | `retroSynthWave` Lv1~5 스탯 테이블 + 디버프(이동속도) 적용 | S | B.1 |
| B.3 | `quantumVoidRift` 구현 (최밀집 타겟팅 + 흡입 + DOT) | L | A.2 |
| B.4 | `quantumVoidRift` 소멸 시 압축 폭발 + Lv1~5 테이블 | M | B.3 |
| B.5 | `prismaticBeam` 구현 (관통 빔 + N회 굴절 알고리즘 + `hitSet`) | L | A.2 |
| B.6 | `prismaticBeam` Lv1~5 (굵기/굴절수/갈래/누적 데미지) | M | B.5 |
| B.7 | `naniteInfector` 구현 (부유 안개 + 감염 상태 부여) | M | A.2, A.3 |
| B.8 | `naniteInfector` Lv4 감염 전파 + Lv5 방어 감쇄 | M | B.7 |
| B.9 | 레벨업 카드 풀에 4종 등록, 아이콘 자원 추가 | S | B.1~B.7 |

**완료 기준**: 각 무기를 단독으로 받았을 때 다른 무기 없이도 동작·렌더·레벨업 정상.

---

## Phase C — 진화(Evolution) 시스템

| # | 작업 | 추정 | 의존 |
|---|------|------|------|
| C.1 | `data/evolutions.js` 룰북 테이블 + `Upgrade.checkEvolution(player)` | S | A.5, A.6 |
| C.2 | `EvolutionCore` 픽업 → 후보 평가 → 무기 인스턴스 교체 파이프라인 | M | C.1 |
| C.3 | 진화 발동 UI 연출 (화면 플래시 + 카드 노출 1.5s, 비차단) | S | C.2 |
| C.4 | `subwooferResonanceGrid` 구현 (상시 공명장 + armor 영구 감쇄 + 거리 기반 dps 배수) | L | C.2, B.2 |
| C.5 | `eventHorizonGlitch` 구현 (메가 블랙홀 + 체인 폭발 + 종료 시 3s Freeze) | L | C.2, B.4 |
| C.6 | `prismCascadeOverlord` 구현 (4-갈래 회전 빔 + 굴절 구체 10발 산란) | L | C.2, B.6 |
| C.7 | `cyberneticZombieOverlord` 구현 (감염 사망 적 아군화 + 5s 자폭 + 2차 감염) | L | C.2, B.8, A.3 |
| C.8 | 모든 진화 무기에 `tags: ['evolution']` 부여 + 단위 확인 | S | C.4~C.7 |

---

## Phase D — 에픽 보스 3종

> Phase B/C가 안정된 후 시작. C.8(태깅)이 끝나야 Boss 3 완전 검증 가능.

| # | 작업 | 추정 | 의존 |
|---|------|------|------|
| D.1 | `systems/Boss.js` `BossController` FSM + 패턴 등록 API + 페이즈 트리거 | M | A.3 |
| D.2 | 보스 스폰 스케줄러 (`BOSS_SCHEDULE`, gameTime 기준 1회 트리거) | S | D.1 |
| D.3 | Boss1 `glitchLeviathan` 외형/체력/접촉 데미지 | S | D.1 |
| D.4 | Boss1 패턴: `pixelBeam` (전방 빔 + Hazard 셀 배치) | M | D.3, A.4 |
| D.5 | Boss1 패턴: `frameDash` (질주 + 6개 잔상 폭발 예약) | M | D.3, A.4 |
| D.6 | Boss1 페이즈2: `codeLag` 디버프 5s 적용 | S | D.4, D.5 |
| D.7 | Boss2 `synthLordOctave` 외형/체력 | S | D.1 |
| D.8 | Boss2 패턴: `sonicRings` (동심원 연속, 갭 회피 가능) | M | D.7 |
| D.9 | Boss2 패턴: `audioColumn` (수직 기둥 + 2차 산탄) | M | D.7 |
| D.10 | Boss2 패턴: `synthCascade` (유도 큐브 8발 연사) | M | D.7 |
| D.11 | Boss3 `nullPointer` 외형/체력/와이어 셰이더 | M | D.1 |
| D.12 | Boss3 패턴: `vectorCage` (300×300 4면 Hazard) | M | D.11, A.4 |
| D.13 | Boss3 패턴: `binaryRain` (`1` HP 피해 / `0` XP 흡수) | M | D.11 |
| D.14 | Boss3 페이즈2: `nullification` (진화 무기만 데미지 통과) | M | D.11, C.8 |
| D.15 | 보스 처치 보상: `EvolutionCore × 1` 확정 드롭 | S | D.3, D.7, D.11, A.5 |
| D.16 | 보스 등장 컷인 (화면 어둡게 + 타이틀 텍스트) | S | D.2 |

---

## Phase E — 검증 / 마감

| # | 작업 | 추정 | 의존 |
|---|------|------|------|
| E.1 | spec §6 검증 매트릭스 시나리오 V1~V5 수동 체크 + 스크린샷 | M | C.*, D.* |
| E.2 | 성능 측정: 4-갈래 프리즘 + 적 80 와이어프레임 동시 렌더, Chrome Performance 리포트 | M | C.6, D.* |
| E.3 | 밸런싱 패스: 무기 쿨다운, 진화 임팩트, 보스 패턴 타이밍/난이도 | L | All |
| E.4 | 데이터 외부화 점검: 신규 수치가 모두 `data/`에 분리되었는지 audit | S | All |

---

## 크리티컬 패스

```
A.1/A.2/A.3 ─► B.* ─► C.1~C.3 ─► C.4~C.7 ─► C.8 ─┐
                                                     │
A.3/A.4 ─► D.1 ─► D.2 ─┬─► D.3~D.6 (Boss1)         │
                       ├─► D.7~D.10 (Boss2)         │
                       └─► D.11~D.14 (Boss3) ◄──────┘ (D.14는 C.8 필요)
                                                     │
                                                     ▼
                                            D.15/D.16 ─► E.*
```

* Boss1과 Boss2는 진화 시스템 없이도 검증 가능 → C와 병렬 진행 가능.
* Boss3의 `nullification` 패턴만 진화 무기 태깅(C.8)에 강한 의존.

---

## 작업 분담 가이드

| 영역 | 담당 추천 |
|------|----------|
| 무기 (B) + 진화 (C) | 동일 담당자 권장 (스탯 일관성) |
| 보스 (D) | 별도 담당자 가능, Phase A 완료 후 즉시 착수 |
| 검증/밸런싱 (E) | 막판 통합 담당 |

---

## Done 체크리스트

각 작업은 다음을 모두 만족해야 완료로 본다:

- [ ] 수동 시나리오 통과 (테스트 노트 PR 본문 첨부)
- [ ] `spec.md` 해당 섹션과 행동 일치
- [ ] 회귀 없음 (해당 영역의 기존 FPS/메모리 기준 유지)
- [ ] 수치는 모두 `data/`에 외부화
- [ ] 콘솔 에러/경고 0건
