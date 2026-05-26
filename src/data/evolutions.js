// --- Evolution Rulebook ---
//
// passive 키는 player.passives[]에 저장된 ID. 예) 'damage' = overchargeReactor.
// 후보가 다수일 때는 정의 순서대로 첫 매칭만 진화한다 (1코어 = 1진화).

export const EVOLUTION_RULES = [
  // Existing legacy evolutions (preserved)
  { base: 'plasmabolt',      passive: 'damage',  evo: 'gigaparticle' },
  { base: 'orbitingshield',  passive: 'armor',   evo: 'hypernovaegis' },

  // New evolutions from spec
  { base: 'retrosynthwave',  passive: 'magnet',  evo: 'subwooferresonance' },
  { base: 'quantumvoidrift', passive: 'speed',   evo: 'eventhorizonglitch' },
  { base: 'prismaticbeam',   passive: 'damage',  evo: 'prismcascade' },
  { base: 'naniteinfector',  passive: 'armor',   evo: 'cyberneticzombie' }
];

// Passives need at least this level to qualify (default: 1).
export const EVOLUTION_PASSIVE_THRESHOLD = 1;

// Base weapon must reach this level to qualify (default: 5 = maxLevel).
export const EVOLUTION_BASE_LEVEL_REQUIRED = 5;
