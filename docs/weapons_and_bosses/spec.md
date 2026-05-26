# [SPEC] 신규 무기 확장 및 에픽 보스 시스템 기술 명세서

본 문서는 `prd_weapons_and_bosses.md`의 요구사항을 구현 단위로 분해한 기술 명세이다. 신규 기본 무기 4종, 초월(진화) 무기 4종, 에픽 보스 3종에 한정한다.

---

## 0. 범위와 비범위

| 구분 | 항목 |
|------|------|
| 범위 | 신규 무기 8종(기본 4 + 진화 4), 보스 3종, 에볼루션 코어 픽업/합성, 위험 장판(Hazard) 공통 |
| 비범위 | 캐릭터 선택, 메타 프로그레션, CRT/색수차 같은 글로벌 비주얼 효과(타 PRD 영역) |
| 전제 | `Weapon` 베이스, `Enemy` 베이스, `Particle` 시스템, 픽업 가능한 드롭 아이템 파이프라인이 기존 코드에 존재한다 |

---

## 1. 모듈 영향 범위

```
src/
 ├── entities/
 │   ├── Enemy.js          # 보스 타입 분기, Hazard 발사 훅
 │   └── DropItem.js       # (신규 또는 확장) EvolutionCore 드롭 추가
 ├── systems/
 │   ├── Weapon.js         # 신규 무기 클래스 등록, totalDamageDealt 추적
 │   ├── Upgrade.js        # (신규) 진화 룰북 + checkEvolution
 │   ├── Boss.js           # (신규) FSM 패턴 컨트롤러
 │   └── Hazard.js         # (신규) 위험 장판 엔티티 매니저
 └── data/
     ├── weapons.js        # Lv1~5 스탯 테이블
     ├── evolutions.js     # 진화 룰북
     └── bosses.js         # 보스 패턴 파라미터
```

---

## 2. 신규 기본 무기 (4종)

### 2.1 공통 인터페이스

```js
class Weapon {
  id; level; cooldown; timer;
  totalDamageDealt = 0;
  update(dt, ctx) {}      // ctx: {player, enemies, projectiles, particles, hazards}
  onLevelUp() {}          // WEAPON_DEFS[id].levels[level] 적용
}
```

데미지 적용 시 항상 `this.totalDamageDealt += damage` 누적.

### 2.2 무기별 사양

#### 2.2.1 `retroSynthWave` (레트로 신스 웨이브)

- **공격형태**: 플레이어 중심 원형 음파 펄스 (확장하는 링)
- **렌더**: 보라색 네온 링, 두께 8px, 알파 1.0 → 0.0 fadeout
- **충돌**: 링 두께 ± 16px 밴드 안의 적에게 1회 피해 + 넉백
- **넉백 처리**: `enemy.velocity += awayDir × knockbackForce`. 벽 충돌 시 추가 충돌 피해 (`enemy.takeDamage(wallDmg)`)
- **레벨 스탯**:

| Lv | 변경 |
|----|------|
| 1 | 기본 펄스 1발, 주기 3.0s, 최대 반경 240px |
| 2 | 팽창속도 ×1.25, 최대 반경 ×1.25 |
| 3 | 펄스 2연발 (0.4s 간격) |
| 4 | 휩쓸린 적 이동속도 -40% / 3s 디버프 |
| 5 | 3연발 + 넉백 저항 30% 무시 (`enemy.knockbackResist *= 0.7`) |

#### 2.2.2 `quantumVoidRift` (양자 보이드 균열)

- **공격형태**: 최대 적 밀집 지점에 블랙홀 1~3개 소환
- **타겟팅**: 화면 적을 32×32 그리드 버킷팅 → 최밀집 셀 중심
- **흡입**: 매 프레임 `enemy.velocity += (riftPos - enemy.pos).norm() × pullForce × dt`
- **데미지**: 0.3s 간격 DOT
- **수명**: 3.0s, 소멸 시 압축 폭발(원형 AOE)
- **레벨 스탯**:

| Lv | 변경 |
|----|------|
| 1 | 균열 1개, 흡입력 300, DOT 0.3s 간격 |
| 2 | 균열 2개 동시 |
| 3 | 흡입력 ×1.30, DOT 간격 ×0.5 |
| 4 | 소멸 순간 압축 폭발(반경 120px) 발생 |
| 5 | 균열 3개, 폭발 반경 ×1.40 |

#### 2.2.3 `prismaticBeam` (프리즘 굴절기)

- **공격형태**: 가장 가까운 적 방향 관통 빔 → N회 굴절
- **굴절 알고리즘**: 충돌 시 reached 셋에 추가, 미타격 적 중 최근접 노드를 다음 타겟으로 선택. 최대 N회까지.
- **렌더**: 다색 그라디언트 선분 시퀀스, 0.1s 잔상
- **레벨 스탯**:

| Lv | 변경 |
|----|------|
| 1 | 굴절 3회 |
| 2 | 빔 굵기 ×1.5, 굴절 5회 |
| 3 | 양방향 2갈래 동시 |
| 4 | 굴절마다 데미지 ×1.10 누적 |
| 5 | 3갈래 + 굴절 8회 |

#### 2.2.4 `naniteInfector` (나노 바이러스 포자)

- **공격형태**: 플레이어 주변 부유 안개 입자, 적에게 닿으면 `infected` 상태 부여
- **infected 상태**: DOT + 이동속도 -20%, 지속 5s
- **레벨 스탯**:

| Lv | 변경 |
|----|------|
| 1 | 포자 4개, DOT 0.5s 간격 |
| 2 | 포자 7개, 지속 시간 ×1.20 |
| 3 | DOT 간격 ×0.5 |
| 4 | 감염 사망 시 주변 3마리 즉시 감염 전파 |
| 5 | 전파 횟수 무제한, 감염된 적 방어 -50% |

### 2.3 데이터 외부화

각 무기는 `data/weapons.js`에 다음 스키마로 등록:

```js
WEAPON_DEFS[id] = {
  id, name, icon,
  baseCooldown,
  levels: [
    { /* lv1 effective params */ },
    ...,
    { /* lv5 */ }
  ]
};
```

`Weapon.onLevelUp()`은 단순히 `Object.assign(this, levels[level - 1])` 패턴.

---

## 3. 진화(Evolution) 시스템

### 3.1 룰북 (`data/evolutions.js`)

```js
const EVOLUTION_RULES = [
  { base:'retroSynthWave',  passive:'powerMagnet',       evo:'subwooferResonanceGrid' },
  { base:'quantumVoidRift', passive:'boosterShoes',      evo:'eventHorizonGlitch' },
  { base:'prismaticBeam',   passive:'overchargeReactor', evo:'prismCascadeOverlord' },
  { base:'naniteInfector',  passive:'nanoArmor',         evo:'cyberneticZombieOverlord' },
];
```

> 패시브 ID는 기존 패시브 정의를 따른다. 미존재 시 본 작업 범위에서 placeholder 패시브를 등록한다.

### 3.2 합성 트리거

```
픽업: EvolutionCore
  for rule in EVOLUTION_RULES:
    if player.weapons[rule.base]?.level == 5
       and player.passives[rule.passive]?.level >= 1:
      replace base with new Evo(rule.evo)
      consume core
      emit('evolution', rule)
      break
```

- 후보가 다수일 경우 정의 순서대로 첫 매칭만 진화 (1코어 = 1진화).
- 발동 시 화면 플래시 + 진화 카드 연출 (1.5s, 비차단).

### 3.3 진화 무기 사양

#### 3.3.1 `subwooferResonanceGrid` (서브우퍼 오디오 스펙트럼)

- 플레이어 중심 반경 180px **상시 공명장**.
- 매 프레임 영역 내 적: 넉백 가속(중심 방향 반대) + `armor -= drainRate × dt` (영구 감쇄).
- 중심에 가까울수록 `dps_multiplier = 1 + (1 - dist/180) × 2` (최대 ×3).
- 렌더: 네온 핑크/시안 이퀄라이저 바 8개, 음악 BPM에 맞춰 진폭 갱신.

#### 3.3.2 `eventHorizonGlitch` (사건의 지평선 글리치)

- 12초 쿨다운으로 맵 최대 밀집 지점에 메가 블랙홀 소환.
- 강제 견인: 엘리트 이하 모든 적에 강한 구심 가속. 보스는 면역 (지정 플래그 `bossImmuneToPull`).
- 흡입 중 압사 (`dist < 16px`) → 체인 폭발 (인접 적에 데미지 전이).
- 종료 시 화면 글리치 효과 + 생존 적 3초 Freeze (`enemy.frozenUntil = now + 3.0`).

#### 3.3.3 `prismCascadeOverlord` (초신성 레인보우 프리즘)

- 플레이어 중심 4-갈래 메가 빔, 0.6 rad/s 시계 방향 회전.
- 빔이 벽 또는 적 외골격(`enemy.tagged('hardShell')`) 충돌 시: 굴절 구체 10발 생성 (랜덤 방향 ±30° 분산, 유도 약함 0.3).
- 빔 자체 DPS는 적당히 낮게(틱당), 굴절 구체에서 추가 피해.

#### 3.3.4 `cyberneticZombieOverlord` (가상 좀비 네트워크)

- `naniteInfector`의 감염 사망 적이 **죽지 않고** 아군 좀비로 부활.
- 좀비 상태: `team = 'ally'`, 가장 가까운 비-좀비 적에게 박치기, 박치기 시 데미지 + 자신 HP 감소.
- 5s 후 또는 HP 0 → 자폭. 자폭 AOE 내 적 모두 감염 부여(2차 전파).
- 좀비 식별: 머리 위 형광 그린 💀 마커 렌더.

---

## 4. 에픽 보스 시스템

### 4.1 공통 FSM (`systems/Boss.js`)

```js
class BossController {
  constructor(defId, boss) {
    this.def = BOSS_DEFS[defId];   // { patterns, durations, phaseTriggers }
    this.boss = boss;
    this.patternTimer = 0;
    this.currentPattern = null;
    this.phase = 1;
  }
  update(dt, player, world) {
    // 페이즈 전환 체크 (HP%)
    for (const trig of this.def.phaseTriggers ?? []) {
      if (!trig.fired && this.boss.hp / this.boss.maxHp <= trig.hpRatio) {
        trig.fired = true;
        trig.onEnter(this.boss, player, world);
      }
    }
    // 패턴 교체
    this.patternTimer -= dt;
    if (this.patternTimer <= 0) {
      this.currentPattern = this.def.pickNext(this);
      this.patternTimer = this.def.durations[this.currentPattern.id];
      this.currentPattern.init?.(this.boss, player, world);
    }
    this.currentPattern.tick(dt, this.boss, player, world);
  }
}
```

패턴은 `{ id, init?, tick }` 형태의 객체. `pickNext`는 라운드 로빈 또는 가중치 랜덤.

### 4.2 위험 장판 (`Hazard.js`)

```js
class Hazard {
  type; x; y; w; h;        // 또는 (cx, cy, r)
  shape: 'rect'|'circle';
  duration; remaining;
  dps;
  onPlayerEnter?(player);
  update(dt, player) {
    this.remaining -= dt;
    if (this.contains(player.pos)) player.hp -= this.dps * dt;
  }
}
```

소유: `World.hazards: Hazard[]`. 보스 패턴과 진화 무기 일부가 공통 사용.

### 4.3 보스 1 — `glitchLeviathan`

- **스폰**: `gameTime >= 240s` (4:00) 1회.
- **외형**: 거대한 지네/리바이어던, 노이즈 글리치 셰이더.
- **HP / 데미지 곡선**: 기본 5000, 접촉 30 (밸런싱 외부화).
- **패턴**:

| ID | 지속 | 동작 |
|----|-----|------|
| `pixelBeam` | 3.0s | 입에서 전방 큰 빔 → 빔이 지나간 셀에 `Hazard(rect, dps=8, duration=4.0)` 배치 |
| `frameDash` | 2.0s | 전방 초고속 질주, 경로상 6개 위치에 `Hazard(circle, delay=1.0, blastDmg=40)` 예약 |
| `codeLag` | 페이즈2 진입 시 1회 | 5초간 player 이동·발사 속도 ×0.70 (디버프) |

- **페이즈 트리거**: `hp <= 0.5 × maxHp` → `codeLag` 패턴을 다음 슬롯에 삽입.

### 4.4 보스 2 — `synthLordOctave`

- **스폰**: 480s (8:00).
- **외형**: 부유 거울면 스컬 + 궤도 신시사이저 건반.
- **패턴**:

| ID | 지속 | 동작 |
|----|-----|------|
| `sonicRings` | 4.0s | 중심에서 동심원 링 레이저 4발 연속 (간격 0.6s, 사이에 안전 갭) |
| `audioColumn` | 3.5s | 맵 상단 → 하단 수직 빔 기둥 N개 무작위 위치 낙하. 바닥 충돌 시 2차 산탄 ×6 사방 분산 |
| `synthCascade` | 2.5s | 플레이어 예측 위치 향해 유도 큐브 미사일 8발 연사 (회전각 45° 간격) |

라운드 로빈 순환.

### 4.5 보스 3 — `nullPointer`

- **스폰**: 720s (12:00).
- **외형**: 화면 전역 와이어 거미 + 가슴 적색 코어.
- **패턴**:

| ID | 지속 | 동작 |
|----|-----|------|
| `vectorCage` | 5.0s | 플레이어 위치 기준 300×300 셀로 둘러싼 `Hazard(rect, 두께 16px, dps=20)` 4면 생성 |
| `binaryRain` | 6.0s | 화면 상단에서 `1`/`0` 입자 강우. `1`: HP -2/hit, `0`: `player.xp -= 5` (HP 무변화) |
| `nullification` | 페이즈2 영속 | `boss.shielded = true`. 일반 무기 발사체 흡수/소멸. `weapon.tags.includes('evolution')`만 데미지 |

- **페이즈 트리거**: `hp <= 0.3 × maxHp` → `nullification` ON, 보스 본체 주위 보호막 셰이더.
- **무기 태깅**: 모든 진화 무기 정의에 `tags: ['evolution']` 추가 (룰북 동기화).

### 4.6 스폰 스케줄러

`main.js`의 게임 루프에 단일 스폰 큐를 둔다:

```js
const BOSS_SCHEDULE = [
  { time: 240, def: 'glitchLeviathan' },
  { time: 480, def: 'synthLordOctave' },
  { time: 720, def: 'nullPointer' },
];
```

각 항목은 1회성. 동시 다중 보스 처리는 본 범위 비대상.

### 4.7 보상

보스 처치 시 확정 드롭:
- `EvolutionCore × 1`
- NeonChip 20~40 (해당 메타 시스템이 후속 PRD 범위라면 hook만 emit)

---

## 5. 충돌·물리 공통

- 발사체-적: 원-원 충돌, 반지름 합 비교.
- 빔(선분)-적: 선분-원 거리 ≤ `enemy.r + beamHalfWidth`.
- 굴절 빔 타겟 후보: 같은 빔 인스턴스의 `hitSet`에 등록된 적은 다시 선택하지 않음.
- 모든 적은 `team` 필드 (`'enemy' | 'ally'`) 보유, 좀비화 시 ally.

---

## 6. 검증 매트릭스

| ID | 검증 항목 | 방법 |
|----|----------|------|
| V1 | 진화 합성 트리거 | `retroSynthWave Lv5` + `powerMagnet Lv1` 상태에서 `EvolutionCore` 픽업 → `player.weapons`에 `subwooferResonanceGrid` 인스턴스 존재, 원본 `retroSynthWave` 제거 |
| V2 | 보스 0/1 효과 | `nullPointer.binaryRain` 중 `0` 피격: `player.hp` 불변, `player.xp` 감소 / `1` 피격: HP 감소, XP 불변 |
| V3 | 블랙홀 흡입 적분 | `eventHorizonGlitch` 활성 시 60프레임 동안 모든 영향 적의 위치가 매 프레임 중심 방향으로 단조 수렴 |
| V4 | Nullification 방어 | 페이즈2에서 일반 무기 발사체가 보스 본체 hitbox 내부로 들어와도 `boss.hp` 감소 0, 진화 무기 발사체는 정상 데미지 |
| V5 | 성능 | 4-갈래 프리즘 + 적 80마리 와이어프레임 동시 렌더 시 평균 FPS ≥ 50, GC pause < 100ms |

수동 검증 결과는 PR 본문에 콘솔 로그/스크린샷 첨부.

---

## 7. 데이터 외부화 파일 요약

| 파일 | 책임 |
|------|------|
| `data/weapons.js` | 신규 4종 기본 무기 Lv1~5 스탯 테이블 |
| `data/evolutions.js` | 4개 진화 룰북, `tags:['evolution']` 부여 |
| `data/bosses.js` | 3종 보스의 HP/접촉 데미지/패턴 파라미터/스폰 시간 |
| `data/hazards.js` | 위험 장판 프리셋 (`pixelBeamTile`, `frameDashBlast`, `cageWall`) |
