// --- Weapon Stat Tables (External Data) ---

export const WEAPON_DEFS = {
  // ----- Existing baseline weapons (B0 set) -----
  plasmabolt: {
    id: 'plasmabolt',
    name: '플라즈마 볼트',
    icon: '⚡',
    tags: [],
    baseCooldown: 0.9,
    levels: [
      { damage: 18, count: 1, pierce: 1, bulletRadius: 5, bulletSpeed: 420, cooldown: 0.9 },
      { damage: 18, count: 2, pierce: 1, bulletRadius: 5, bulletSpeed: 420, cooldown: 0.75 },
      { damage: 25, count: 2, pierce: 2, bulletRadius: 6.5, bulletSpeed: 420, cooldown: 0.75 },
      { damage: 25, count: 3, pierce: 2, bulletRadius: 6.5, bulletSpeed: 420, cooldown: 0.6 },
      { damage: 35, count: 4, pierce: 4, bulletRadius: 9, bulletSpeed: 500, cooldown: 0.6 }
    ]
  },

  orbitingshield: {
    id: 'orbitingshield',
    name: '오비탈 쉴드',
    icon: '🛡️',
    tags: [],
    baseCooldown: 0,
    levels: [
      { damage: 15, count: 1, orbitRadius: 65, orbitSpeed: 2.0, shieldRadius: 8 },
      { damage: 15, count: 2, orbitRadius: 65, orbitSpeed: 2.3, shieldRadius: 8 },
      { damage: 22, count: 2, orbitRadius: 65, orbitSpeed: 2.3, shieldRadius: 10 },
      { damage: 22, count: 3, orbitRadius: 78, orbitSpeed: 2.3, shieldRadius: 10 },
      { damage: 30, count: 5, orbitRadius: 78, orbitSpeed: 2.8, shieldRadius: 12 }
    ]
  },

  lightningstrike: {
    id: 'lightningstrike',
    name: '라이트닝 로드',
    icon: '🌪️',
    tags: [],
    baseCooldown: 2.4,
    levels: [
      { damage: 45, strikesCount: 1, blastRadius: 55, cooldown: 2.4 },
      { damage: 55, strikesCount: 2, blastRadius: 55, cooldown: 2.4 },
      { damage: 55, strikesCount: 2, blastRadius: 70, cooldown: 1.8 },
      { damage: 70, strikesCount: 3, blastRadius: 70, cooldown: 1.8 },
      { damage: 95, strikesCount: 5, blastRadius: 90, cooldown: 1.5 }
    ]
  },

  neonfiretrail: {
    id: 'neonfiretrail',
    name: '네온 화염 파편',
    icon: '🔥',
    tags: [],
    baseCooldown: 0.25,
    levels: [
      { damage: 10, sparkRadius: 6, lifeTime: 3.0, cooldown: 0.25 },
      { damage: 14, sparkRadius: 8, lifeTime: 3.0, cooldown: 0.25 },
      { damage: 14, sparkRadius: 8, lifeTime: 4.0, cooldown: 0.18 },
      { damage: 22, sparkRadius: 11, lifeTime: 4.0, cooldown: 0.18 },
      { damage: 32, sparkRadius: 14, lifeTime: 5.0, cooldown: 0.12 }
    ]
  },

  cyberdrone: {
    id: 'cyberdrone',
    name: '사이버 드론',
    icon: '🛸',
    tags: [],
    baseCooldown: 1.2,
    levels: [
      { damage: 20, laserCount: 1, laserRadius: 4, orbitRadius: 40, cooldown: 1.2 },
      { damage: 26, laserCount: 1, laserRadius: 4, orbitRadius: 40, cooldown: 0.9 },
      { damage: 26, laserCount: 2, laserRadius: 4, orbitRadius: 50, cooldown: 0.9 },
      { damage: 38, laserCount: 2, laserRadius: 5.5, orbitRadius: 50, cooldown: 0.9 },
      { damage: 50, laserCount: 3, laserRadius: 5.5, orbitRadius: 50, cooldown: 0.5 }
    ]
  },

  // ----- New Basic Weapons (Phase B) -----
  retrosynthwave: {
    id: 'retrosynthwave',
    name: '레트로 신스 웨이브',
    icon: '🎵',
    tags: [],
    baseCooldown: 2.4,
    levels: [
      { damage: 12, range: 100, pulseCount: 1, width: 3, slowDebuff: false, knockbackResistBreak: 0 },
      { damage: 18, range: 140, pulseCount: 1, width: 3, slowDebuff: false, knockbackResistBreak: 0 },
      { damage: 18, range: 140, pulseCount: 2, width: 3, slowDebuff: false, knockbackResistBreak: 0 },
      { damage: 25, range: 140, pulseCount: 2, width: 4.5, slowDebuff: true, knockbackResistBreak: 0 },
      { damage: 38, range: 190, pulseCount: 3, width: 4.5, slowDebuff: true, knockbackResistBreak: 0.3 }
    ]
  },

  quantumvoidrift: {
    id: 'quantumvoidrift',
    name: '양자 보이드 균열',
    icon: '🌀',
    tags: [],
    baseCooldown: 3.6,
    levels: [
      { damage: 6, count: 1, pullForce: 140, duration: 3.0, hasExplosion: false, blastRadius: 0 },
      { damage: 6, count: 2, pullForce: 140, duration: 3.0, hasExplosion: false, blastRadius: 0 },
      { damage: 6, count: 2, pullForce: 180, duration: 3.5, hasExplosion: false, blastRadius: 0 },
      { damage: 6, count: 2, pullForce: 180, duration: 3.5, hasExplosion: true, blastRadius: 120 },
      { damage: 10, count: 3, pullForce: 210, duration: 3.5, hasExplosion: true, blastRadius: 168 }
    ]
  },

  prismaticbeam: {
    id: 'prismaticbeam',
    name: '프리즘 굴절기',
    icon: '💎',
    tags: [],
    baseCooldown: 1.6,
    levels: [
      { damage: 22, refractions: 3, count: 1, refractionRange: 160, damageGrowthPerHop: 0 },
      { damage: 22, refractions: 5, count: 1, refractionRange: 190, damageGrowthPerHop: 0 },
      { damage: 22, refractions: 5, count: 2, refractionRange: 190, damageGrowthPerHop: 0 },
      { damage: 22, refractions: 5, count: 2, refractionRange: 190, damageGrowthPerHop: 0.10 },
      { damage: 32, refractions: 8, count: 3, refractionRange: 190, damageGrowthPerHop: 0.10 }
    ]
  },

  naniteinfector: {
    id: 'naniteinfector',
    name: '나노 바이러스 포자',
    icon: '🧬',
    tags: [],
    baseCooldown: 2.2,
    levels: [
      { damage: 4, count: 4, duration: 4.0, cooldown: 2.2, spreadOnDeath: false, armorShred: false },
      { damage: 4, count: 7, duration: 4.8, cooldown: 2.2, spreadOnDeath: false, armorShred: false },
      { damage: 7, count: 7, duration: 4.8, cooldown: 1.8, spreadOnDeath: false, armorShred: false },
      { damage: 7, count: 7, duration: 4.8, cooldown: 1.8, spreadOnDeath: true, armorShred: false },
      { damage: 11, count: 9, duration: 4.8, cooldown: 1.8, spreadOnDeath: true, armorShred: true }
    ]
  },

  // ----- Evolution weapons (Phase C) -----
  gigaparticle: {
    id: 'gigaparticle',
    name: '기가 입자 소멸포',
    icon: '☄️',
    tags: ['evolution'],
    baseCooldown: 1.6,
    levels: [{ damage: 110, beamWidth: 35, beamDuration: 0.6, cooldown: 1.6 }]
  },

  hypernovaegis: {
    id: 'hypernovaegis',
    name: '초신성 이지스 쉴드',
    icon: '🌟',
    tags: ['evolution'],
    baseCooldown: 0,
    levels: [{ damage: 48, count: 6, orbitRadius: 90, orbitSpeed: 3.5, shieldRadius: 15 }]
  },

  subwooferresonance: {
    id: 'subwooferresonance',
    name: '서브우퍼 오디오 스펙트럼',
    icon: '🔊',
    tags: ['evolution'],
    baseCooldown: 0,
    levels: [{ damage: 16, radius: 180, pulseInterval: 0.12, armorDrain: 0.1 }]
  },

  eventhorizonglitch: {
    id: 'eventhorizonglitch',
    name: '사건의 지평선 글리치',
    icon: '⚫',
    tags: ['evolution'],
    baseCooldown: 12.0,
    levels: [{ damage: 15, duration: 4.5, pullRange: 420, freezeOnEnd: 3.0, chainBlastRadius: 100 }]
  },

  prismcascade: {
    id: 'prismcascade',
    name: '초신성 레인보우 프리즘',
    icon: '🌈',
    tags: ['evolution'],
    baseCooldown: 0,
    levels: [{ damage: 38, beams: 4, spinSpeed: 0.55, beamWidth: 20, shardChance: 0.18 }]
  },

  cyberneticzombie: {
    id: 'cyberneticzombie',
    name: '가상 좀비 네트워크',
    icon: '🧟',
    tags: ['evolution'],
    baseCooldown: 0,
    levels: [{ damage: 30, zombieLifeTime: 5.0, selfDestructRadius: 90, selfDestructDamage: 75 }]
  }
};
