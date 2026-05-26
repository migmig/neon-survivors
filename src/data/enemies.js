// --- Enemy Stat Tables (External Data) ---

export const ENEMY_DEFS = {
  standard: {
    radius: 13,
    speed: 80,
    speedScale: 0.08,
    hp: 14,
    damage: 6,
    color: '#ff0055',
    xpValue: 10,
    tier: 1,
    knockbackResist: 1.0
  },
  speedster: {
    radius: 11,
    speed: 125,
    speedScale: 0.12,
    hp: 9,
    damage: 4,
    color: '#ff6a00',
    xpValue: 15,
    tier: 1,
    knockbackResist: 1.0
  },
  tank: {
    radius: 22,
    speed: 42,
    speedScale: 0,
    hp: 45,
    damage: 12,
    color: '#aa00ff',
    xpValue: 35,
    tier: 2,
    knockbackResist: 0.4
  },
  shooter: {
    radius: 12,
    speed: 65,
    speedScale: 0.06,
    hp: 12,
    damage: 5,
    color: '#00ffcc',
    xpValue: 20,
    tier: 1,
    knockbackResist: 1.0,
    shootCooldown: 3.2,
    projectileSpeed: 220
  },
  kamikaze: {
    radius: 10,
    speed: 125,
    speedScale: 0.12,
    hp: 8,
    damage: 15,
    color: '#ffff00',
    xpValue: 15,
    tier: 1,
    knockbackResist: 1.0,
    detonateTimer: 1.4,
    detonateRadius: 45
  },
  sentinel: {
    radius: 26,
    speed: 50,
    speedScale: 0,
    hp: 120,
    damage: 14,
    color: '#00f0ff',
    xpValue: 80,
    tier: 2,
    knockbackResist: 0.25
  },
  boss: {
    radius: 35,
    speed: 55,
    speedScale: 0,
    hp: 250,
    damage: 20,
    color: '#ff003c',
    xpValue: 250,
    tier: 3,
    knockbackResist: 0.08
  }
};

// Reset baseline speeds for an Enemy instance (used by debuffs that wear off).
export function getBaseSpeed(type) {
  const def = ENEMY_DEFS[type];
  return def ? def.speed : ENEMY_DEFS.standard.speed;
}
