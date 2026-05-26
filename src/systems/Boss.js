// --- Epic Boss FSM (Glitch Leviathan / Synth Lord Octave / Null Pointer) ---

import { Sound } from './Sound.js';
import { ParticleSystem } from './Particle.js';
import { HazardManager } from './Hazard.js';
import { activeEnemyProjectiles, EnemyProjectile } from '../entities/Enemy.js';
import { BOSS_DEFS } from '../data/bosses.js';

export const activeBosses = [];

// ----------------------------------------------------------------------------
// Pattern Library — keyed by pattern id
// ----------------------------------------------------------------------------
const PATTERNS = {
  // Boss 1: glitchLeviathan
  pixelBeam: {
    init(boss, player) {
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      boss._beamAngle = Math.atan2(dy, dx);
      boss._beamStep = 0;
    },
    tick(dt, boss, player) {
      // Drop hazard tiles along the beam path every 0.2s
      boss._beamStep += dt;
      if (boss._beamStep >= 0.2) {
        boss._beamStep -= 0.2;
        const reach = 80 + Math.random() * 600;
        const tileX = boss.x + Math.cos(boss._beamAngle) * reach - 32;
        const tileY = boss.y + Math.sin(boss._beamAngle) * reach - 32;
        HazardManager.spawn({
          shape: 'rect',
          x: tileX, y: tileY, w: 64, h: 64,
          dps: 8, duration: 4.0,
          color: '#ff0099', source: 'pixelBeam'
        });
      }
    }
  },

  frameDash: {
    init(boss, player) {
      const dx = player.x - boss.x;
      const dy = player.y - boss.y;
      const a = Math.atan2(dy, dx);
      boss._dashAngle = a;
      boss._dashDist = 0;
      boss._dashDropped = 0;
      boss._dashTotal = 6;
    },
    tick(dt, boss, player) {
      // Dash 380px/s in dash direction
      const speed = 380;
      boss.x += Math.cos(boss._dashAngle) * speed * dt;
      boss.y += Math.sin(boss._dashAngle) * speed * dt;
      boss._dashDist += speed * dt;

      // Schedule blast hazards along the trail every ~120px
      const interval = 120;
      while (boss._dashDropped * interval < boss._dashDist && boss._dashDropped < boss._dashTotal) {
        boss._dashDropped++;
        const dropDist = boss._dashDropped * interval;
        const dx = boss.x - Math.cos(boss._dashAngle) * (boss._dashDist - dropDist);
        const dy = boss.y - Math.sin(boss._dashAngle) * (boss._dashDist - dropDist);
        HazardManager.spawn({
          shape: 'circle',
          cx: dx, cy: dy, r: 70,
          delay: 1.0, duration: 0.4,
          blastDmg: 40, kind: 'detonate',
          color: '#ffd700', source: 'frameDash'
        });
      }
    }
  },

  // Boss 2: synthLordOctave
  sonicRings: {
    init(boss) {
      boss._ringTimer = 0;
      boss._ringsFired = 0;
    },
    tick(dt, boss) {
      boss._ringTimer += dt;
      if (boss._ringTimer >= 0.6 && boss._ringsFired < 4) {
        boss._ringTimer = 0;
        boss._ringsFired++;
        // Spawn a ring of fast enemy projectiles around the boss, with a gap.
        const ringRadius = 60;
        const speed = 260;
        const gapStart = Math.random() * Math.PI * 2;
        const gapWidth = Math.PI / 5;
        const count = 18;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          if (a >= gapStart && a <= gapStart + gapWidth) continue;
          const vx = Math.cos(a) * speed;
          const vy = Math.sin(a) * speed;
          activeEnemyProjectiles.push(new EnemyProjectile(
            boss.x + Math.cos(a) * ringRadius,
            boss.y + Math.sin(a) * ringRadius,
            vx, vy, 5, 8
          ));
        }
      }
    }
  },

  audioColumn: {
    init(boss) {
      boss._colTimer = 0;
    },
    tick(dt, boss, player) {
      boss._colTimer += dt;
      if (boss._colTimer >= 0.5) {
        boss._colTimer = 0;
        // Drop a vertical hazard column near player x.
        const colX = player.x + (Math.random() - 0.5) * 220;
        HazardManager.spawn({
          shape: 'rect',
          x: colX - 24, y: player.y - 400, w: 48, h: 800,
          dps: 16, duration: 1.5,
          color: '#cc66ff', source: 'audioColumn'
        });
        // Secondary scatter shots from bottom
        for (let i = 0; i < 6; i++) {
          const angle = -Math.PI / 2 + (i - 2.5) * 0.25;
          activeEnemyProjectiles.push(new EnemyProjectile(
            colX, player.y + 400,
            Math.cos(angle) * 220, Math.sin(angle) * 220,
            4, 6
          ));
        }
      }
    }
  },

  synthCascade: {
    init(boss) {
      boss._cascadeTimer = 0;
      boss._cascadeShots = 0;
    },
    tick(dt, boss, player) {
      boss._cascadeTimer += dt;
      if (boss._cascadeTimer >= 0.32 && boss._cascadeShots < 8) {
        boss._cascadeTimer = 0;
        boss._cascadeShots++;
        const base = Math.atan2(player.y - boss.y, player.x - boss.x);
        const a = base + (boss._cascadeShots * Math.PI / 4);
        activeEnemyProjectiles.push(new EnemyProjectile(
          boss.x, boss.y,
          Math.cos(a) * 280, Math.sin(a) * 280,
          6, 10
        ));
      }
    }
  },

  // Boss 3: nullPointer
  vectorCage: {
    init(boss, player) {
      const cellW = 300;
      const cellH = 300;
      const half = cellW / 2;
      const cx = player.x;
      const cy = player.y;
      const thick = 16;
      // 4 walls
      HazardManager.spawn({ shape: 'rect', x: cx - half, y: cy - half - thick, w: cellW, h: thick, dps: 20, duration: 5.0, color: '#ff0055', source: 'vectorCage' });
      HazardManager.spawn({ shape: 'rect', x: cx - half, y: cy + half, w: cellW, h: thick, dps: 20, duration: 5.0, color: '#ff0055', source: 'vectorCage' });
      HazardManager.spawn({ shape: 'rect', x: cx - half - thick, y: cy - half, w: thick, h: cellH, dps: 20, duration: 5.0, color: '#ff0055', source: 'vectorCage' });
      HazardManager.spawn({ shape: 'rect', x: cx + half, y: cy - half, w: thick, h: cellH, dps: 20, duration: 5.0, color: '#ff0055', source: 'vectorCage' });
    },
    tick() {}
  },

  binaryRain: {
    init(boss) {
      boss._rainTimer = 0;
    },
    tick(dt, boss, player) {
      boss._rainTimer += dt;
      if (boss._rainTimer >= 0.1) {
        boss._rainTimer = 0;
        for (let i = 0; i < 3; i++) {
          const px = player.x + (Math.random() - 0.5) * 800;
          const py = player.y - 400 - Math.random() * 100;
          const isOne = Math.random() < 0.55;
          const proj = new EnemyProjectile(px, py, 0, 280, 5, isOne ? 2 : 0);
          proj.binaryKind = isOne ? '1' : '0';
          proj.color = isOne ? '#ff0055' : '#00f0ff';
          // Override update to handle xp drain for '0'.
          const baseUpdate = proj.update.bind(proj);
          proj.update = function(dtArg, plr) {
            const beforeHp = plr.hp;
            const beforeXp = plr.xp;
            baseUpdate(dtArg, plr);
            if (this.expired && this.binaryKind === '0') {
              // Restore any hp damage (zero is xp drain only) and subtract XP.
              if (plr.hp < beforeHp) plr.hp = beforeHp;
              plr.xp = Math.max(0, beforeXp - 5);
            }
          };
          activeEnemyProjectiles.push(proj);
        }
      }
    }
  },

  // No-op placeholder (used as default when patterns array is empty).
  idle: {
    tick() {}
  }
};

// ----------------------------------------------------------------------------
// BossController
// ----------------------------------------------------------------------------
export class BossController {
  constructor(defId, boss) {
    this.def = BOSS_DEFS[defId];
    this.boss = boss;
    this.boss.defId = defId;
    this.patternTimer = 0;
    this.currentPattern = null;
    this.rotationIndex = 0;
    this.phaseFlags = {};
    this.codeLagApplied = false;
  }

  pickNext() {
    const order = this.def.rotationOrder;
    if (!order || order.length === 0) return PATTERNS.idle;
    const id = order[this.rotationIndex % order.length];
    this.rotationIndex++;
    return { id, ...PATTERNS[id] };
  }

  update(dt, player, enemies) {
    // Phase trigger check (HP%)
    if (Array.isArray(this.def.phaseTriggers)) {
      for (const trig of this.def.phaseTriggers) {
        if (this.phaseFlags[trig.action]) continue;
        if (this.boss.hp / this.boss.maxHp <= trig.hpRatio) {
          this.phaseFlags[trig.action] = true;
          this.onPhaseTrigger(trig.action, player);
        }
      }
    }

    // Pattern advance
    this.patternTimer -= dt;
    if (this.patternTimer <= 0 || !this.currentPattern) {
      this.currentPattern = this.pickNext();
      const duration = this.def.durations[this.currentPattern.id] ?? 2.0;
      this.patternTimer = duration;
      if (this.currentPattern.init) this.currentPattern.init(this.boss, player);
    }
    if (this.currentPattern.tick) this.currentPattern.tick(dt, this.boss, player, enemies);
  }

  onPhaseTrigger(action, player) {
    if (action === 'codeLag') {
      // 5s movement & fire-rate debuff on player
      player._codeLagUntil = ((typeof performance !== 'undefined') ? performance.now() / 1000 : Date.now() / 1000) + 5.0;
      ParticleSystem.spawnDamageText(player.x, player.y - 60, '⚠ CODE LAG! ⚠', '#ff0099');
      Sound.playHeavyImpact();
    } else if (action === 'nullification') {
      this.boss.nullified = true;
      ParticleSystem.spawnDamageText(this.boss.x, this.boss.y - 80, '⛔ NULL SHIELD ⛔', '#ff0055');
      Sound.playHeavyImpact();
    }
  }
}

export function spawnBoss(defId, x, y, EnemyClass, difficultyMult = 1.0) {
  const def = BOSS_DEFS[defId];
  if (!def) return null;

  const boss = new EnemyClass(x, y, 'boss', difficultyMult);
  boss.radius = def.radius;
  boss.hp = def.hp;
  boss.maxHp = def.hp;
  boss.damage = def.contactDamage;
  boss.color = def.color;
  boss.knockbackResist = 0.02;
  boss.bossImmuneToPull = true;
  boss.armor = 6;
  boss.isEpicBoss = true;
  boss.defId = defId;
  boss.name = def.name;

  const controller = new BossController(defId, boss);
  boss.controller = controller;
  activeBosses.push(boss);
  return boss;
}

export function updateBosses(dt, player, enemies) {
  for (let i = 0; i < activeBosses.length; i++) {
    const b = activeBosses[i];
    if (b.hp > 0 && b.controller) {
      b.controller.update(dt, player, enemies);
    }
  }
  // Prune dead bosses
  let idx = 0;
  for (let i = 0; i < activeBosses.length; i++) {
    if (activeBosses[i].hp > 0) {
      activeBosses[idx] = activeBosses[i];
      idx++;
    }
  }
  activeBosses.length = idx;
}

export function clearBosses() {
  activeBosses.length = 0;
}
