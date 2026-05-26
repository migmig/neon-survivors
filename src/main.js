// --- Main Game Loop & State Manager ---

import { Input } from './systems/Input.js';
import { Sound } from './systems/Sound.js';
import { ParticleSystem } from './systems/Particle.js';
import { Player } from './entities/Player.js';
import { Enemy, activeEnemyProjectiles } from './entities/Enemy.js';
import { Gem } from './entities/Gem.js';
import {
  activeProjectiles,
  PlasmaBolt,
  OrbitingShield,
  LightningStrike,
  NeonFireTrail,
  CyberDrone,
  GigaParticleAnnihilator,
  HypernovaAegis,
  RetroSynthWave,
  QuantumVoidRift,
  PrismaticBeam,
  NaniteInfector,
  SubwooferResonanceGrid,
  EventHorizonGlitch,
  PrismCascadeOverlord,
  CyberneticZombieOverlord
} from './systems/Weapon.js';
import { HazardManager, activeHazards } from './systems/Hazard.js';
import { BossController, activeBosses, spawnBoss, updateBosses } from './systems/Boss.js';
import { checkEvolution } from './systems/Upgrade.js';
import { BOSS_SCHEDULE, BOSS_DEFS } from './data/bosses.js';
import { SvgIcons } from './assets/icons.js';

// --- HTML DOM References ---
const startScreen = document.getElementById('start-screen');
const hud = document.getElementById('hud');
const upgradeScreen = document.getElementById('upgrade-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const pauseScreen = document.getElementById('pause-screen');

const btnStart = document.getElementById('btn-start');
const btnRestart = document.getElementById('btn-restart');
const btnResume = document.getElementById('btn-resume');
const btnQuit = document.getElementById('btn-quit');

const upgradeCardsContainer = document.getElementById('upgrade-cards-container');

// HUD stats
const hudTime = document.getElementById('hud-time');
const hudKills = document.getElementById('hud-kills');
const hudLevel = document.getElementById('hud-level');
const hudScore = document.getElementById('hud-score');
const hudHighScore = document.getElementById('hud-highscore');
const menuHighScore = document.getElementById('menu-highscore');

const xpFill = document.getElementById('xp-fill');
const xpCurrent = document.getElementById('xp-current');
const xpNeeded = document.getElementById('xp-needed');

const hpFill = document.getElementById('hp-fill');
const hpCurrent = document.getElementById('hp-current');
const hpMax = document.getElementById('hp-max');
const hudActiveItems = document.getElementById('hud-active-items');

// Game Over Summary Stats
const summaryTime = document.getElementById('summary-time');
const summaryKills = document.getElementById('summary-kills');
const summaryLevel = document.getElementById('summary-level');
const summaryScore = document.getElementById('summary-score');

// Options Selectors
const btnOptionsTrigger = document.getElementById('btn-options-trigger');
const btnOptionsBack = document.getElementById('btn-options-back');
const optionsScreen = document.getElementById('options-screen');
const sliderBgm = document.getElementById('slider-bgm');
const labelBgm = document.getElementById('label-bgm');
const sliderSfx = document.getElementById('slider-sfx');
const labelSfx = document.getElementById('label-sfx');
const checkCrt = document.getElementById('check-crt');
const crtScanlines = document.getElementById('crt-scanlines');

// Upgrades Shop Selectors
const btnShopTrigger = document.getElementById('btn-shop-trigger');
const btnShopBack = document.getElementById('btn-shop-back');
const shopScreen = document.getElementById('shop-screen');
const btnShopReset = document.getElementById('btn-shop-reset');
const shopChipsCount = document.getElementById('shop-chips-count');

// Character Selection Selectors
const charSelectScreen = document.getElementById('char-select-screen');
const btnCharBack = document.getElementById('btn-char-back');
const btnCharConfirm = document.getElementById('btn-char-confirm');
const charCards = document.querySelectorAll('.character-card');

// --- Canvas Configuration ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game map virtual size
const MAP_WIDTH = 2500;
const MAP_HEIGHT = 2500;

// ----------------------------------------------------
// SPACE BACKGROUND (stars + nebulae, parallaxed)
// ----------------------------------------------------
const STAR_COLORS = ['#ffffff', '#a3e7ff', '#ffd5f4', '#bcb8ff', '#fff6c2'];
function buildStarField(count, depth) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
      r: 0.4 + Math.random() * 1.6,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.5 + Math.random() * 2.5,
      depth
    });
  }
  return arr;
}
// Three parallax layers: far (slow) → mid → near (almost world-locked).
// Each value is <1 so stars drift slower than the boundary, but high enough
// that they visibly flow past the player instead of feeling glued to them.
const starsFar = buildStarField(500, 0.35);
const starsMid = buildStarField(320, 0.60);
const starsNear = buildStarField(160, 0.85);

// Nebula blobs are scattered across the whole arena so the player always
// has colored gas in view, not only near the spawn point.
const NEBULA_COLORS = [
  'rgba(170, 60, 255, 0.22)',
  'rgba(0, 180, 255, 0.18)',
  'rgba(255, 50, 170, 0.20)',
  'rgba(0, 255, 150, 0.15)',
  'rgba(255, 140, 0, 0.16)'
];
function buildNebulae(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * MAP_WIDTH,
      y: Math.random() * MAP_HEIGHT,
      r: 320 + Math.random() * 380,
      color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)]
    });
  }
  return arr;
}
const nebulae = buildNebulae(14);

// --- Global Variables ---
let currentGameState = 'MENU'; // MENU, PLAYING, LEVELING, GAMEOVER, PAUSED
let player = null;
let enemies = [];
let gems = [];
let selectedCharacterType = 'volt'; // 'volt', 'shield' (Guardian), 'glitch'

// Game statistics
let timeElapsed = 0;
let score = 0;
let killsCount = 0;
let highScore = parseInt(localStorage.getItem('neon_survivors_highscore') || '0');
let lastCheckedLevel = 1;

// Spawning and difficulty
let spawnTimer = 0;
let spawnInterval = 1.6; // Spawn every 1.6s initially
let difficultyMult = 1.0;
let bossSpawnedAt = 0;
const spawnedBossIds = new Set(); // Epic boss ids that have already spawned this run

// HP HUD state
let lastHpSeen = Infinity;
let hpFlashTimeout = null;

// Camera state
const camera = { x: 0, y: 0 };

// Screen Shake state
const shake = {
  intensity: 0,
  duration: 0,
  x: 0,
  y: 0
};

// --- Initial Canvas Scaling ---
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Pass Canvas reference to mouse inputs listener
Input.initCanvas(canvas);

// Load high scores into DOM
hudHighScore.textContent = highScore;
menuHighScore.textContent = highScore;

// --- Sound initialization check ---
function handleUserGesture() {
  Sound.init();
  Sound.resume();
}
window.addEventListener('click', handleUserGesture, { once: true });
window.addEventListener('keydown', handleUserGesture, { once: true });

// --- Screen Shake trigger helper ---
function triggerScreenShake(intensity, duration) {
  shake.intensity = intensity;
  shake.duration = duration;
}

// ----------------------------------------------------
// GAME OVER TRIGGER
// ----------------------------------------------------
function terminatePlayer() {
  currentGameState = 'GAMEOVER';
  
  // Save High Score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('neon_survivors_highscore', highScore.toString());
    hudHighScore.textContent = highScore;
    menuHighScore.textContent = highScore;
  }

  // Save Meta-progression currency earned
  const metaData = JSON.parse(localStorage.getItem('neon_survivors_meta_data') || '{}');
  const earnedChips = player.chips || 0;
  metaData.chips = (metaData.chips || 0) + earnedChips;
  localStorage.setItem('neon_survivors_meta_data', JSON.stringify(metaData));

  // Populate Summary Stats
  summaryTime.textContent = formatTime(timeElapsed);
  summaryKills.textContent = killsCount;
  summaryLevel.textContent = player.level;
  document.getElementById('summary-chips').textContent = earnedChips;
  summaryScore.textContent = score;

  // Render DPS breakdown percentage chart
  const summaryDpsList = document.getElementById('summary-dps-list');
  summaryDpsList.innerHTML = '';

  if (player.weaponDps) {
    const totalDmg = Object.values(player.weaponDps).reduce((a, b) => a + b, 0);

    const dpsData = Object.entries(player.weaponDps)
      .map(([id, dmg]) => {
        const upgradeInfo = UPGRADES_POOL.find(u => u.id === id);
        let name = upgradeInfo ? upgradeInfo.name : id;
        if (id === 'gigaparticle') name = '기가 입자 소멸포 [진화]';
        if (id === 'hypernovaegis') name = '초신성 이지스 쉴드 [진화]';
        if (id === 'subwooferresonance') name = '서브우퍼 오디오 스펙트럼 [진화]';
        if (id === 'eventhorizonglitch') name = '사건의 지평선 글리치 [진화]';
        if (id === 'prismcascade') name = '초신성 레인보우 프리즘 [진화]';
        if (id === 'cyberneticzombie') name = '가상 좀비 네트워크 [진화]';
        return { id, name, dmg };
      })
      .filter(w => w.dmg > 0)
      .sort((a, b) => b.dmg - a.dmg);

    if (dpsData.length === 0) {
      summaryDpsList.innerHTML = '<div style="color: hsl(var(--text-secondary)); text-align: center; width: 100%;">출력된 무기 피해 데이터가 없습니다.</div>';
    } else {
      dpsData.forEach((item) => {
        const pct = totalDmg > 0 ? Math.round((item.dmg / totalDmg) * 100) : 0;
        
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '0.2rem';
        
        const color = 
          item.id === 'plasmabolt' || item.id === 'gigaparticle' ? 'hsl(var(--neon-blue))' :
          item.id === 'orbitingshield' || item.id === 'hypernovaegis' || item.id === 'neonfiretrail' ? 'hsl(var(--neon-pink))' :
          'hsl(var(--neon-green))';

        row.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-weight: 500;">
            <span style="color: ${color};">${item.name}</span>
            <span>${item.dmg.toLocaleString()} DMG (${pct}%)</span>
          </div>
          <div style="background: rgba(255,255,255,0.06); height: 6px; border-radius: 3px; overflow: hidden; width: 100%;">
            <div style="background: ${color}; width: ${pct}%; height: 100%; border-radius: 3px; box-shadow: 0 0 8px ${color};"></div>
          </div>
        `;
        summaryDpsList.appendChild(row);
      });
    }
  }

  // Show screens
  hud.classList.add('hidden');
  gameoverScreen.classList.add('active');
  gameoverScreen.classList.remove('hidden');
}

// ----------------------------------------------------
// DYNAMIC UPGRADE SELECTION (Vampire Survivors Style)
// ----------------------------------------------------
const UPGRADES_POOL = [
  // Weapons
  {
    id: 'plasmabolt',
    name: '플라즈마 볼트',
    type: 'weapon',
    icon: '⚡',
    weaponClass: PlasmaBolt,
    desc: '가장 가까운 적에게 자동 유도 레이저 탄환을 사격합니다.'
  },
  {
    id: 'orbitingshield',
    name: '오비탈 쉴드',
    type: 'weapon',
    icon: '🛡️',
    weaponClass: OrbitingShield,
    desc: '플레이어 주변을 빠르게 공전하는 광역 회전 가드를 생성합니다.'
  },
  {
    id: 'lightningstrike',
    name: '라이트닝 로드',
    type: 'weapon',
    icon: '🌪️',
    weaponClass: LightningStrike,
    desc: '무작위 적 무리에 벼락을 내리쳐 파괴적인 전자기장 폭발을 일으킵니다.'
  },
  {
    id: 'neonfiretrail',
    name: '네온 화염 파편',
    type: 'weapon',
    icon: '🔥',
    weaponClass: NeonFireTrail,
    desc: '지나간 자리에 일정 시간 타오르는 네온 화염 파편을 떨어트립니다.'
  },
  {
    id: 'cyberdrone',
    name: '사이버 드론',
    type: 'weapon',
    icon: '🛸',
    weaponClass: CyberDrone,
    desc: '플레이어 주변을 선회하며 가까운 적을 조준 발사하는 서포트 비행체입니다.'
  },
  {
    id: 'retrosynthwave',
    name: '레트로 신스 웨이브',
    type: 'weapon',
    icon: '🎵',
    weaponClass: RetroSynthWave,
    desc: '플레이어 중심에서 확장되는 음파 펄스로 적을 강력하게 넉백시킵니다.'
  },
  {
    id: 'quantumvoidrift',
    name: '양자 보이드 균열',
    type: 'weapon',
    icon: '🌀',
    weaponClass: QuantumVoidRift,
    desc: '적 밀집 지점에 블랙홀 균열을 소환하여 흡입·DOT 피해를 가합니다.'
  },
  {
    id: 'prismaticbeam',
    name: '프리즘 굴절기',
    type: 'weapon',
    icon: '💎',
    weaponClass: PrismaticBeam,
    desc: '관통 후 인접 적에게 굴절되어 연쇄 타격하는 다색 분광 레이저를 쏩니다.'
  },
  {
    id: 'naniteinfector',
    name: '나노 바이러스 포자',
    type: 'weapon',
    icon: '🧬',
    weaponClass: NaniteInfector,
    desc: '주변에 부유하는 감염 포자 안개를 펼쳐 적을 감염시키고 지속 피해를 입힙니다.'
  },
  // Passives
  {
    id: 'speed',
    name: '부스터 신발',
    type: 'passive',
    icon: '🥾',
    desc: '이동 속도가 10% 증가하여 위기 극복 능력이 상승합니다.'
  },
  {
    id: 'magnet',
    name: '강력 자석',
    type: 'passive',
    icon: '🧲',
    desc: 'XP 구석 수집 범위가 20% 넓어집니다.'
  },
  {
    id: 'armor',
    name: '나노 아머',
    type: 'passive',
    icon: '🧱',
    desc: '가해지는 모든 타격을 경감하여 받는 피해를 1.5만큼 줄입니다.'
  },
  {
    id: 'damage',
    name: '오버차지 리액터',
    type: 'passive',
    icon: '💥',
    desc: '무기 공격 데미지가 12% 증폭됩니다.'
  }
];

function triggerLevelUpSelection() {
  currentGameState = 'LEVELING';
  
  // Display screen overlay
  hud.classList.add('hidden');
  upgradeScreen.classList.add('active');
  upgradeScreen.classList.remove('hidden');

  // Generate 3 random card options
  upgradeCardsContainer.innerHTML = '';
  
  // Shuffle list to get random cards
  const shuffled = [...UPGRADES_POOL].sort(() => 0.5 - Math.random());
  const selectedChoices = [];
  
  for (let i = 0; i < shuffled.length; i++) {
    const upgrade = shuffled[i];
    if (upgrade.type === 'weapon') {
      const activeWeapon = player.weapons.find(w => w.id === upgrade.id);
      if (activeWeapon && activeWeapon.level >= activeWeapon.maxLevel) {
        continue; // Exclude max level weapons
      }
    }
    selectedChoices.push(upgrade);
    if (selectedChoices.length === 3) break;
  }

  // Fallback in case we ran out of options
  if (selectedChoices.length === 0) {
    selectedChoices.push({
      id: 'damage',
      name: '오버차지 리액터',
      type: 'passive',
      icon: '💥',
      desc: '무기 공격 데미지가 12% 증폭됩니다.'
    });
  }

  selectedChoices.forEach((upgrade) => {
    // Determine level strings
    let levelString = 'NEW';
    let currentLvl = 0;
    
    if (upgrade.type === 'weapon') {
      const activeWeapon = player.weapons.find(w => w.id === upgrade.id);
      if (activeWeapon) {
        currentLvl = activeWeapon.level;
        levelString = `Lv.${currentLvl} → Lv.${currentLvl + 1}`;
      }
    } else {
      currentLvl = player.passives[upgrade.id];
      if (currentLvl > 0) {
        levelString = `Lv.${currentLvl} → Lv.${currentLvl + 1}`;
      }
    }

    const card = document.createElement('div');
    card.className = 'glass-panel upgrade-card';
    
    const iconContent = SvgIcons[upgrade.id] || upgrade.icon;
    
    card.innerHTML = `
      <div class="card-icon" style="color: ${
        upgrade.id === 'plasmabolt' || upgrade.id === 'speed' ? 'hsl(var(--neon-blue))' : 
        upgrade.id === 'orbitingshield' || upgrade.id === 'damage' ? 'hsl(var(--neon-pink))' : 
        'hsl(var(--neon-green))'
      }">${iconContent}</div>
      <h3 class="card-title">${upgrade.name}</h3>
      <p class="card-desc">${
        upgrade.type === 'weapon' && currentLvl > 0 
          ? getWeaponLevelUpDescription(upgrade.id, currentLvl + 1)
          : upgrade.desc
      }</p>
      <div class="card-level">${levelString}</div>
      <button class="btn btn-card">선택</button>
    `;

    card.addEventListener('click', () => {
      // Apply the upgrade
      player.applyUpgrade(upgrade);
      
      // Hide selection overlay and resume
      upgradeScreen.classList.remove('active');
      upgradeScreen.classList.add('hidden');
      hud.classList.remove('hidden');
      
      currentGameState = 'PLAYING';
      
      // Update UI elements
      updateHud();
    });

    upgradeCardsContainer.appendChild(card);
  });
}

// Visual descriptions helper for weapons leveling
function getWeaponLevelUpDescription(id, nextLvl) {
  if (id === 'plasmabolt') {
    if (nextLvl === 2) return '두 갈래 플라즈마 탄환을 동시 투사하며, 연사 주기가 크게 개선됩니다.';
    if (nextLvl === 3) return '레이저 지름이 팽창하고 파괴력이 증가하며, 적 2명을 연이어 관통합니다.';
    if (nextLvl === 4) return '부채꼴 형상으로 세 방향 다발 사격을 전개하여 넓은 범위를 커버합니다.';
    return '메가 퓨전 버스트: 관통 4명, 투사 구경 극대화, 폭발적 추진 속도로 전장을 평정합니다.';
  }
  if (id === 'orbitingshield') {
    if (nextLvl === 2) return '궤도 방어용 쉴드 구체가 2개로 증가하며, 회전 속도가 눈에 띄게 빨라집니다.';
    if (nextLvl === 3) return '쉴드 구체 크기와 마찰 데미지가 대폭 증강되어 든든한 보호벽이 됩니다.';
    if (nextLvl === 4) return '보호막 구체가 3개로 늘어나고, 회전 궤도 반경이 확장되어 더 먼 거리의 적을 타격합니다.';
    return '초신성 보호막: 구체가 5개로 늘어나 적들이 플레이어에게 아예 달라붙지 못하도록 차단합니다.';
  }
  if (id === 'lightningstrike') {
    if (nextLvl === 2) return '연이어 2회의 번개가 무작위 범위 내에 내리꽂히며 벼락 폭발 피해가 증가합니다.';
    if (nextLvl === 3) return '라이트닝 충전 쿨다운이 크게 단축되고 낙뢰 전자기장 범위가 넓어집니다.';
    if (nextLvl === 4) return '타격 횟수가 3회로 급상승하여 전격 화력이 절정에 달합니다.';
    return '마스터 낙뢰 태풍: 낙뢰 5회 연속 충돌로 화면 전역의 적을 완전히 마비시키고 분쇄합니다.';
  }
  if (id === 'neonfiretrail') {
    if (nextLvl === 2) return '네온 화염 파편의 직경 크기와 화상 피해량이 향상됩니다.';
    if (nextLvl === 3) return '파편 낙하 빈도가 대폭 가속되고 바닥 유지 시간이 연장됩니다.';
    if (nextLvl === 4) return '지옥의 네온 지름 크기가 극대화되며 화력이 크게 강화됩니다.';
    return '마스터 - 메가 하이퍼 네온 블레이즈: 화염 크기가 한계 팽창하고 파편 투척 속도가 극대화됩니다.';
  }
  if (id === 'cyberdrone') {
    if (nextLvl === 2) return '드론 타격 빔의 쿨다운이 극적으로 감소하고 레이저 화력이 증가합니다.';
    if (nextLvl === 3) return '한 번에 2발의 양 갈래 레이저 빔을 조준 사격합니다.';
    if (nextLvl === 4) return '레이저 관통 효과가 가산되고 광선 구경이 대폭 굵어집니다.';
    return '마스터 - 나노 드론 센티넬: 3연장 고주파 속사 광선을 분출하여 일점사에 최적화됩니다.';
  }
  if (id === 'retrosynthwave') {
    if (nextLvl === 2) return '음파 펄스 확장 속도와 최대 반경이 1.25배로 증가합니다.';
    if (nextLvl === 3) return '0.4s 간격으로 2연발 펄스를 분출하여 적을 연쇄 넉백합니다.';
    if (nextLvl === 4) return '휩쓸린 적에게 3초간 이동속도 -40% 디버프를 부여합니다.';
    return '마스터 - 3연발 펄스 + 넉백 저항 30% 무시: 적 방어를 분쇄합니다.';
  }
  if (id === 'quantumvoidrift') {
    if (nextLvl === 2) return '균열이 동시 2개 소환되어 광역 흡입 범위를 형성합니다.';
    if (nextLvl === 3) return '흡입력이 1.3배 강화되고 DOT 빈도가 2배로 빨라집니다.';
    if (nextLvl === 4) return '소멸 순간 반경 120px의 압축 폭발이 발생합니다.';
    return '마스터 - 균열 3개 + 폭발 반경 1.4배: 시공간 압축의 진수입니다.';
  }
  if (id === 'prismaticbeam') {
    if (nextLvl === 2) return '빔 굵기 1.5배, 굴절 횟수 5회로 확장됩니다.';
    if (nextLvl === 3) return '양방향 2갈래 빔이 동시에 굴절·확산합니다.';
    if (nextLvl === 4) return '굴절마다 데미지 +10%가 누적되어 후속 타격이 강력해집니다.';
    return '마스터 - 3갈래 + 굴절 8회: 모든 적을 분광 굴절로 소탕합니다.';
  }
  if (id === 'naniteinfector') {
    if (nextLvl === 2) return '포자 7개 + 안개 지속 시간 1.2배로 광역 감염을 형성합니다.';
    if (nextLvl === 3) return 'DOT 간격이 절반으로 줄어 감염 적의 분해가 빨라집니다.';
    if (nextLvl === 4) return '감염 사망 시 주변 3마리에게 즉시 감염이 전파됩니다.';
    return '마스터 - 감염 전파 무제한 + 감염된 적 방어 -50%: 역병 네트워크가 완성됩니다.';
  }
  return '';
}

// ----------------------------------------------------
// GAME STATE MANAGEMENT (Start, Restart, Quit)
// ----------------------------------------------------
function startNewGame(charType = 'volt') {
  currentGameState = 'PLAYING';
  
  // Sound system init
  Sound.resume();
  
  // Display transitions
  startScreen.classList.remove('active');
  charSelectScreen.classList.remove('active');
  charSelectScreen.classList.add('hidden');
  hud.classList.remove('hidden');

  // Stats reset
  timeElapsed = 0;
  score = 0;
  killsCount = 0;
  difficultyMult = 1.0;
  spawnInterval = 1.6;
  bossSpawnedAt = 0;
  lastCheckedLevel = 1;

  // Clear arrays
  enemies = [];
  gems = [];
  activeProjectiles.length = 0;
  activeEnemyProjectiles.length = 0;
  HazardManager.clear();
  activeBosses.length = 0;
  spawnedBossIds.clear();
  ParticleSystem.clear();

  // Instantiate Player
  player = new Player(MAP_WIDTH / 2, MAP_HEIGHT / 2, charType);
  lastHpSeen = player.maxHp;
  
  // Equip chosen starter weapon
  if (charType === 'volt') {
    player.weapons.push(new PlasmaBolt(player));
  } else if (charType === 'shield') {
    player.weapons.push(new OrbitingShield(player));
  } else if (charType === 'glitch') {
    player.weapons.push(new LightningStrike(player));
  } else {
    player.weapons.push(new PlasmaBolt(player));
  }

  updateHud();
}

function restartGame() {
  gameoverScreen.classList.remove('active');
  gameoverScreen.classList.add('hidden');
  startNewGame(selectedCharacterType);
}

function quitToMenu() {
  pauseScreen.classList.remove('active');
  pauseScreen.classList.add('hidden');
  gameoverScreen.classList.remove('active');
  gameoverScreen.classList.add('hidden');
  
  currentGameState = 'MENU';
  startScreen.classList.add('active');
  hud.classList.add('hidden');
}

// ----------------------------------------------------
// WEAPON EVOLUTION SYNTHESIS ENGINE (Phase C — data-driven)
// ----------------------------------------------------
const EVO_NAMES = {
  gigaparticle: '⚡ GIGA PARTICLE ⚡',
  hypernovaegis: '🛡️ HYPERNOVA AEGIS 🛡️',
  subwooferresonance: '🔊 SUBWOOFER GRID 🔊',
  eventhorizonglitch: '⚫ EVENT HORIZON ⚫',
  prismcascade: '🌈 PRISM CASCADE 🌈',
  cyberneticzombie: '🧟 ZOMBIE NETWORK 🧟'
};

function checkAndTriggerWeaponEvolution() {
  player.triggerEvolution = false; // Reset trigger flag
  const rule = checkEvolution(player);
  if (rule) {
    const label = EVO_NAMES[rule.evo] || rule.evo;
    ParticleSystem.spawnDamageText(player.x, player.y - 70, `${label} EVOLUTION!`, '#ff8c00');
    triggerScreenShake(25, 0.5);
    Sound.playHeavyImpact();
    return;
  }
  // No matching recipe — give a consolation XP boost.
  player.gainXp(120);
  ParticleSystem.spawnDamageText(player.x, player.y - 50, '+120 XP (Evo Core)', '#ff8c00');
}

// ----------------------------------------------------
// UI HUD RE-DRAWER
// ----------------------------------------------------
function updateHud() {
  if (!player) return;

  // Level & Time & Score
  hudLevel.textContent = player.level;
  hudKills.textContent = killsCount;
  hudScore.textContent = score;

  // XP Bar Progress
  const xpPct = Math.min(100, (player.xp / player.xpNeeded) * 100);
  xpFill.style.width = `${xpPct}%`;
  xpCurrent.textContent = player.xp;
  xpNeeded.textContent = player.xpNeeded;

  // HP Bar Progress (display rounded down so partial regen / lifesteal ticks
  // don't render distracting decimals in the HUD).
  const hpDisplay = Math.max(0, Math.floor(player.hp));
  const hpPct = Math.min(100, Math.max(0, (player.hp / player.maxHp) * 100));
  hpFill.style.width = `${hpPct}%`;
  hpCurrent.textContent = hpDisplay;
  hpMax.textContent = player.maxHp;

  // Trigger damage flash + low-hp critical pulse on the container.
  const hpContainer = hpFill.closest('.hp-bar-container');
  if (hpContainer) {
    if (player.hp < lastHpSeen) {
      hpContainer.classList.add('hp-damage-flash');
      clearTimeout(hpFlashTimeout);
      hpFlashTimeout = setTimeout(() => hpContainer.classList.remove('hp-damage-flash'), 220);
    }
    hpContainer.classList.toggle('hp-low', hpPct < 30);
  }
  lastHpSeen = player.hp;

  // Render acquired Active items (Weapons & Passives) visually in HUD
  hudActiveItems.innerHTML = '';

  // 1. Add active weapons
  player.weapons.forEach((weapon) => {
    const staticData = UPGRADES_POOL.find(u => u.id === weapon.id);
    if (staticData) {
      const slot = document.createElement('div');
      slot.className = 'active-item-slot';
      slot.title = `${weapon.name} (Lv.${weapon.level})`;
      const iconContent = SvgIcons[weapon.id] || staticData.icon;
      slot.innerHTML = `
        ${iconContent}
        <span class="item-level-badge">${weapon.level}</span>
      `;
      hudActiveItems.appendChild(slot);
    }
  });

  // 2. Add active passives
  Object.keys(player.passives).forEach((passiveId) => {
    const rank = player.passives[passiveId];
    if (rank > 0) {
      const staticData = UPGRADES_POOL.find(u => u.id === passiveId);
      if (staticData) {
        const slot = document.createElement('div');
        slot.className = 'active-item-slot';
        slot.title = `${staticData.name} (Lv.${rank})`;
        slot.style.borderColor = 'rgba(255, 235, 59, 0.25)';
        const iconContent = SvgIcons[passiveId] || staticData.icon;
        slot.innerHTML = `
          ${iconContent}
          <span class="item-level-badge" style="background: hsl(var(--neon-green));">${rank}</span>
        `;
        hudActiveItems.appendChild(slot);
      }
    }
  });
}

function formatTime(secs) {
  const mins = Math.floor(secs / 60);
  const remSecs = Math.floor(secs % 60);
  const minsStr = mins < 10 ? `0${mins}` : mins;
  const secsStr = remSecs < 10 ? `0${remSecs}` : remSecs;
  return `${minsStr}:${secsStr}`;
}

// ----------------------------------------------------
// ENEMY WAVE SPAWNER
// ----------------------------------------------------
function spawnEnemySwarm(dt) {
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    
    // Choose spawn count based on difficulty multiplier (increases spawn density)
    const spawnCount = Math.floor(2 + difficultyMult * 2);
    
    for (let i = 0; i < spawnCount; i++) {
      // Spawn at a random angle outside the camera viewport boundaries
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = Math.max(canvas.width, canvas.height) / 2 + 80;
      
      const spawnX = player.x + Math.cos(angle) * spawnDist;
      const spawnY = player.y + Math.sin(angle) * spawnDist;

      // Clamp spawns inside the virtual arena space
      const clampedX = Math.max(50, Math.min(MAP_WIDTH - 50, spawnX));
      const clampedY = Math.max(50, Math.min(MAP_HEIGHT - 50, spawnY));

      // Spawning timeline selector
      let type = 'standard';
      const roll = Math.random();

      if (timeElapsed > 120) { // After 2 minutes (Intense swarm)
        if (roll < 0.08) type = 'sentinel';
        else if (roll < 0.20) type = 'kamikaze';
        else if (roll < 0.35) type = 'shooter';
        else if (roll < 0.50) type = 'tank';
        else if (roll < 0.70) type = 'speedster';
      } else if (timeElapsed > 80) { // After 80 seconds
        if (roll < 0.05) type = 'sentinel';
        else if (roll < 0.18) type = 'kamikaze';
        else if (roll < 0.30) type = 'shooter';
        else if (roll < 0.45) type = 'speedster';
        else if (roll < 0.55) type = 'tank';
      } else if (timeElapsed > 40) { // After 40 seconds
        if (roll < 0.15) type = 'shooter';
        else if (roll < 0.30) type = 'speedster';
      } else { // First 40 seconds
        if (roll < 0.15) type = 'speedster';
      }

      enemies.push(new Enemy(clampedX, clampedY, type, difficultyMult));
    }
  }

  // Mega boss spawn (Every 2 minutes) — legacy 'boss' enemies
  const currentTwoMinBlocks = Math.floor(timeElapsed / 120);
  if (currentTwoMinBlocks > bossSpawnedAt) {
    bossSpawnedAt = currentTwoMinBlocks;

    // Spawn Boss!
    const angle = Math.random() * Math.PI * 2;
    const bossX = player.x + Math.cos(angle) * 350;
    const bossY = player.y + Math.sin(angle) * 350;

    enemies.push(new Enemy(bossX, bossY, 'boss', difficultyMult * 1.5));

    // Spawn damage floating alarm warning text
    ParticleSystem.spawnDamageText(player.x, player.y - 60, '⚠️ BOSS DETECTED! ⚠️', '#ff003c');
    triggerScreenShake(20, 0.4); // Major screen rumble!
    Sound.playHeavyImpact();
  }
}

// ----------------------------------------------------
// EPIC BOSS SCHEDULE (Phase D.2 / D.16)
// ----------------------------------------------------
function spawnScheduledBosses() {
  for (let i = 0; i < BOSS_SCHEDULE.length; i++) {
    const entry = BOSS_SCHEDULE[i];
    if (spawnedBossIds.has(entry.def)) continue;
    if (timeElapsed < entry.time) continue;

    spawnedBossIds.add(entry.def);

    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 480;
    const bx = player.x + Math.cos(angle) * spawnDist;
    const by = player.y + Math.sin(angle) * spawnDist;

    const boss = spawnBoss(entry.def, bx, by, Enemy, difficultyMult * 1.5);
    if (!boss) continue;
    enemies.push(boss);

    // D.16 cinematic cut-in
    const def = BOSS_DEFS[entry.def];
    showBossCutin(def.name);
    Sound.playHeavyImpact();
    triggerScreenShake(25, 0.5);
  }
}

let bossCutin = { name: '', timer: 0 };
function showBossCutin(name) {
  bossCutin.name = name;
  bossCutin.timer = 2.0;
}

// ----------------------------------------------------
// GAME COLLISION MANAGER
// ----------------------------------------------------
function handleCollisions() {
  if (currentGameState !== 'PLAYING') return;

  // 1. Projectiles vs Enemies
  for (let i = 0; i < activeProjectiles.length; i++) {
    const proj = activeProjectiles[i];
    if (proj.expired) continue;

    for (let j = 0; j < enemies.length; j++) {
      const enemy = enemies[j];
      if (enemy.hp <= 0) continue;
      // [Phase D.14] nullification: shielded boss absorbs non-evolution projectiles.
      if (enemy.nullified && !proj.isEvolution) {
        const distN = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
        if (distN < enemy.radius + proj.radius) {
          ParticleSystem.spawnExplosion(proj.x, proj.y, '#666666', 4);
          proj.expired = true;
          break;
        }
        continue;
      }

      // Prevent double hitting with same projectile
      if (proj.hitEnemies.has(j)) continue;

      const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
      if (dist < enemy.radius + proj.radius) {
        // Apply damage to enemy
        enemy.takeDamage(proj.damage, proj.isEvolution);
        player.trackDamage(proj.weaponId, proj.damage);

        // Push knockback force based on projectile direction
        const angle = Math.atan2(enemy.y - proj.y, enemy.x - proj.x);
        enemy.knockback(angle, 75);

        // Spawn standard white spark particles
        ParticleSystem.spawnExplosion(proj.x, proj.y, '#ffffff', 3);

        // Register hit on projectile
        proj.onHit(j);

        if (proj.expired) break;
      }
    }
  }

  // Remove expired projectiles
  let activeProjIdx = 0;
  for (let i = 0; i < activeProjectiles.length; i++) {
    if (!activeProjectiles[i].expired) {
      activeProjectiles[activeProjIdx] = activeProjectiles[i];
      activeProjIdx++;
    }
  }
  activeProjectiles.length = activeProjIdx;

  // 2. Centralized Enemy Defeat Processing (Triggers for projectiles, shield tick damage, fire trails, drones, etc.)
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (enemy.hp <= 0 && !enemy.isDefeated) {
      enemy.isDefeated = true; // Mark as processed to prevent duplicate scoring
      score += enemy.xpValue * 5;
      killsCount++;
      
      // Determine pickup drop type
      let dropType = 'gem';
      const rollDrop = Math.random();
      if (enemy.isEpicBoss) {
        // [Phase D.15] Epic bosses always drop an EvolutionCore.
        dropType = 'evocore';
      } else if (enemy.type === 'sentinel') {
        // Luck affects elite drop rate; defaults to 0.40 for evocore.
        const evoChance = 0.40 * (player.luckMult || 1);
        if (rollDrop < evoChance) {
          dropType = 'evocore';
        } else {
          dropType = 'chip';
        }
      } else {
        const chipChance = 0.15 * (player.chipDropMult || 1);
        if (rollDrop < chipChance) {
          dropType = 'chip';
        }
      }

      // Spawn drop
      gems.push(new Gem(enemy.x, enemy.y, enemy.xpValue, enemy.tier, dropType));
      if (enemy.isEpicBoss) {
        // Bonus chips (D.15: 20~40 range hook for meta system).
        const chipCount = 20 + Math.floor(Math.random() * 21);
        for (let c = 0; c < chipCount; c++) {
          const offA = Math.random() * Math.PI * 2;
          const offR = 20 + Math.random() * 40;
          gems.push(new Gem(enemy.x + Math.cos(offA) * offR, enemy.y + Math.sin(offA) * offR, 0, 2, 'chip'));
        }
      }
      
      // Satisfying glowing particle burst
      ParticleSystem.spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 35 : enemy.type === 'sentinel' ? 24 : 12);

      // Add a floating XP point indicator
      const textLabel = dropType === 'chip' ? '+DATA CHIP' : dropType === 'evocore' ? '🌟 EVO CORE!' : `+${enemy.xpValue} XP`;
      const textColor = dropType === 'chip' ? '#ffd700' : dropType === 'evocore' ? '#ff8c00' : '#00f0ff';
      ParticleSystem.spawnDamageText(enemy.x, enemy.y - 12, textLabel, textColor);
      
      // Glitch element explosion passive
      if (player.characterType === 'glitch' && Math.random() < 0.12) {
        const blastX = enemy.x;
        const blastY = enemy.y;
        const blastRadius = 90;
        const baseDamage = 45;
        const finalDamage = Math.round(baseDamage * 2.5 * player.damageMult);

        Sound.playHeavyImpact();
        ParticleSystem.spawnExplosion(blastX, blastY, '#00ff66', 22);

        // Expanding shockwave particle
        ParticleSystem.particles.push({
          x: blastX,
          y: blastY,
          size: blastRadius,
          originalSize: blastRadius,
          color: '#00ff66',
          alpha: 1.0,
          decay: 3.0,
          update: function(dt) {
            this.alpha -= this.decay * dt;
            this.size = this.originalSize * (1 + (1 - this.alpha) * 0.2);
            return this.alpha > 0;
          },
          draw: function(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.shadowBlur = 18;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });

        // Damage nearby enemies
        enemies.forEach((otherEnemy) => {
          if (otherEnemy.hp <= 0) return;
          const otherDist = Math.hypot(otherEnemy.x - blastX, otherEnemy.y - blastY);
          if (otherDist < otherEnemy.radius + blastRadius) {
            otherEnemy.takeDamage(finalDamage);
            player.trackDamage('lightningstrike', finalDamage); // Attribute Glitch passive burst damage to lightning rod

            const knockAngle = Math.atan2(otherEnemy.y - blastY, otherEnemy.x - blastX);
            otherEnemy.knockback(knockAngle, 180);
          }
        });
      }

      // Screen shake on heavy kills
      if (enemy.type === 'tank') triggerScreenShake(5, 0.1);
      if (enemy.type === 'sentinel') triggerScreenShake(8, 0.15);
      if (enemy.type === 'boss') {
        triggerScreenShake(15, 0.3);
        player.heal(30);
      }
    }
  }

  // Filter out dead enemies in place
  let activeEnemyIdx = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].hp > 0) {
      enemies[activeEnemyIdx] = enemies[i];
      activeEnemyIdx++;
    }
  }
  enemies.length = activeEnemyIdx;

  // Filter out collected XP gems in place
  let activeGemsIdx = 0;
  for (let i = 0; i < gems.length; i++) {
    if (!gems[i].collected) {
      gems[activeGemsIdx] = gems[i];
      activeGemsIdx++;
    }
  }
  gems.length = activeGemsIdx;
}

// ----------------------------------------------------
// CANVAS RENDERING SYSTEM
// ----------------------------------------------------
function drawSpaceLayer(stars, parallax, cx, cy, time) {
  // Each star lives in world coords. Screen position with parallax:
  //   screen = (world - cam) * parallax + screenCenter
  // Then we wrap into the canvas to give a sense of infinite starfield.
  const cw = canvas.width;
  const ch = canvas.height;
  const halfW = cw / 2;
  const halfH = ch / 2;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    let sx = (s.x - cx) * parallax + halfW;
    let sy = (s.y - cy) * parallax + halfH;
    sx = ((sx % cw) + cw) % cw;
    sy = ((sy % ch) + ch) % ch;
    const tw = 0.55 + 0.45 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
    ctx.globalAlpha = tw;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r * (0.8 + parallax * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

// Renders the deep-space backdrop. NOTE: this temporarily resets the canvas
// transform so all drawing happens in screen coordinates, regardless of camera.
function drawGroundGrid(cx, cy) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const left = cx - canvas.width / 2;
  const top = cy - canvas.height / 2;

  // 1. Uniform deep-space color across the screen (no vignette so the whole view feels like space).
  ctx.fillStyle = '#070213';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Nebula clouds (fixed in world space) — drawn additively for a soft glow.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < nebulae.length; i++) {
    const n = nebulae[i];
    const nx = n.x - left;
    const ny = n.y - top;
    if (nx + n.r < 0 || nx - n.r > canvas.width || ny + n.r < 0 || ny - n.r > canvas.height) continue;
    const nGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
    nGrad.addColorStop(0, n.color);
    nGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Three parallax star layers (far / mid / near).
  const time = Date.now() * 0.001;
  drawSpaceLayer(starsFar, 0.35, cx, cy, time);
  drawSpaceLayer(starsMid, 0.60, cx, cy, time);
  drawSpaceLayer(starsNear, 0.85, cx, cy, time);

  // 4. Very faint cyan grid (every 250px) for spatial reference.
  const gridSize = 250;
  const startGX = Math.floor(left / gridSize) * gridSize;
  const startGY = Math.floor(top / gridSize) * gridSize;
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = startGX; x < startGX + canvas.width + gridSize; x += gridSize) {
    if (x < 0 || x > MAP_WIDTH) continue;
    ctx.beginPath();
    ctx.moveTo(x - left, 0);
    ctx.lineTo(x - left, canvas.height);
    ctx.stroke();
  }
  for (let y = startGY; y < startGY + canvas.height + gridSize; y += gridSize) {
    if (y < 0 || y > MAP_HEIGHT) continue;
    ctx.beginPath();
    ctx.moveTo(0, y - top);
    ctx.lineTo(canvas.width, y - top);
    ctx.stroke();
  }

  // 5. Pitch-black void outside the playable arena.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.96)';
  if (left < 0) ctx.fillRect(0, 0, -left, canvas.height);
  if (top < 0) ctx.fillRect(0, 0, canvas.width, -top);
  if (left + canvas.width > MAP_WIDTH) {
    const sx = MAP_WIDTH - left;
    ctx.fillRect(sx, 0, canvas.width - sx, canvas.height);
  }
  if (top + canvas.height > MAP_HEIGHT) {
    const sy = MAP_HEIGHT - top;
    ctx.fillRect(0, sy, canvas.width, canvas.height - sy);
  }

  // 6. Premium double-neon arena boundary (world rect (0,0)-(MAP_WIDTH, MAP_HEIGHT)
  //    → screen rect (-left, -top)-(MAP_WIDTH-left, MAP_HEIGHT-top)).
  ctx.strokeStyle = '#ff00aa';
  ctx.shadowColor = '#ff0055';
  ctx.shadowBlur = 24;
  ctx.lineWidth = 6;
  ctx.strokeRect(-left, -top, MAP_WIDTH, MAP_HEIGHT);

  ctx.strokeStyle = '#00f0ff';
  ctx.shadowColor = '#0072ff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.strokeRect(-left + 5, -top + 5, MAP_WIDTH - 10, MAP_HEIGHT - 10);

  ctx.restore();
}

// ----------------------------------------------------
// CORE PHYSICS UPDATE & RENDER LOOP
// ----------------------------------------------------
let lastTime = 0;

function gameLoop(time) {
  let dt = (time - lastTime) / 1000;
  lastTime = time;

  if (dt > 0.1) dt = 0.1;

  if (currentGameState === 'PLAYING') {
    // 1. Time Elapsed & Spawning Scaling
    timeElapsed += dt;
    difficultyMult = 1.0 + (timeElapsed / 60) * 0.08; // +8% stats scaling per minute (down from +18% for smoother play)
    spawnInterval = Math.max(0.65, 1.6 - (timeElapsed / 150) * 0.30); // Spawns faster over time (min 0.65s instead of 0.45s)

    // Spawning ticks
    spawnEnemySwarm(dt);

    // 2. Update Input and Player entity
    player.update(dt, Input, MAP_WIDTH, MAP_HEIGHT, enemies);
    
    // Check if player died this frame
    if (player.isDead) {
      terminatePlayer();
    }

    // 3. Update active XP Gems
    for (let i = 0; i < gems.length; i++) {
      gems[i].update(dt, player);
    }
    
    // If player leveled up, trigger card selections popup
    if (player.level > lastCheckedLevel) {
      lastCheckedLevel++;
      triggerLevelUpSelection();
    }

    // Check weapon evolution synthesis trigger
    if (player.triggerEvolution) {
      checkAndTriggerWeaponEvolution();
    }

    // 4. Update enemies AI chases
    for (let i = 0; i < enemies.length; i++) {
      enemies[i].update(dt, player);
    }

    // 4b. Update epic boss FSMs + hazards + epic boss schedule
    spawnScheduledBosses();
    updateBosses(dt, player, enemies);
    HazardManager.update(dt, player, enemies);

    // 5. Update weapon projectiles
    for (let i = 0; i < activeProjectiles.length; i++) {
      activeProjectiles[i].update(dt);
    }

    // 6. Update active enemy projectiles
    for (let i = 0; i < activeEnemyProjectiles.length; i++) {
      activeEnemyProjectiles[i].update(dt, player);
    }

    // Clean expired enemy projectiles in place
    let activeEnemyProjIdx = 0;
    for (let i = 0; i < activeEnemyProjectiles.length; i++) {
      if (!activeEnemyProjectiles[i].expired) {
        activeEnemyProjectiles[activeEnemyProjIdx] = activeEnemyProjectiles[i];
        activeEnemyProjIdx++;
      }
    }
    activeEnemyProjectiles.length = activeEnemyProjIdx;

    // 7. Handle physics damage collisions
    handleCollisions();

    // 8. Update glowing particles
    ParticleSystem.update(dt);

    // 9. Screen shake update
    if (shake.duration > 0) {
      shake.duration -= dt;
      shake.x = (Math.random() - 0.5) * shake.intensity;
      shake.y = (Math.random() - 0.5) * shake.intensity;
      
      if (shake.duration <= 0) {
        shake.x = 0;
        shake.y = 0;
        shake.intensity = 0;
      }
    }

    // 10. Camera positioning smooth follow player
    camera.x = player.x;
    camera.y = player.y;

    // Tick HUD display variables
    updateHud();
    hudTime.textContent = formatTime(timeElapsed);
  }

  // --- RENDERING CYCLES ---
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentGameState === 'PLAYING' || currentGameState === 'LEVELING' || currentGameState === 'PAUSED') {
    ctx.save();
    
    // Apply camera viewport transforms and screen shake offset translation
    const camLeft = camera.x - canvas.width / 2;
    const camTop = camera.y - canvas.height / 2;
    ctx.translate(-camLeft + shake.x, -camTop + shake.y);

    // Ground Grid Line Floor
    drawGroundGrid(camera.x, camera.y);

    // Render active hazards (boss patterns / evolution AoE)
    HazardManager.draw(ctx);

    // Render XP gems
    for (let i = 0; i < gems.length; i++) {
      gems[i].draw(ctx);
    }

    // Render active Projectile shots
    for (let i = 0; i < activeProjectiles.length; i++) {
      activeProjectiles[i].draw(ctx);
    }

    // Render active enemy projectiles
    for (let i = 0; i < activeEnemyProjectiles.length; i++) {
      activeEnemyProjectiles[i].draw(ctx);
    }

    // Render active Weapons overlays (like orbiting shield blades)
    for (let i = 0; i < player.weapons.length; i++) {
      if (player.weapons[i].draw) {
        player.weapons[i].draw(ctx);
      }
    }

    // Render Chase Enemies
    for (let i = 0; i < enemies.length; i++) {
      enemies[i].draw(ctx);
    }

    // Render Player Construct
    player.draw(ctx);

    // Render active floating glow particles & text indicators
    ParticleSystem.draw(ctx);

    ctx.restore();

    // Boss cut-in (screen overlay, drawn in screen-space)
    if (bossCutin.timer > 0) {
      bossCutin.timer -= 0.016;
      const alpha = Math.min(1.0, bossCutin.timer);
      ctx.save();
      ctx.fillStyle = `rgba(5, 0, 12, ${0.55 * alpha})`;
      ctx.fillRect(0, canvas.height * 0.35, canvas.width, canvas.height * 0.18);
      ctx.shadowBlur = 24;
      ctx.shadowColor = '#ff0099';
      ctx.fillStyle = `rgba(255, 0, 170, ${alpha})`;
      ctx.font = '900 56px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`◤ ${bossCutin.name} ◢`, canvas.width / 2, canvas.height * 0.44);
      ctx.restore();
    }
  }

  // Loop request
  requestAnimationFrame(gameLoop);
}

// ----------------------------------------------------
// BINDINGS & SCREEN INITIALIZATIONS
// ----------------------------------------------------

// 1. Initial High Scores Loading
hudHighScore.textContent = highScore;
menuHighScore.textContent = highScore;

// 2. Character Select Grid Click & Confirmation bindings
charCards.forEach((card) => {
  card.addEventListener('click', () => {
    charCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedCharacterType = card.getAttribute('data-char') || 'volt';
    Sound.playClick();
  });
});

btnCharBack.addEventListener('click', () => {
  charSelectScreen.classList.remove('active');
  charSelectScreen.classList.add('hidden');
  startScreen.classList.add('active');
  Sound.playClick();
});

btnCharConfirm.addEventListener('click', () => {
  startNewGame(selectedCharacterType);
});

btnStart.addEventListener('click', () => {
  startScreen.classList.remove('active');
  charSelectScreen.classList.remove('hidden');
  charSelectScreen.classList.add('active');
  Sound.playClick();
});

// 3. Permanent Upgrades Shop Bindings
// All meta upgrades are defined in one table so the catalog is easy to extend.
export const SHOP_DEFS = [
  { id: 'damage',     title: '코어 출력 강화',      icon: '💥', color: 'neon-blue',   baseCost: 15, maxLvl: 5, desc: '기본 무기 데미지가 영구적으로 +4%/lv 증폭됩니다.' },
  { id: 'hp',         title: '보강 외골격 프레임',  icon: '❤️', color: 'neon-pink',   baseCost: 10, maxLvl: 5, desc: '최대 체력이 영구적으로 +10/lv 가산됩니다.' },
  { id: 'magnet',     title: '초전도 마그넷 엔진',  icon: '🧲', color: 'neon-green',  baseCost: 10, maxLvl: 5, desc: '아이템 자력 반경 +15%/lv.' },
  { id: 'speed',      title: '신경 가속 임플란트',  icon: '🥾', color: 'neon-yellow', baseCost: 15, maxLvl: 5, desc: '이동 속도 +5%/lv.' },
  { id: 'armor',      title: '나노 아머 플레이트',  icon: '🛡️', color: 'neon-blue',   baseCost: 18, maxLvl: 5, desc: '받는 피해 -1/lv (장갑 가산).' },
  { id: 'regen',      title: '바이오 셀 리제너레이터', icon: '🩹', color: 'neon-green', baseCost: 20, maxLvl: 5, desc: '초당 HP 자동 회복 +0.2/s/lv.' },
  { id: 'xpGain',     title: '시냅스 부스터',       icon: '🧠', color: 'neon-yellow', baseCost: 18, maxLvl: 5, desc: '획득 XP +6%/lv.' },
  { id: 'chipGain',   title: '데이터 마이너 모듈',  icon: '💾', color: 'neon-yellow', baseCost: 14, maxLvl: 5, desc: '칩 드롭 확률 +5%/lv.' },
  { id: 'luck',       title: '확률 조작 코드',      icon: '🍀', color: 'neon-green',  baseCost: 22, maxLvl: 5, desc: '희귀 드롭 확률 +4%/lv.' },
  { id: 'critChance', title: '정밀 조준 회로',      icon: '🎯', color: 'neon-blue',   baseCost: 20, maxLvl: 5, desc: '치명타 확률 +3%/lv.' },
  { id: 'critDamage', title: '오버드라이브 매트릭스', icon: '💢', color: 'neon-pink', baseCost: 22, maxLvl: 5, desc: '치명타 피해 +25%/lv (기본 ×1.5).' },
  { id: 'cooldown',   title: '쿨링 시스템',          icon: '❄️', color: 'neon-blue',   baseCost: 18, maxLvl: 5, desc: '무기 쿨다운 -3%/lv.' },
  { id: 'dodge',      title: '판타지 페이즈 드라이브', icon: '👻', color: 'neon-green', baseCost: 24, maxLvl: 5, desc: '회피 확률 +1.5%/lv.' },
  { id: 'lifesteal',  title: '뱀파이어 프로토콜',    icon: '🩸', color: 'neon-pink',   baseCost: 28, maxLvl: 5, desc: '준 피해의 0.5%/lv 만큼 흡혈.' },
  { id: 'reflect',    title: '리액티브 아머',        icon: '🪞', color: 'neon-blue',   baseCost: 22, maxLvl: 5, desc: '받은 피해의 2%/lv를 주변 적에게 반사.' },
  { id: 'revive',     title: '백업 코어',            icon: '♻️', color: 'neon-yellow', baseCost: 50, maxLvl: 3, desc: '치명상 시 HP 50%로 1회 부활 (3lv까지).' },
  { id: 'startShield', title: '런-스타트 실드',     icon: '✨', color: 'neon-blue',   baseCost: 24, maxLvl: 5, desc: '게임 시작 시 +1.0s/lv 동안 무적.' },
  { id: 'projSpeed',  title: '발사체 가속기',        icon: '💨', color: 'neon-yellow', baseCost: 14, maxLvl: 5, desc: '발사체 속도 +5%/lv.' },
  { id: 'projSize',   title: '구경 확장 키트',       icon: '⚙️', color: 'neon-blue',   baseCost: 16, maxLvl: 5, desc: '발사체 크기 +4%/lv.' },
  { id: 'pierce',     title: '관통 코어',            icon: '🏹', color: 'neon-pink',   baseCost: 30, maxLvl: 3, desc: '관통 +1/lv (최대 3).' },
  { id: 'area',       title: '광역 증폭기',          icon: '🌊', color: 'neon-green',  baseCost: 18, maxLvl: 5, desc: '광역 무기 범위 +5%/lv.' },
  { id: 'duration',   title: '지속 효과 안정기',     icon: '⏱️', color: 'neon-yellow', baseCost: 16, maxLvl: 5, desc: '지속 효과 시간 +6%/lv.' },
  { id: 'multishot',  title: '듀얼 게이트웨이',      icon: '➕', color: 'neon-pink',   baseCost: 32, maxLvl: 5, desc: '발사 시 +1발 추가 확률 +3%/lv.' },
  { id: 'bossDmg',    title: '대형 표적 분석기',     icon: '👑', color: 'neon-pink',   baseCost: 26, maxLvl: 5, desc: '보스 대상 추가 피해 +5%/lv.' }
];

function readMetaData() {
  const md = JSON.parse(localStorage.getItem('neon_survivors_meta_data') || '{}');
  if (md.chips === undefined) md.chips = 0;
  for (const def of SHOP_DEFS) {
    if (md[def.id] === undefined) md[def.id] = 0;
  }
  return md;
}

function writeMetaData(md) {
  localStorage.setItem('neon_survivors_meta_data', JSON.stringify(md));
}

function renderShopCards() {
  const grid = document.querySelector('#shop-screen .shop-grid');
  if (!grid) return;
  if (grid.dataset.rendered === '1') return;
  grid.innerHTML = '';
  const cardStyle = 'padding: 1.2rem; text-align: left; display: flex; flex-direction: column;';
  const infoStyle = 'display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 0.8rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.6rem;';
  const titleStyle = "font-family: 'Orbitron', sans-serif; font-size: 0.95rem; margin-bottom: 0.4rem;";
  const descStyle = 'font-size: 0.75rem; color: hsl(var(--text-secondary)); line-height: 1.4; margin-bottom: 0.8rem; flex-grow: 1;';
  for (const def of SHOP_DEFS) {
    const card = document.createElement('div');
    card.className = 'shop-item glass-panel';
    card.id = `upgrade-${def.id}`;
    card.dataset.shopId = def.id;
    card.style.cssText = cardStyle;
    card.innerHTML = `
      <h4 class="shop-item-title ${def.color}" style="${titleStyle}">${def.icon} ${def.title}</h4>
      <p class="shop-item-desc" style="${descStyle}">${def.desc} (최대 ${def.maxLvl}레벨)</p>
      <div class="shop-item-info" style="${infoStyle}">
        <span>레벨: <span class="upgrade-level ${def.color}">0/${def.maxLvl}</span></span>
        <span>비용: <span class="upgrade-cost neon-yellow">${def.baseCost}</span> 💾</span>
      </div>
      <button class="btn btn-card btn-upgrade-buy" style="margin-bottom: 0; width: 100%; padding: 0.45rem 0.5rem; font-size: 0.85rem;">강화하기</button>
    `;
    grid.appendChild(card);
  }
  grid.dataset.rendered = '1';
}

function updateShopUI() {
  renderShopCards();
  const metaData = readMetaData();
  shopChipsCount.textContent = metaData.chips;

  for (const def of SHOP_DEFS) {
    const container = document.getElementById(`upgrade-${def.id}`);
    if (!container) continue;
    const currentLvl = metaData[def.id] || 0;
    const levelEl = container.querySelector('.upgrade-level');
    const costEl = container.querySelector('.upgrade-cost');
    const btn = container.querySelector('.btn-upgrade-buy');

    levelEl.textContent = `${currentLvl}/${def.maxLvl}`;

    if (currentLvl >= def.maxLvl) {
      costEl.textContent = 'MAX';
      btn.textContent = '강화 완료';
      btn.disabled = true;
      btn.style.opacity = 0.5;
      btn.style.cursor = 'not-allowed';
    } else {
      const nextCost = def.baseCost * (currentLvl + 1);
      costEl.textContent = nextCost;
      btn.textContent = '강화하기';
      btn.disabled = false;
      btn.style.opacity = 1;
      btn.style.cursor = 'pointer';

      if (metaData.chips < nextCost) {
        btn.style.borderColor = 'rgba(255,255,255,0.08)';
        btn.style.background = 'rgba(255,255,255,0.02)';
        btn.style.color = '#777777';
      } else {
        btn.style.borderColor = '';
        btn.style.background = '';
        btn.style.color = '';
      }
    }
  }
}

// Event delegation: single listener handles all dynamically rendered buy buttons.
const shopGridEl = document.querySelector('#shop-screen .shop-grid');
if (shopGridEl) {
  shopGridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-upgrade-buy');
    if (!btn || btn.disabled) return;
    const card = btn.closest('.shop-item');
    if (!card) return;
    const id = card.dataset.shopId;
    const def = SHOP_DEFS.find(d => d.id === id);
    if (!def) return;

    const metaData = readMetaData();
    const currentLvl = metaData[def.id] || 0;
    const cost = def.baseCost * (currentLvl + 1);

    if (currentLvl < def.maxLvl && metaData.chips >= cost) {
      metaData.chips -= cost;
      metaData[def.id] = currentLvl + 1;
      writeMetaData(metaData);
      updateShopUI();
      Sound.playUpgrade();
    } else {
      Sound.playHeavyImpact();
    }
  });
}

btnShopReset.addEventListener('click', () => {
  const metaData = readMetaData();
  let refunded = 0;
  for (const def of SHOP_DEFS) {
    const lvl = metaData[def.id] || 0;
    for (let i = 0; i < lvl; i++) refunded += def.baseCost * (i + 1);
    metaData[def.id] = 0;
  }
  metaData.chips = (metaData.chips || 0) + refunded;
  writeMetaData(metaData);
  updateShopUI();
  Sound.playHeavyImpact();
});

btnShopTrigger.addEventListener('click', () => {
  startScreen.classList.remove('active');
  shopScreen.classList.remove('hidden');
  shopScreen.classList.add('active');
  updateShopUI();
  Sound.playClick();
});

btnShopBack.addEventListener('click', () => {
  shopScreen.classList.remove('active');
  shopScreen.classList.add('hidden');
  startScreen.classList.add('active');
  Sound.playClick();
});

// 4. System Settings (BGM/SFX Volume & CRT Scanlines) Bindings
sliderBgm.value = Sound.bgmVolume * 100;
labelBgm.textContent = `${Math.round(Sound.bgmVolume * 100)}%`;
sliderSfx.value = Sound.sfxVolume * 100;
labelSfx.textContent = `${Math.round(Sound.sfxVolume * 100)}%`;

const crtPref = localStorage.getItem('neon_survivors_crt_preference');
if (crtPref === 'false') {
  checkCrt.checked = false;
  crtScanlines.classList.add('hidden');
} else {
  checkCrt.checked = true;
  crtScanlines.classList.remove('hidden');
}

btnOptionsTrigger.addEventListener('click', () => {
  startScreen.classList.remove('active');
  optionsScreen.classList.remove('hidden');
  optionsScreen.classList.add('active');
  Sound.playClick();
});

sliderBgm.addEventListener('input', () => {
  const val = sliderBgm.value;
  labelBgm.textContent = `${val}%`;
  Sound.setBgmVolume(val / 100);
});

sliderSfx.addEventListener('input', () => {
  const val = sliderSfx.value;
  labelSfx.textContent = `${val}%`;
  Sound.setSfxVolume(val / 100);
});

checkCrt.addEventListener('change', () => {
  if (checkCrt.checked) {
    crtScanlines.classList.remove('hidden');
  } else {
    crtScanlines.classList.add('hidden');
  }
  localStorage.setItem('neon_survivors_crt_preference', checkCrt.checked ? 'true' : 'false');
});

btnOptionsBack.addEventListener('click', () => {
  optionsScreen.classList.remove('active');
  optionsScreen.classList.add('hidden');
  startScreen.classList.add('active');
  Sound.playClick();
});

// 5. In-run standard buttons
btnRestart.addEventListener('click', restartGame);

btnResume.addEventListener('click', () => {
  pauseScreen.classList.remove('active');
  pauseScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  currentGameState = 'PLAYING';
});

btnQuit.addEventListener('click', quitToMenu);

// Pause Listener (ESC key)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'p') {
    if (currentGameState === 'PLAYING') {
      currentGameState = 'PAUSED';
      hud.classList.add('hidden');
      pauseScreen.classList.remove('hidden');
      pauseScreen.classList.add('active');
      Sound.playClick();
    } else if (currentGameState === 'PAUSED') {
      pauseScreen.classList.remove('active');
      pauseScreen.classList.add('hidden');
      hud.classList.remove('hidden');
      currentGameState = 'PLAYING';
      Sound.playClick();
    }
  }
});

// --- Start Frame Ticks ---
requestAnimationFrame(gameLoop);
