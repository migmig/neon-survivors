// --- Hazard system (boss patterns + evolution-weapon AoE share this) ---
//
// World.hazards: Hazard[] is the canonical container, managed by main.js.

export const activeHazards = [];

export class Hazard {
  constructor(options = {}) {
    this.shape = options.shape ?? 'rect'; // 'rect' | 'circle'
    if (this.shape === 'rect') {
      this.x = options.x ?? 0;
      this.y = options.y ?? 0;
      this.w = options.w ?? 50;
      this.h = options.h ?? 50;
    } else {
      this.cx = options.cx ?? 0;
      this.cy = options.cy ?? 0;
      this.r = options.r ?? 60;
    }

    this.duration = options.duration ?? 3.0;
    this.remaining = this.duration;
    this.delay = options.delay ?? 0; // delay before active (for telegraphed hazards)
    this.dps = options.dps ?? 0;
    this.blastDmg = options.blastDmg ?? 0; // one-shot AoE on detonate (for circle delayed)
    this.color = options.color ?? '#ff0099';
    this.kind = options.kind ?? 'damage'; // 'damage' | 'detonate'
    this.expired = false;
    this.hitOnce = false;
    this.source = options.source ?? null;
    this.tickAccumulator = 0;
  }

  contains(px, py) {
    if (this.shape === 'rect') {
      return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
    }
    const dx = px - this.cx;
    const dy = py - this.cy;
    return dx * dx + dy * dy <= this.r * this.r;
  }

  update(dt, player, enemies) {
    if (this.delay > 0) {
      this.delay -= dt;
      if (this.delay > 0) return;
    }

    this.remaining -= dt;

    if (this.kind === 'detonate' && !this.hitOnce) {
      // One-shot blast: deal blastDmg to player if inside; mark hitOnce so we don't repeat.
      this.hitOnce = true;
      if (this.contains(player.x, player.y)) {
        player.takeDamage(this.blastDmg);
      }
      // Also damage enemies inside (friendly-fire for boss patterns is acceptable).
      if (enemies) {
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (e.hp <= 0) continue;
          if (this.contains(e.x, e.y)) {
            e.takeDamage(this.blastDmg);
          }
        }
      }
    } else if (this.kind === 'damage' && this.dps > 0) {
      if (this.contains(player.x, player.y)) {
        // Tick damage every ~0.5s so it feels chunky instead of frame-rate dependent micro-ticks.
        this.tickAccumulator += dt;
        if (this.tickAccumulator >= 0.5) {
          const ticks = Math.floor(this.tickAccumulator / 0.5);
          this.tickAccumulator -= ticks * 0.5;
          player.takeDamage(this.dps * 0.5 * ticks);
        }
      } else {
        this.tickAccumulator = 0;
      }
    }

    if (this.remaining <= 0) this.expired = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.color;
    const flash = (this.delay > 0) ? 0.25 + 0.4 * Math.abs(Math.sin(Date.now() * 0.015)) : 0.35;
    ctx.globalAlpha = Math.max(0.15, Math.min(0.75, flash));

    if (this.shape === 'rect') {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
}

export const HazardManager = {
  spawn(options) {
    const h = new Hazard(options);
    activeHazards.push(h);
    return h;
  },
  update(dt, player, enemies) {
    for (let i = 0; i < activeHazards.length; i++) {
      activeHazards[i].update(dt, player, enemies);
    }
    // Filter expired in place
    let idx = 0;
    for (let i = 0; i < activeHazards.length; i++) {
      if (!activeHazards[i].expired) {
        activeHazards[idx] = activeHazards[i];
        idx++;
      }
    }
    activeHazards.length = idx;
  },
  draw(ctx) {
    for (let i = 0; i < activeHazards.length; i++) {
      activeHazards[i].draw(ctx);
    }
  },
  clear() {
    activeHazards.length = 0;
  }
};
