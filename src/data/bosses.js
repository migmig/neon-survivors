// --- Boss Parameters (External Data) ---

export const BOSS_DEFS = {
  glitchLeviathan: {
    id: 'glitchLeviathan',
    name: '글리치 리바이어던',
    radius: 60,
    hp: 5000,
    contactDamage: 30,
    color: '#ff0099',
    rotationOrder: ['pixelBeam', 'frameDash'],
    durations: { pixelBeam: 3.0, frameDash: 2.0, codeLag: 0.4 },
    phaseTriggers: [
      { hpRatio: 0.5, action: 'codeLag' }
    ]
  },

  synthLordOctave: {
    id: 'synthLordOctave',
    name: '신스 로드 옥타브',
    radius: 55,
    hp: 7500,
    contactDamage: 26,
    color: '#cc66ff',
    rotationOrder: ['sonicRings', 'audioColumn', 'synthCascade'],
    durations: { sonicRings: 4.0, audioColumn: 3.5, synthCascade: 2.5 }
  },

  nullPointer: {
    id: 'nullPointer',
    name: '널 포인터',
    radius: 70,
    hp: 11000,
    contactDamage: 24,
    color: '#ff0055',
    rotationOrder: ['vectorCage', 'binaryRain'],
    durations: { vectorCage: 5.0, binaryRain: 6.0 },
    phaseTriggers: [
      { hpRatio: 0.3, action: 'nullification' }
    ]
  }
};

export const BOSS_SCHEDULE = [
  { time: 240, def: 'glitchLeviathan' },
  { time: 480, def: 'synthLordOctave' },
  { time: 720, def: 'nullPointer' }
];
