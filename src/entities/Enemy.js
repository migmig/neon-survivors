// --- Enemy Swarm Entities (Includes Ranged Shooters, Kamikazes, and Sentinel Bosses) ---

import { ParticleSystem } from '../systems/Particle.js';
import { ENEMY_DEFS, getBaseSpeed } from '../data/enemies.js';

// Global array for active enemy projectiles
export const activeEnemyProjectiles = [];

// --- Enemy Projectile Class ---
export class EnemyProjectile {
  constructor(x, y, vx, vy, radius, damage) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.expired = false;
    this.lifeTime = 4.0; // self-destruct after 4 seconds
    this.color = '#00ffcc'; // Glowing cyan enemy laser
  }

  update(dt, player) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Spawn trail occasionally
    if (Math.random() < 0.15) {
      ParticleSystem.spawnTrail(this.x, this.y, this.color, this.radius * 0.7);
    }

    this.lifeTime -= dt;
    if (this.lifeTime <= 0) {
      this.expired = true;
    }

    // Check collision with player
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < player.radius + this.radius) {
      player.takeDamage(this.damage);
      this.expired = true;
      ParticleSystem.spawnExplosion(this.x, this.y, this.color, 4);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = this.radius * 3;
    ctx.shadowColor = this.color;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// --- Main Enemy Class ---
export class Enemy {
  constructor(x, y, type = 'standard', difficultyMultiplier = 1.0) {
    this.x = x;
    this.y = y;
    this.type = type;

    // Knockback physics velocity accumulators
    this.kbX = 0;
    this.kbY = 0;
    this.hitTimer = 0; // Visual red flash when damaged

    // Set parameters depending on Type
    this.initStats(difficultyMultiplier);
    this.maxHp = this.hp;

    // [Phase A.3] Standardized status fields
    this.team = 'enemy';          // 'enemy' | 'ally' (zombified)
    if (this.armor === undefined) this.armor = 0;
    if (this.knockbackResist === undefined) {
      const def = ENEMY_DEFS[this.type];
      this.knockbackResist = def ? def.knockbackResist : 1.0;
    }
    this.frozenUntil = 0;          // gameTime threshold; while now() < frozenUntil enemy can't move/act
    this.infected = false;         // generic infection flag (nanite/zombie)
    this.bossImmuneToPull = (this.type === 'boss');

    // Contact attack rate limiter
    this.attackCooldown = 0.5; // Attack player every 0.5s if colliding
    this.attackTimer = 0;
  }

  initStats(mult) {
    switch (this.type) {
      case 'speedster':
        this.radius = 11;
        this.speed = 125 * (1 + (mult - 1) * 0.12); // Scales speed more slowly
        this.hp = Math.round(9 * mult);
        this.damage = 4 * mult;
        this.color = '#ff6a00'; // Neon Orange
        this.xpValue = 15;
        this.tier = 1;
        break;

      case 'tank':
        this.radius = 22;
        this.speed = 42;
        this.hp = Math.round(45 * mult);
        this.damage = 12 * mult;
        this.color = '#aa00ff'; // Neon Purple
        this.xpValue = 35;
        this.tier = 2;
        break;

      case 'shooter':
        this.radius = 12;
        this.speed = 65 * (1 + (mult - 1) * 0.06);
        this.hp = Math.round(12 * mult);
        this.damage = 5 * mult;
        this.color = '#00ffcc'; // Neon Cyan/Mint
        this.xpValue = 20;
        this.tier = 1;
        this.shootTimer = Math.random() * 3.0; // Randomized initial shoot offset
        this.shootCooldown = 3.2; // Fires less frequently
        break;

      case 'kamikaze':
        this.radius = 10;
        this.speed = 125 * (1 + (mult - 1) * 0.12);
        this.hp = Math.round(8 * mult);
        this.damage = 15 * mult; // Balanced explosion damage (down from 32)
        this.color = '#ffff00'; // Neon Yellow
        this.xpValue = 15;
        this.tier = 1;
        this.isDetonating = false;
        this.detonateTimer = 1.4; // 1.4s countdown (more reaction time)
        this.detonateRadius = 45; // Smaller explosion range
        break;

      case 'sentinel':
        this.radius = 26;
        this.speed = 50;
        this.hp = Math.round(120 * mult);
        this.damage = 14 * mult;
        this.color = '#00f0ff'; // Glowing Cyan Elite Shield Sentinel
        this.xpValue = 80;
        this.tier = 2;
        break;

      case 'boss':
        this.radius = 35;
        this.speed = 55;
        this.hp = Math.round(250 * mult);
        this.damage = 20 * mult;
        this.color = '#ff003c'; // Intense pulsing neon crimson
        this.xpValue = 250;
        this.tier = 3;
        break;

      case 'standard':
      default:
        this.radius = 13;
        this.speed = 80 * (1 + (mult - 1) * 0.08);
        this.hp = Math.round(14 * mult);
        this.damage = 6 * mult;
        this.color = '#ff0055'; // Neon Pink/Red
        this.xpValue = 10;
        this.tier = 1;
        break;
    }
  }

  takeDamage(amount, fromEvolution = false) {
    // [Phase D.14] nullification: shielded boss only takes damage from evolution weapons.
    if (this.nullified && !fromEvolution) {
      ParticleSystem.spawnDamageText(this.x, this.y - 12, 'NULL', '#666666');
      return;
    }
    // [Phase A.3] Apply armor reduction (always at least 1 damage).
    const reduced = Math.max(1, Math.round(amount - (this.armor || 0)));
    this.hp -= reduced;
    this.hitTimer = 0.1; // Flash red for 0.1s

    // Spawn impact particles
    ParticleSystem.spawnExplosion(this.x, this.y, this.color, 3);
  }

  knockback(angle, force) {
    // [Phase A.3] knockbackResist field is the authoritative resistance multiplier.
    const resistance = (typeof this.knockbackResist === 'number') ? this.knockbackResist : 1.0;
    this.kbX += Math.cos(angle) * force * resistance;
    this.kbY += Math.sin(angle) * force * resistance;
  }

  update(dt, player) {
    if (this.hp <= 0) return;

    // [Phase A.3] Freeze gate: skip AI / attack while frozen (knockback friction still applies).
    const nowSec = (typeof performance !== 'undefined') ? performance.now() / 1000 : Date.now() / 1000;
    const isFrozen = this.frozenUntil > nowSec;

    // Decelerate knockback force
    const kbFriction = Math.pow(0.85, dt * 60);
    this.kbX *= kbFriction;
    this.kbY *= kbFriction;

    if (isFrozen) {
      this.x += this.kbX * dt;
      this.y += this.kbY * dt;
      if (this.hitTimer > 0) this.hitTimer -= dt;
      return;
    }

    // Epic bosses are driven by BossController in systems/Boss.js — skip chase AI.
    if (this.isEpicBoss) {
      this.x += this.kbX * dt;
      this.y += this.kbY * dt;
      if (this.hitTimer > 0) this.hitTimer -= dt;
      if (this.attackTimer > 0) this.attackTimer -= dt;
      const distEp = Math.hypot(player.x - this.x, player.y - this.y);
      if (distEp < player.radius + this.radius && this.attackTimer <= 0) {
        player.takeDamage(this.damage);
        this.attackTimer = this.attackCooldown;
      }
      return;
    }

    // Reset small drift velocities
    if (Math.hypot(this.kbX, this.kbY) < 1.0) {
      this.kbX = 0;
      this.kbY = 0;
    }

    // AI movement pathfinding: Head straight towards the player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    let vx = 0;
    let vy = 0;

    // Custom behaviors depending on enemy AI Type
    if (this.type === 'shooter') {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.shootCooldown;
        
        // Shoot projectile towards player
        const angle = Math.atan2(dy, dx);
        const pSpeed = 220;
        const pVx = Math.cos(angle) * pSpeed;
        const pVy = Math.sin(angle) * pSpeed;
        
        activeEnemyProjectiles.push(new EnemyProjectile(
          this.x,
          this.y,
          pVx,
          pVy,
          4.5,
          this.damage
        ));
      }

      // Ranged movement: keep distance from player
      if (dist < 180) {
        // Back off!
        vx = -(dx / (dist || 1)) * this.speed;
        vy = -(dy / (dist || 1)) * this.speed;
      } else if (dist > 250) {
        // Approach!
        vx = (dx / (dist || 1)) * this.speed;
        vy = (dy / (dist || 1)) * this.speed;
      } else {
        // Stand still/drift slightly
        vx = 0;
        vy = 0;
      }
    } else if (this.type === 'kamikaze') {
      if (this.isDetonating) {
        // Charge detonation sequence (stand still)
        vx = 0;
        vy = 0;
        this.detonateTimer -= dt;
        
        if (this.detonateTimer <= 0) {
          // Explode self and damage player!
          this.hp = 0; // Kills self
          ParticleSystem.spawnExplosion(this.x, this.y, '#ffff00', 16);
          
          const finalDist = Math.hypot(player.x - this.x, player.y - this.y);
          if (finalDist < player.radius + this.detonateRadius) {
            player.takeDamage(this.damage);
          }
          return;
        }
      } else {
        // Move fast towards player
        if (dist > 2) {
          vx = (dx / dist) * this.speed;
          vy = (dy / dist) * this.speed;
        }
        
        // Trigger explosion sequence if very close
        if (dist < 75) {
          this.isDetonating = true;
        }
      }
    } else {
      // Standard chasing AI
      if (dist > 2) {
        vx = (dx / dist) * this.speed;
        vy = (dy / dist) * this.speed;
      }
    }

    // Apply movement velocities (Normal chase + knockbacks)
    this.x += (vx + this.kbX) * dt;
    this.y += (vy + this.kbY) * dt;

    // Tick visual damage indicators
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
    }

    // Attack contact handler
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }

    if (dist < player.radius + this.radius) {
      if (this.attackTimer <= 0 && this.type !== 'kamikaze') {
        player.takeDamage(this.damage);
        this.attackTimer = this.attackCooldown;
      }
    }
  }

  draw(ctx) {
    if (this.hp <= 0) return;

    // [Phase D.3/D.7/D.11] Epic-boss specialized shapes
    if (this.isEpicBoss) {
      this.drawEpicBoss(ctx);
      return;
    }

    ctx.save();

    // Choose neon lighting glow based on hit state
    if (this.hitTimer > 0) {
      ctx.shadowBlur = this.radius * 2.5;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.shadowBlur = this.radius * 2.2;
      ctx.shadowColor = this.color;
      ctx.fillStyle = 'rgba(12, 10, 22, 0.88)'; // Cyber-dark high-contrast core (makes it distinct from items!)
      ctx.strokeStyle = this.color;
    }

    ctx.lineWidth = 2.2; // Slightly thicker glowing outlines

    // Render specialized geometric polygons for each enemy type
    if (this.type === 'standard') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'speedster') {
      ctx.beginPath();
      ctx.moveTo(this.x + this.radius * 1.4, this.y);
      ctx.lineTo(this.x - this.radius, this.y - this.radius);
      ctx.lineTo(this.x - this.radius * 0.6, this.y);
      ctx.lineTo(this.x - this.radius, this.y + this.radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'tank') {
      ctx.beginPath();
      const sides = 6;
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides;
        const hX = this.x + Math.cos(angle) * this.radius;
        const hY = this.y + Math.sin(angle) * this.radius;
        if (i === 0) ctx.moveTo(hX, hY);
        else ctx.lineTo(hX, hY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Inner tech circle
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'shooter') {
      // Crosshair diamond shape
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.lineTo(this.x + this.radius, this.y);
      ctx.lineTo(this.x, this.y + this.radius);
      ctx.lineTo(this.x - this.radius, this.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Crosshair tick marks
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x - this.radius * 1.4, this.y);
      ctx.lineTo(this.x + this.radius * 1.4, this.y);
      ctx.moveTo(this.x, this.y - this.radius * 1.4);
      ctx.lineTo(this.x, this.y + this.radius * 1.4);
      ctx.stroke();
    } else if (this.type === 'kamikaze') {
      // Draw spiked explosive mine shape
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const r = (i % 2 === 0) ? this.radius * 1.1 : this.radius * 0.65;
        const sX = this.x + Math.cos(angle) * r;
        const sY = this.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(sX, sY);
        else ctx.lineTo(sX, sY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Detonating red alarm glow
      if (this.isDetonating) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.type === 'sentinel') {
      // Large 8-sided elite sentinel shield boss
      ctx.beginPath();
      const sides = 8;
      for (let i = 0; i < sides; i++) {
        const angle = (i * Math.PI * 2) / sides;
        const sX = this.x + Math.cos(angle) * this.radius;
        const sY = this.y + Math.sin(angle) * this.radius;
        if (i === 0) ctx.moveTo(sX, sY);
        else ctx.lineTo(sX, sY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Outer rings
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'boss') {
      // Large pulsing star structure
      const time = Date.now() * 0.006;
      const pulse = 1 + Math.sin(time) * 0.08;
      const scaleRadius = this.radius * pulse;

      ctx.save();
      ctx.shadowBlur = scaleRadius * 3;
      ctx.shadowColor = '#ff003c';
      
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const r = (i % 2 === 0) ? scaleRadius : scaleRadius * 0.55;
        const sX = this.x + Math.cos(angle) * r;
        const sY = this.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(sX, sY);
        else ctx.lineTo(sX, sY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pulsing white outline ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, scaleRadius * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // Render a small HP bar below damaged enemies
    if (this.hp < this.maxHp && this.type !== 'standard') {
      ctx.shadowBlur = 0; // Turn off glow for health bar
      const barW = this.radius * 1.8;
      const barH = 4;
      const barX = this.x - barW / 2;
      const barY = this.y + this.radius + 8;
      const fillW = Math.max(0, (this.hp / this.maxHp) * barW);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      
      ctx.fillStyle = this.hp / this.maxHp > 0.4 ? '#00ff66' : '#ff0055';
      ctx.fillRect(barX, barY, fillW, barH);
    }

    ctx.restore();

    // Epic boss special HP bar (always shown)
    // (rendered via dedicated drawEpicBoss path; handled separately)
    // Render kamikaze detonating countdown zone guide
    if (this.type === 'kamikaze' && this.isDetonating) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 8;
      
      const flash = Math.sin(Date.now() * 0.02) > 0;
      ctx.globalAlpha = flash ? 0.25 : 0.08;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.detonateRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // [Phase D.3/D.7/D.11] Specialized epic boss silhouettes.
  drawEpicBoss(ctx) {
    const time = Date.now() * 0.003;
    const id = this.defId;
    ctx.save();
    ctx.shadowBlur = this.radius * 3;
    ctx.shadowColor = this.color;
    ctx.translate(this.x, this.y);

    if (id === 'glitchLeviathan') {
      // Segmented leviathan worm: stack 5 glitchy rings.
      ctx.rotate(time * 0.5);
      for (let i = 0; i < 5; i++) {
        const r = this.radius * (1.0 - i * 0.12);
        const offset = i * 6 + Math.sin(time * 1.5 + i) * 4;
        ctx.fillStyle = `rgba(255, 0, 153, ${0.45 + 0.1 * i})`;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(offset, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (id === 'synthLordOctave') {
      // Floating mirrored skull + orbiting keys
      ctx.fillStyle = 'rgba(204, 102, 255, 0.7)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 8 orbital "keys"
      for (let i = 0; i < 8; i++) {
        const a = time + (i * Math.PI / 4);
        const kx = Math.cos(a) * (this.radius + 30);
        const ky = Math.sin(a) * (this.radius + 30);
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#cc66ff';
        ctx.fillRect(kx - 6, ky - 4, 12, 8);
      }
    } else if (id === 'nullPointer') {
      // Wireframe spider + red core
      ctx.strokeStyle = this.nullified ? '#ff0055' : '#888888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      // 6 wire legs
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 + time * 0.6;
        const lx = Math.cos(a) * (this.radius * 1.8);
        const ly = Math.sin(a) * (this.radius * 1.8);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(lx, ly);
        ctx.stroke();
      }
      // Red core
      ctx.fillStyle = '#ff003c';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Null shield (phase 2)
      if (this.nullified) {
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.4 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Fallback ring
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Big HP bar above the boss
    const barW = 240;
    const barH = 8;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - 26;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = this.hp / this.maxHp > 0.4 ? '#ff0099' : '#ff0055';
    ctx.fillRect(barX, barY, Math.max(0, barW * (this.hp / this.maxHp)), barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    if (this.name) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px "Orbitron", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, barY - 4);
    }
    ctx.restore();
  }
}
