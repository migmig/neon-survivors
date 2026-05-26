// --- Weapon and Projectile Systems ---

import { Sound } from './Sound.js';
import { ParticleSystem } from './Particle.js';
import { WEAPON_DEFS } from '../data/weapons.js';

// Global accumulator for projectile references
export const activeProjectiles = [];

export class Projectile {
  constructor(x, y, vx, vy, radius, damage, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.pierce = options.pierce ?? 1;
    this.color = options.color ?? '#00f0ff';
    this.glowColor = options.glowColor ?? 'rgba(0, 240, 255, 0.4)';
    this.trailTimer = 0;
    this.weaponId = options.weaponId ?? 'plasmabolt';
    this.isEvolution = options.isEvolution ?? false; // [Phase D.14] nullification gate

    // Track hit enemy IDs to prevent multiple hits from the same projectile
    this.hitEnemies = new Set();
    this.expired = false;
    this.lifeTime = options.lifeTime ?? 5.0; // Seconds before self-destruct
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Spawn glowing particle trails
    this.trailTimer += dt;
    if (this.trailTimer > 0.03) {
      ParticleSystem.spawnTrail(this.x, this.y, this.color, this.radius * 0.7);
      this.trailTimer = 0;
    }

    this.lifeTime -= dt;
    if (this.lifeTime <= 0) {
      this.expired = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = this.radius * 3;
    ctx.shadowColor = this.color;
    
    ctx.fillStyle = '#ffffff'; // White inner core
    ctx.strokeStyle = this.color; // Glowing neon outline
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  onHit(enemyId) {
    this.hitEnemies.add(enemyId);
    this.pierce--;
    if (this.pierce <= 0) {
      this.expired = true;
    }
  }
}

// ----------------------------------------------------
// BASE WEAPON CLASS
// ----------------------------------------------------
class Weapon {
  constructor(player, id, name, description) {
    this.player = player;
    this.id = id;
    this.name = name;
    this.description = description;
    this.level = 1;
    this.maxLevel = 5;
    this.cooldown = 1.0;
    this.cooldownTimer = 0;
    // [Phase A.2/A.6] Standardized fields
    this.totalDamageDealt = 0;
    this.tags = [];
    // Adopt tags from data table when present (evolution weapons get 'evolution').
    const def = WEAPON_DEFS[id];
    if (def && Array.isArray(def.tags)) {
      this.tags = [...def.tags];
    }
  }

  hasTag(tag) {
    return this.tags.includes(tag);
  }

  // [Phase A.2] Accumulate damage on this weapon and forward to player DPS log.
  applyDamageTo(enemy, amount) {
    if (!enemy || enemy.hp <= 0) return;
    enemy.takeDamage(amount);
    this.totalDamageDealt += amount;
    if (this.player && typeof this.player.trackDamage === 'function') {
      this.player.trackDamage(this.id, amount);
    }
  }

  update(dt, enemies) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (this.cooldownTimer <= 0) {
      const fired = this.fire(enemies);
      if (fired) {
        this.cooldownTimer = this.cooldown;
      }
    }
  }

  fire(enemies) {
    // To be overridden by subclass
    return false;
  }

  levelUp() {
    if (this.level < this.maxLevel) {
      this.level++;
      this.onLevelUp();
    }
  }

  // Default onLevelUp: pull stats from WEAPON_DEFS table when defined.
  // Subclasses can still override for custom side effects.
  onLevelUp() {
    const def = WEAPON_DEFS[this.id];
    if (def && Array.isArray(def.levels)) {
      const stats = def.levels[Math.min(this.level - 1, def.levels.length - 1)];
      if (stats) Object.assign(this, stats);
    }
  }

  // Get nearest enemy helper
  getNearestEnemy(enemies) {
    if (!enemies || enemies.length === 0) return null;
    
    let nearest = null;
    let minDist = Infinity;
    
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    
    return nearest;
  }
}

// ----------------------------------------------------
// 1. PLASMA BOLT (Auto-aiming laser)
// ----------------------------------------------------
export class PlasmaBolt extends Weapon {
  constructor(player) {
    super(player, 'plasmabolt', '플라즈마 볼트', '가장 가까운 적에게 자동 유도 광선탄을 발사합니다.');
    this.cooldown = 0.9;
    this.damage = 18;
    this.bulletSpeed = 420;
    this.bulletRadius = 5;
    this.pierce = 1;
    this.count = 1;
  }

  fire(enemies) {
    const target = this.getNearestEnemy(enemies);
    if (!target) return false;

    // Play shoot sound
    Sound.playShoot();

    // Fire bullets towards target
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const baseAngle = Math.atan2(dy, dx);
    const damage = Math.round(this.damage * this.player.damageMult);

    for (let i = 0; i < this.count; i++) {
      // Offset multiple bullets in a fan shape
      let angle = baseAngle;
      if (this.count > 1) {
        const spacing = 0.15; // Radians
        angle = baseAngle + (i - (this.count - 1) / 2) * spacing;
      }

      const vx = Math.cos(angle) * this.bulletSpeed;
      const vy = Math.sin(angle) * this.bulletSpeed;

      activeProjectiles.push(new Projectile(
        this.player.x, 
        this.player.y, 
        vx, 
        vy, 
        this.bulletRadius, 
        damage, 
        { pierce: this.pierce, color: '#00f0ff', weaponId: 'plasmabolt' }
      ));
    }
    return true;
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.count = 2; // Fires 2 bolts
        this.description = '발사 탄환 개수 증가 및 공격속도 향상';
        this.cooldown = 0.75;
        break;
      case 3:
        this.damage = 25; // Base damage bump
        this.pierce = 2; // Pierces 1 enemy
        this.bulletRadius = 6.5;
        this.description = '탄환 크기 증가 및 적 2명 관통 관통력 확보';
        break;
      case 4:
        this.count = 3; // Fires 3 bolts in a fan
        this.cooldown = 0.6;
        this.description = '발사 개수 추가 3개 세 갈래 탄막 형성';
        break;
      case 5:
        this.count = 4; // Ultimate Plasma Burst
        this.damage = 35;
        this.pierce = 4;
        this.bulletRadius = 9;
        this.bulletSpeed = 500;
        this.description = '마스터 - 메가 플라즈마: 4발 동시 발사, 관통 4명, 광선 크기 극대화';
        break;
    }
  }
}

// ----------------------------------------------------
// 2. ORBITING SHIELD (Neon glowing blades)
// ----------------------------------------------------
export class OrbitingShield extends Weapon {
  constructor(player) {
    super(player, 'orbitingshield', '오비탈 쉴드', '플레이어 주변을 회전하는 광선 보호막 구체를 생성합니다.');
    this.cooldown = 0; // Constant weapon, doesn't need firing cooldown
    this.damage = 15;
    this.count = 1;
    this.orbitRadius = 65;
    this.orbitSpeed = 2.0; // Radians per second
    this.angle = 0;
    this.shieldRadius = 8;
  }

  update(dt, enemies) {
    // Rotate orbits
    this.angle += this.orbitSpeed * dt;
    if (this.angle > Math.PI * 2) {
      this.angle -= Math.PI * 2;
    }

    // Shield handles collision in its update step rather than shooting projectiles
    const damage = Math.round(this.damage * this.player.damageMult);

    for (let i = 0; i < this.count; i++) {
      const offset = (i * Math.PI * 2) / this.count;
      const shieldX = this.player.x + Math.cos(this.angle + offset) * this.orbitRadius;
      const shieldY = this.player.y + Math.sin(this.angle + offset) * this.orbitRadius;

      // Spawn trail occasionally for beautiful circle effects
      if (Math.random() < 0.12) {
        ParticleSystem.spawnTrail(shieldX, shieldY, '#ff00aa', this.shieldRadius * 0.7);
      }

      // Check collision with all active enemies
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        // Skip if recently damaged (to prevent tick-shredding in 1 frame)
        if (enemy.shieldCooldownTimer && enemy.shieldCooldownTimer[i] > 0) {
          enemy.shieldCooldownTimer[i] -= dt;
          continue;
        }

        const dist = Math.hypot(enemy.x - shieldX, enemy.y - shieldY);
        if (dist < enemy.radius + this.shieldRadius) {
          // Trigger impact particle explosion
          ParticleSystem.spawnExplosion(enemy.x, enemy.y, '#ff00aa', 4);
          enemy.takeDamage(damage);
          this.player.trackDamage(this.id, damage);

          // Give enemy temporary immunity specifically to this shield orb index (0.3s cooldown)
          if (!enemy.shieldCooldownTimer) enemy.shieldCooldownTimer = {};
          enemy.shieldCooldownTimer[i] = 0.35;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = this.shieldRadius * 2.5;
    ctx.shadowColor = '#ff00aa';

    for (let i = 0; i < this.count; i++) {
      const offset = (i * Math.PI * 2) / this.count;
      const shieldX = this.player.x + Math.cos(this.angle + offset) * this.orbitRadius;
      const shieldY = this.player.y + Math.sin(this.angle + offset) * this.orbitRadius;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(shieldX, shieldY, this.shieldRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.count = 2; // 2 Orbs
        this.orbitSpeed = 2.3;
        this.description = '구체 2개로 증가 및 회전 속도 대폭 증가';
        break;
      case 3:
        this.damage = 22;
        this.shieldRadius = 10;
        this.description = '구체 크기 증가 및 피해량 향상';
        break;
      case 4:
        this.count = 3; // 3 Orbs
        this.orbitRadius = 78;
        this.description = '구체 3개로 증가 및 궤도 반경 확장';
        break;
      case 5:
        this.count = 5; // 5 Orbs Ultimate
        this.damage = 30;
        this.shieldRadius = 12;
        this.orbitSpeed = 2.8;
        this.description = '마스터 - 하이퍼 노바: 구체 5개 생성, 회전 속도 극대화 및 지옥의 광선 궤도 완성';
        break;
    }
  }
}

// ----------------------------------------------------
// 3. LIGHTNING STRIKE (Heavy overhead AoE)
// ----------------------------------------------------
export class LightningStrike extends Weapon {
  constructor(player) {
    super(player, 'lightningstrike', '라이트닝 로드', '번개를 내려쳐 무작위 위치에 막대한 피해를 입히는 전자기 폭발을 일으킵니다.');
    this.cooldown = 2.4;
    this.damage = 45;
    this.blastRadius = 55;
    this.strikesCount = 1;
  }

  fire(enemies) {
    // If no enemies exist, spawn random strikes near the player, otherwise spawn directly on enemies!
    const strikeLocations = [];
    const radiusScale = this.blastRadius;
    const damage = Math.round(this.damage * this.player.damageMult);

    for (let i = 0; i < this.strikesCount; i++) {
      let x, y;
      if (enemies && enemies.length > 0) {
        // Pick a random enemy to target
        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
        x = randomEnemy.x + (Math.random() - 0.5) * 15;
        y = randomEnemy.y + (Math.random() - 0.5) * 15;
      } else {
        // Drop randomly in a circle around player
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 200;
        x = this.player.x + Math.cos(angle) * dist;
        y = this.player.y + Math.sin(angle) * dist;
      }
      strikeLocations.push({ x, y });
    }

    // Trigger strike chain with small delay between strikes
    strikeLocations.forEach((loc, index) => {
      setTimeout(() => {
        if (this.player.isDead) return;
        
        // Play explosion Sound
        Sound.playHeavyImpact();

        // Spawn bright lightning bolt sparks and particles
        ParticleSystem.spawnExplosion(loc.x, loc.y, '#00ff55', 18);
        
        // Dynamic spark flashes upwards (representing overhead strike)
        for (let j = 0; j < 5; j++) {
          ParticleSystem.spawnTrail(loc.x + (Math.random() - 0.5) * 20, loc.y - j * 20, '#00ff55', 4);
        }

        // Damage calculation in blast radius
        if (enemies) {
          for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            const dist = Math.hypot(enemy.x - loc.x, enemy.y - loc.y);
            if (dist < enemy.radius + radiusScale) {
              enemy.takeDamage(damage);
              this.player.trackDamage(this.id, damage);
              // Trigger minor knockback
              const knockAngle = Math.atan2(enemy.y - loc.y, enemy.x - loc.x);
              enemy.knockback(knockAngle, 120);
            }
          }
        }

        // Add a temporary glowing blast ring on the canvas via a custom particle
        ParticleSystem.particles.push({
          x: loc.x,
          y: loc.y,
          size: radiusScale,
          originalSize: radiusScale,
          color: '#00ff55',
          alpha: 1,
          decay: 2.5,
          update: function(dt) {
            this.alpha -= this.decay * dt;
            this.size = this.originalSize * (1 + (1 - this.alpha) * 0.15); // Expand slightly
            return this.alpha > 0;
          },
          draw: function(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });

      }, index * 180); // 180ms delay between consecutive strikes
    });

    return true;
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.strikesCount = 2; // 2 Lightning bolts
        this.description = '번개 타격 횟수 2회 증가 및 피해량 증가';
        this.damage = 55;
        break;
      case 3:
        this.cooldown = 1.8;
        this.blastRadius = 70;
        this.description = '번개 쿨다운 대폭 감소 및 폭발 범위 확장';
        break;
      case 4:
        this.strikesCount = 3; // 3 Lightning bolts
        this.damage = 70;
        this.description = '타격 횟수 3회로 증가 및 전격 낙뢰 피해 극대화';
        break;
      case 5:
        this.strikesCount = 5; // 5 lightning bolts Ultimate
        this.damage = 95;
        this.blastRadius = 90;
        this.cooldown = 1.5;
        this.description = '마스터 - 플라즈마 일렉트릭 스톰: 낙뢰 5회 충돌, 벼락 반경 대폭발, 전설의 전자기 태풍 형성';
        break;
    }
  }
}

// ----------------------------------------------------
// 4. NEON FIRE TRAIL (Sparks on the ground)
// ----------------------------------------------------
export class NeonFireTrail extends Weapon {
  constructor(player) {
    super(player, 'neonfiretrail', '네온 화염 파편', '플레이어 뒤편으로 가상의 전자기 네온 불꽃을 떨어트려 통과하는 적에게 지속 피해를 입칩니다.');
    this.cooldown = 0.25; // Drop sparks frequently
    this.damage = 10;
    this.sparkRadius = 6;
    this.lifeTime = 3.0; // Sparks stay on floor for 3 seconds
    this.sparks = []; // We track sparks here to draw and update them
  }

  update(dt, enemies) {
    super.update(dt, enemies);

    // Update active sparks
    const damage = Math.round(this.damage * this.player.damageMult);
    
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.lifeTime -= dt;
      if (spark.lifeTime <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      // Trigger trail occasional sparkles
      if (Math.random() < 0.1) {
        ParticleSystem.spawnTrail(spark.x, spark.y, '#ff00aa', spark.radius * 0.7);
      }

      // Check collision with all active enemies
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        
        // Immunize enemy against this spark specifically for a short tick window (0.5s)
        if (enemy.fireTrailTimer && enemy.fireTrailTimer[spark.id] > 0) {
          enemy.fireTrailTimer[spark.id] -= dt;
          continue;
        }

        const dist = Math.hypot(enemy.x - spark.x, enemy.y - spark.y);
        if (dist < enemy.radius + spark.radius) {
          enemy.takeDamage(damage);
          this.player.trackDamage(this.id, damage);
          
          if (!enemy.fireTrailTimer) enemy.fireTrailTimer = {};
          enemy.fireTrailTimer[spark.id] = 0.5;
        }
      }
    }
  }

  fire(enemies) {
    // Drop a spark at player position
    const sparkId = Math.random().toString(36).substr(2, 9);
    this.sparks.push({
      id: sparkId,
      x: this.player.x,
      y: this.player.y,
      radius: this.sparkRadius,
      lifeTime: this.lifeTime
    });
    return true;
  }

  draw(ctx) {
    ctx.save();
    
    this.sparks.forEach((spark) => {
      // Fading glow based on remaining lifetime
      const ratio = spark.lifeTime / 3.0;
      ctx.globalAlpha = Math.max(0, Math.min(1, ratio));
      
      ctx.shadowBlur = spark.radius * 2.5;
      ctx.shadowColor = '#ff00aa';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 1.5;

      // Draw nice circular neon spark
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.restore();
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.sparkRadius = 8;
        this.damage = 14;
        this.description = '네온 화염 파편 폭 확장 및 피해량 증가';
        break;
      case 3:
        this.cooldown = 0.18; // Drop more frequently
        this.lifeTime = 4.0;
        this.description = '파편 투척 빈도 대폭 증가 및 유지 시간 연장';
        break;
      case 4:
        this.damage = 22;
        this.sparkRadius = 11;
        this.description = '지옥의 네온 지름 크기 극대화 및 피해 증강';
        break;
      case 5:
        this.cooldown = 0.12;
        this.damage = 32;
        this.lifeTime = 5.0;
        this.sparkRadius = 14;
        this.description = '마스터 - 메가 하이퍼 네온 블레이즈: 화염 폭 한계 팽창, 파편 투척 주기 단축';
        break;
    }
  }
}

// ----------------------------------------------------
// 5. CYBER DRONE (Companion shooting lasers)
// ----------------------------------------------------
export class CyberDrone extends Weapon {
  constructor(player) {
    super(player, 'cyberdrone', '사이버 드론', '플레이어 측면에서 부유하며 주기적으로 가장 가까운 적에게 단거리 고효율 레이저 탄을 발사하는 서포트 비행체를 호출합니다.');
    this.cooldown = 1.2;
    this.damage = 20;
    this.laserSpeed = 380;
    this.laserRadius = 4;
    this.laserCount = 1;
    this.orbitRadius = 40;
    this.angle = 0;
  }

  update(dt, enemies) {
    // Hover position coordinates around player
    this.angle += 1.5 * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

    super.update(dt, enemies);
  }

  fire(enemies) {
    const droneX = this.player.x + Math.cos(this.angle) * this.orbitRadius;
    const droneY = this.player.y + Math.sin(this.angle) * this.orbitRadius;

    // Find nearest target to the DRONE or to player
    const target = this.getNearestEnemy(enemies);
    if (!target) return false;

    // Fire bullet from drone position to target
    const dx = target.x - droneX;
    const dy = target.y - droneY;
    const baseAngle = Math.atan2(dy, dx);
    const damage = Math.round(this.damage * this.player.damageMult);

    for (let i = 0; i < this.laserCount; i++) {
      let angle = baseAngle;
      if (this.laserCount > 1) {
        const spacing = 0.15;
        angle = baseAngle + (i - (this.laserCount - 1) / 2) * spacing;
      }

      const vx = Math.cos(angle) * this.laserSpeed;
      const vy = Math.sin(angle) * this.laserSpeed;

      // Laser bullet
      activeProjectiles.push(new Projectile(
        droneX,
        droneY,
        vx,
        vy,
        this.laserRadius,
        damage,
        { pierce: 2, color: '#00ff66', weaponId: 'cyberdrone' }
      ));
    }

    Sound.playShoot();
    return true;
  }

  draw(ctx) {
    // Draw drone companion on Canvas
    const droneX = this.player.x + Math.cos(this.angle) * this.orbitRadius;
    const droneY = this.player.y + Math.sin(this.angle) * this.orbitRadius;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff66';
    ctx.fillStyle = '#00ff66';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    // Cute triangular drone shell
    ctx.beginPath();
    ctx.moveTo(droneX, droneY - 6);
    ctx.lineTo(droneX + 6, droneY + 4);
    ctx.lineTo(droneX - 6, droneY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Small glowing central lens
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(droneX, droneY + 1, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.cooldown = 0.9;
        this.damage = 26;
        this.description = '공격 사격 쿨다운 단축 및 단거리 레이저 파괴력 강화';
        break;
      case 3:
        this.laserCount = 2; // Fires double lasers!
        this.orbitRadius = 50;
        this.description = '한 번에 2발의 양 갈래 고성능 타격빔 속사';
        break;
      case 4:
        this.damage = 38;
        this.laserRadius = 5.5;
        this.description = '레이저 관통력 증가 및 빔 구경 파괴력 확장';
        break;
      case 5:
        this.laserCount = 3;
        this.cooldown = 0.5;
        this.damage = 50;
        this.description = '마스터 - 나노 드론 센티넬: 3연장 고주파 광선 속사, 초당 피해 극비 사격 메커니즘 완성';
        break;
    }
  }
}

// ----------------------------------------------------
// EVOLVED 1. GIGA PARTICLE ANNIHILATOR (From Plasma Bolt)
// ----------------------------------------------------
export class GigaParticleAnnihilator extends Weapon {
  constructor(player) {
    super(player, 'gigaparticle', '기가 입자 소멸포 [진화]', '플라즈마 볼트와 리액터의 퓨전 결정체. 무한 관통력을 지닌 초거대 에너지 레이저 빔을 주기적으로 방출하여 궤적 상의 모든 것을 소멸시킵니다.');
    this.cooldown = 1.6;
    this.damage = 110;
    this.beamWidth = 35;
    this.beamDuration = 0.6; // Beam active for 0.6s
    this.activeBeam = null;
  }

  fire(enemies) {
    const target = this.getNearestEnemy(enemies);
    if (!target) return false;

    // Fire huge beam in target direction
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const angle = Math.atan2(dy, dx);
    
    this.activeBeam = {
      angle: angle,
      timer: this.beamDuration,
      damage: Math.round(this.damage * this.player.damageMult)
    };

    Sound.playHeavyImpact();
    
    // Trigger screen shake by calling a global if defined or directly player property
    if (this.player.triggerScreenShake) {
      this.player.triggerScreenShake(15, 0.4);
    }
    return true;
  }

  update(dt, enemies) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (this.activeBeam) {
      this.activeBeam.timer -= dt;
      const damage = this.activeBeam.damage;

      const range = 800;
      const cos = Math.cos(this.activeBeam.angle);
      const sin = Math.sin(this.activeBeam.angle);

      // Spawn particles along the beam path
      if (Math.random() < 0.3) {
        for (let d = 50; d < range; d += 80) {
          const bx = this.player.x + cos * d;
          const by = this.player.y + sin * d;
          ParticleSystem.spawnTrail(bx + (Math.random() - 0.5) * 15, by + (Math.random() - 0.5) * 15, '#00f0ff', 6);
        }
      }

      // Deal damage to all enemies inside the beam
      enemies.forEach((enemy) => {
        const ex = enemy.x - this.player.x;
        const ey = enemy.y - this.player.y;

        const projection = ex * cos + ey * sin;
        if (projection > 0 && projection < range) {
          const distToAxis = Math.abs(-ex * sin + ey * cos);
          if (distToAxis < enemy.radius + this.beamWidth / 2) {
            if (!enemy.beamHitTimer) enemy.beamHitTimer = 0;
            if (enemy.beamHitTimer <= 0) {
              enemy.takeDamage(damage, true);
              this.player.trackDamage(this.id, damage);
              enemy.knockback(this.activeBeam.angle, 150);
              enemy.beamHitTimer = 0.15; // Hit every 150ms
            }
          }
        }
      });

      if (this.activeBeam.timer <= 0) {
        this.activeBeam = null;
      }
    }

    // Reset enemy hit timers
    enemies.forEach((enemy) => {
      if (enemy.beamHitTimer > 0) {
        enemy.beamHitTimer -= dt;
      }
    });

    if (this.cooldownTimer <= 0 && !this.activeBeam) {
      const fired = this.fire(enemies);
      if (fired) {
        this.cooldownTimer = this.cooldown;
      }
    }
  }

  draw(ctx) {
    if (!this.activeBeam) return;

    const range = 800;
    const endX = this.player.x + Math.cos(this.activeBeam.angle) * range;
    const endY = this.player.y + Math.sin(this.activeBeam.angle) * range;

    ctx.save();
    
    // Outer glowing beam
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#00f0ff';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.lineWidth = this.beamWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Inner white core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = this.beamWidth * 0.4;
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.restore();
  }
}

// ----------------------------------------------------
// EVOLVED 2. HYPERNOVA AEGIS (From Orbiting Shield)
// ----------------------------------------------------
export class HypernovaAegis extends Weapon {
  constructor(player) {
    super(player, 'hypernovaegis', '초신성 이지스 쉴드 [진화]', '오비탈 쉴드와 아머의 퓨전 결정체. 압도적인 크기의 광역 파괴 광선 칼날 6개가 초고속 공전하여 장벽을 구축하고 적의 접근을 차단합니다.');
    this.cooldown = 0;
    this.damage = 48;
    this.count = 6;
    this.orbitRadius = 90;
    this.orbitSpeed = 3.5; // Extremely fast
    this.angle = 0;
    this.shieldRadius = 15;
  }

  update(dt, enemies) {
    this.angle += this.orbitSpeed * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

    const damage = Math.round(this.damage * this.player.damageMult);

    for (let i = 0; i < this.count; i++) {
      const offset = (i * Math.PI * 2) / this.count;
      const shieldX = this.player.x + Math.cos(this.angle + offset) * this.orbitRadius;
      const shieldY = this.player.y + Math.sin(this.angle + offset) * this.orbitRadius;

      if (Math.random() < 0.25) {
        ParticleSystem.spawnTrail(shieldX, shieldY, '#ff00aa', this.shieldRadius * 0.7);
      }

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy.aegisCooldownTimer && enemy.aegisCooldownTimer[i] > 0) {
          enemy.aegisCooldownTimer[i] -= dt;
          continue;
        }

        const dist = Math.hypot(enemy.x - shieldX, enemy.y - shieldY);
        if (dist < enemy.radius + this.shieldRadius) {
          ParticleSystem.spawnExplosion(enemy.x, enemy.y, '#ff00aa', 6);
          enemy.takeDamage(damage, true);
          this.player.trackDamage(this.id, damage);
          const knockAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
          enemy.knockback(knockAngle, 200);

          if (!enemy.aegisCooldownTimer) enemy.aegisCooldownTimer = {};
          enemy.aegisCooldownTimer[i] = 0.25;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = this.shieldRadius * 3;
    ctx.shadowColor = '#ff00aa';

    // Connecting ring visual
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.18)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < this.count; i++) {
      const offset = (i * Math.PI * 2) / this.count;
      const shieldX = this.player.x + Math.cos(this.angle + offset) * this.orbitRadius;
      const shieldY = this.player.y + Math.sin(this.angle + offset) * this.orbitRadius;

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(shieldX, shieldY, this.shieldRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Blade inner cross lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shieldX - this.shieldRadius * 0.5, shieldY);
      ctx.lineTo(shieldX + this.shieldRadius * 0.5, shieldY);
      ctx.moveTo(shieldX, shieldY - this.shieldRadius * 0.5);
      ctx.lineTo(shieldX, shieldY + this.shieldRadius * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ----------------------------------------------------
// 3. RETRO SYNTH WAVE (Expanding sonic 넉백 rings)
// ----------------------------------------------------
export class RetroSynthWave extends Weapon {
  constructor(player) {
    super(player, 'retrosynthwave', '레트로 신스 웨이브', '플레이어 중심으로 사방으로 확장되는 넉백 음파 파동을 발사합니다.');
    this.cooldown = 2.4;
    this.damage = 12;
    this.range = 100;
    this.pulseCount = 1;
    this.width = 3;
    this.activePulses = [];
  }

  fire(enemies) {
    Sound.playShoot();
    const damage = Math.round(this.damage * this.player.damageMult);
    
    for (let i = 0; i < this.pulseCount; i++) {
      setTimeout(() => {
        if (this.player.isDead) return;
        this.activePulses.push({
          radius: 10,
          maxRadius: this.range,
          speed: 250,
          damage: damage,
          hitEnemies: new Set()
        });
      }, i * 250);
    }
    return true;
  }

  update(dt, enemies) {
    super.update(dt, enemies);

    for (let i = this.activePulses.length - 1; i >= 0; i--) {
      const pulse = this.activePulses[i];
      pulse.radius += pulse.speed * dt;

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (pulse.hitEnemies.has(enemy)) continue;

        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist >= pulse.radius - 12 && dist <= pulse.radius + 12) {
          pulse.hitEnemies.add(enemy);
          enemy.takeDamage(pulse.damage);
          this.player.trackDamage(this.id, pulse.damage);

          const angle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
          enemy.knockback(angle, 180);

          if (this.level >= 4) {
            enemy.speed *= 0.6;
            setTimeout(() => {
              if (enemy) enemy.speed = enemy.type === 'standard' ? 80 : enemy.type === 'speedster' ? 125 : enemy.speed;
            }, 3000);
          }
        }
      }

      if (pulse.radius >= pulse.maxRadius) {
        this.activePulses.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.lineWidth = this.width;
    ctx.shadowBlur = 10;

    for (let i = 0; i < this.activePulses.length; i++) {
      const pulse = this.activePulses[i];
      const alpha = 1.0 - (pulse.radius / pulse.maxRadius);
      ctx.globalAlpha = Math.max(0, alpha);

      ctx.strokeStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';

      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.range = 140;
        this.damage = 18;
        break;
      case 3:
        this.pulseCount = 2;
        this.cooldown = 2.0;
        break;
      case 4:
        this.damage = 25;
        this.width = 4.5;
        break;
      case 5:
        this.pulseCount = 3;
        this.range = 190;
        this.damage = 38;
        break;
    }
  }
}

// ----------------------------------------------------
// 4. QUANTUM VOID RIFT (Vortex micro blackhole)
// ----------------------------------------------------
export class QuantumVoidRift extends Weapon {
  constructor(player) {
    super(player, 'quantumvoidrift', '양자 보이드 균열', '적들 사이에 끌어당기는 블랙홀 포탈을 소환합니다.');
    this.cooldown = 3.6;
    this.damage = 6;
    this.duration = 3.0;
    this.pullForce = 140;
    this.count = 1;
    this.activeRifts = [];
  }

  fire(enemies) {
    if (!enemies || enemies.length === 0) return false;

    const target = this.getNearestEnemy(enemies);
    if (!target) return false;

    Sound.playShoot();

    for (let i = 0; i < this.count; i++) {
      const offsetX = (Math.random() - 0.5) * 80 * (i > 0 ? 1 : 0);
      const offsetY = (Math.random() - 0.5) * 80 * (i > 0 ? 1 : 0);

      this.activeRifts.push({
        x: target.x + offsetX,
        y: target.y + offsetY,
        radius: 45,
        timer: this.duration,
        pullForce: this.pullForce,
        pulseTimer: 0
      });
    }
    return true;
  }

  update(dt, enemies) {
    super.update(dt, enemies);

    for (let i = this.activeRifts.length - 1; i >= 0; i--) {
      const rift = this.activeRifts[i];
      rift.timer -= dt;
      rift.pulseTimer += dt;

      const damage = Math.round(this.damage * this.player.damageMult);

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy.hp <= 0) continue;

        const dx = rift.x - enemy.x;
        const dy = rift.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 180) {
          const pullSpeed = ((180 - dist) / 180) * rift.pullForce;
          const angle = Math.atan2(dy, dx);
          enemy.kbX += Math.cos(angle) * pullSpeed * dt * 2.5;
          enemy.kbY += Math.sin(angle) * pullSpeed * dt * 2.5;

          if (dist < enemy.radius + rift.radius && rift.pulseTimer >= 0.15) {
            enemy.takeDamage(damage);
            this.player.trackDamage(this.id, damage);
          }
        }
      }

      if (rift.pulseTimer >= 0.15) rift.pulseTimer = 0;

      if (rift.timer <= 0) {
        if (this.level >= 4) {
          const finalBlastDamage = Math.round(55 * this.player.damageMult);
          const finalRadius = rift.radius * 1.5;
          ParticleSystem.spawnExplosion(rift.x, rift.y, '#aa00ff', 24);
          Sound.playHeavyImpact();

          for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            const d = Math.hypot(enemy.x - rift.x, enemy.y - rift.y);
            if (d < enemy.radius + finalRadius) {
              enemy.takeDamage(finalBlastDamage);
              this.player.trackDamage(this.id, finalBlastDamage);
            }
          }
        }
        this.activeRifts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (let i = 0; i < this.activeRifts.length; i++) {
      const rift = this.activeRifts[i];
      const pulse = 1 + Math.sin(Date.now() * 0.015) * 0.15;
      const r = rift.radius * pulse;

      ctx.shadowBlur = r * 1.5;
      ctx.shadowColor = '#aa00ff';
      ctx.strokeStyle = '#aa00ff';
      ctx.lineWidth = 3;

      const rot = Date.now() * 0.004;
      ctx.translate(rift.x, rift.y);
      ctx.rotate(rot);

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 1.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 1.2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(10, 5, 20, 0.65)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(-rot);
      ctx.translate(-rift.x, -rift.y);
    }
    ctx.restore();
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.count = 2;
        this.cooldown = 3.2;
        break;
      case 3:
        this.pullForce = 180;
        this.duration = 3.5;
        break;
      case 4:
        this.description = '소멸 시 강력한 다차원 압축 폭발 공격 가산';
        break;
      case 5:
        this.count = 3;
        this.damage = 10;
        this.pullForce = 210;
        break;
    }
  }
}

// ----------------------------------------------------
// 5. PRISMATIC BEAM (Refracting zapping lasers)
// ----------------------------------------------------
export class PrismaticBeam extends Weapon {
  constructor(player) {
    super(player, 'prismaticbeam', '프리즘 굴절기', '적들을 조준 관통하고 격렬하게 주변으로 분광 굴절되는 레이저를 쏩니다.');
    this.cooldown = 1.6;
    this.damage = 22;
    this.refractions = 3;
    this.count = 1;
    this.refractionRange = 160;
  }

  fire(enemies) {
    if (!enemies || enemies.length === 0) return false;

    const startTarget = this.getNearestEnemy(enemies);
    if (!startTarget) return false;

    Sound.playShoot();
    const damage = Math.round(this.damage * this.player.damageMult);

    for (let i = 0; i < this.count; i++) {
      let currentX = this.player.x;
      let currentY = this.player.y;
      let nextTarget = startTarget;
      const chainList = [];
      const hitSet = new Set();

      for (let r = 0; r < this.refractions; r++) {
        if (!nextTarget || nextTarget.hp <= 0) break;
        chainList.push({ x: nextTarget.x, y: nextTarget.y });
        hitSet.add(nextTarget);

        let currentDmg = damage;
        if (this.level >= 4) {
          currentDmg = Math.round(damage * (1 + r * 0.10));
        }
        nextTarget.takeDamage(currentDmg);
        this.player.trackDamage(this.id, currentDmg);

        currentX = nextTarget.x;
        currentY = nextTarget.y;
        let nextBest = null;
        let nextMinDist = Infinity;

        for (let k = 0; k < enemies.length; k++) {
          const cand = enemies[k];
          if (hitSet.has(cand) || cand.hp <= 0) continue;
          const d = Math.hypot(cand.x - currentX, cand.y - currentY);
          if (d < nextMinDist && d < this.refractionRange) {
            nextMinDist = d;
            nextBest = cand;
          }
        }
        nextTarget = nextBest;
      }

      if (chainList.length > 0) {
        let fromX = this.player.x;
        let fromY = this.player.y;

        chainList.forEach((point) => {
          ParticleSystem.spawnExplosion(point.x, point.y, '#00ffcc', 3);
          
          const tx = point.x;
          const ty = point.y;
          const fx = fromX;
          const fy = fromY;

          ParticleSystem.particles.push({
            timer: 0.12,
            update: function(dt) {
              this.timer -= dt;
              return this.timer > 0;
            },
            draw: function(ctx) {
              ctx.save();
              ctx.shadowBlur = 10;
              ctx.shadowColor = '#00ffcc';
              ctx.strokeStyle = '#00ffcc';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(fx, fy);
              ctx.lineTo(tx, ty);
              ctx.stroke();

              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(fx, fy);
              ctx.lineTo(tx, ty);
              ctx.stroke();
              ctx.restore();
            }
          });

          fromX = point.x;
          fromY = point.y;
        });
      }
    }
    return true;
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.refractions = 5;
        this.refractionRange = 190;
        break;
      case 3:
        this.count = 2;
        this.cooldown = 1.35;
        break;
      case 4:
        this.description = '레이저가 굴절 도중 분광될 때마다 데미지가 +10%씩 증폭 가산';
        break;
      case 5:
        this.count = 3;
        this.refractions = 8;
        this.damage = 32;
        break;
    }
  }
}

// ----------------------------------------------------
// 6. NANITE INFECTOR (Hacking digital poison clouds)
// ----------------------------------------------------
export class NaniteInfector extends Weapon {
  constructor(player) {
    super(player, 'naniteinfector', '나노 바이러스 포자', '플레이어 주변을 맴도는 가상 바이러스 안개를 뿜어내 적을 전염시킵니다.');
    this.cooldown = 2.2;
    this.damage = 4;
    this.duration = 4.0;
    this.count = 4;
    this.spores = [];
  }

  fire(enemies) {
    Sound.playShoot();
    
    for (let i = 0; i < this.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 35 + Math.random() * 45;
      this.spores.push({
        x: this.player.x + Math.cos(angle) * radius,
        y: this.player.y + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        lifeTime: this.duration,
        radius: 12
      });
    }
    return true;
  }

  update(dt, enemies) {
    super.update(dt, enemies);

    for (let i = this.spores.length - 1; i >= 0; i--) {
      const spore = this.spores[i];
      spore.lifeTime -= dt;
      spore.x += spore.vx * dt;
      spore.y += spore.vy * dt;

      spore.vx *= Math.pow(0.95, dt * 60);
      spore.vy *= Math.pow(0.95, dt * 60);

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy.hp <= 0) continue;

        const dist = Math.hypot(enemy.x - spore.x, enemy.y - spore.y);
        if (dist < enemy.radius + spore.radius) {
          this.infectEnemy(enemy);
        }
      }

      if (spore.lifeTime <= 0) {
        this.spores.splice(i, 1);
      }
    }

    const damage = Math.round(this.damage * this.player.damageMult);
    for (let j = 0; j < enemies.length; j++) {
      const enemy = enemies[j];
      if (enemy.hp <= 0) continue;

      if (enemy.naniteInfected) {
        if (!enemy.naniteTickTimer) enemy.naniteTickTimer = 0;
        enemy.naniteTickTimer += dt;

        if (enemy.naniteTickTimer >= 0.25) {
          enemy.naniteTickTimer = 0;
          enemy.takeDamage(damage);
          this.player.trackDamage(this.id, damage);
          
          if (Math.random() < 0.20) {
            ParticleSystem.spawnTrail(enemy.x, enemy.y, '#00ff66', enemy.radius * 0.4);
          }

          if (enemy.hp <= 0 && this.level >= 4) {
            this.spreadInfectionOnDeath(enemy, enemies);
          }
        }
      }
    }
  }

  infectEnemy(enemy) {
    if (enemy.naniteInfected) return;
    enemy.naniteInfected = true;
    enemy.naniteTickTimer = 0;
    
    enemy.originalSpeed = enemy.speed;
    enemy.speed *= 0.8;
    
    if (this.level >= 5) {
      if (enemy.armor) enemy.armor *= 0.5;
    }
  }

  spreadInfectionOnDeath(deadEnemy, enemies) {
    let infectCount = 0;
    const spreadLimit = 3;

    const candidates = enemies
      .filter(e => e !== deadEnemy && e.hp > 0 && !e.naniteInfected)
      .map(e => ({ enemy: e, dist: Math.hypot(e.x - deadEnemy.x, e.y - deadEnemy.y) }))
      .sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < candidates.length; i++) {
      if (infectCount >= spreadLimit || candidates[i].dist > 180) break;
      this.infectEnemy(candidates[i].enemy);
      infectCount++;
      ParticleSystem.spawnExplosion(candidates[i].enemy.x, candidates[i].enemy.y, '#00ff66', 4);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.lineWidth = 1.5;

    for (let i = 0; i < this.spores.length; i++) {
      const spore = this.spores[i];
      const alpha = Math.min(1.0, spore.lifeTime / 1.0);
      ctx.globalAlpha = Math.max(0, alpha);

      ctx.shadowBlur = spore.radius * 2;
      ctx.shadowColor = '#00ff66';
      ctx.fillStyle = 'rgba(0, 255, 102, 0.18)';
      ctx.strokeStyle = '#00ff66';

      ctx.beginPath();
      ctx.arc(spore.x, spore.y, spore.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const orbitalAngle = Date.now() * 0.007 + i;
      const ex = spore.x + Math.cos(orbitalAngle) * (spore.radius * 0.7);
      const ey = spore.y + Math.sin(orbitalAngle) * (spore.radius * 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  onLevelUp() {
    switch (this.level) {
      case 2:
        this.count = 7;
        this.duration = 4.8;
        break;
      case 3:
        this.damage = 7;
        this.cooldown = 1.8;
        break;
      case 4:
        this.description = '감염된 적 사망 시 주변 적 최대 3명에게 나노 감염 자동 전이';
        break;
      case 5:
        this.damage = 11;
        this.count = 9;
        this.description = '마스터 - 역병 포자: 데미지 대폭 가산 및 전염된 적 방어력 50% 삭감';
        break;
    }
  }
}

// ----------------------------------------------------
// EVOLVED 3. SUBWOOFER RESONANCE GRID (From Retro Synth Wave)
// ----------------------------------------------------
export class SubwooferResonanceGrid extends Weapon {
  constructor(player) {
    super(player, 'subwooferresonance', '서브우퍼 오디오 스펙트럼 [진화]', '레트로 신스 웨이브와 강력 자석의 융합체. 주변에 음악 이퀄라이저 신호 파동이 상시 출렁이며 적들의 방어망을 가산 붕괴시킵니다.');
    this.cooldown = 0;
    this.damage = 16;
    this.radius = 180;
    this.pulseTimer = 0;
  }

  update(dt, enemies) {
    this.pulseTimer += dt;
    const damage = Math.round(this.damage * this.player.damageMult);

    if (this.pulseTimer >= 0.12) {
      this.pulseTimer = 0;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.hp <= 0) continue;

        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < this.radius) {
          if (enemy.armor) enemy.armor = Math.max(0, enemy.armor - 0.1);

          const knockAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
          enemy.knockback(knockAngle, 24 * (1.2 - dist/this.radius));

          enemy.takeDamage(damage, true);
          this.player.trackDamage(this.id, damage);

          if (Math.random() < 0.12) {
            ParticleSystem.spawnTrail(enemy.x, enemy.y, '#ff00aa', enemy.radius * 0.5);
          }
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    const time = Date.now() * 0.008;
    const beat = 1 + Math.sin(time) * 0.08;

    ctx.shadowBlur = this.radius * 0.25;
    ctx.shadowColor = '#ff00aa';
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.25)';
    ctx.lineWidth = 2.5;

    const bars = 24;
    for (let i = 0; i < bars; i++) {
      const angle = (i * Math.PI * 2) / bars;
      const height = (this.radius * 0.65) + Math.sin(time + i) * (this.radius * 0.25);
      
      const startX = Math.cos(angle) * (this.radius * 0.4);
      const startY = Math.sin(angle) * (this.radius * 0.4);
      const endX = Math.cos(angle) * height * beat;
      const endY = Math.sin(angle) * height * beat;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// ----------------------------------------------------
// EVOLVED 4. EVENT HORIZON GLITCH (From Quantum Void Rift)
// ----------------------------------------------------
export class EventHorizonGlitch extends Weapon {
  constructor(player) {
    super(player, 'eventhorizonglitch', '사건의 지평선 글리치 [진화]', '양자 보이드 균열과 부스터 신발의 융합체. 화면 스케일의 메가 블랙홀을 형성하여 적들을 강제 압사시키고 코드를 정지시켜 결빙시킵니다.');
    this.cooldown = 6.5;
    this.damage = 15;
    this.duration = 4.5;
    this.activeHole = null;
  }

  fire(enemies) {
    if (!enemies || enemies.length === 0) return false;

    const target = this.getNearestEnemy(enemies);
    if (!target) return false;

    Sound.playHeavyImpact();
    this.activeHole = {
      x: target.x,
      y: target.y,
      radius: 200,
      timer: this.duration,
      pulseTimer: 0
    };
    return true;
  }

  update(dt, enemies) {
    super.update(dt, enemies);

    if (this.activeHole) {
      const hole = this.activeHole;
      hole.timer -= dt;
      hole.pulseTimer += dt;

      const damage = Math.round(this.damage * this.player.damageMult);

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy.hp <= 0 || enemy.type === 'boss') continue;

        const dx = hole.x - enemy.x;
        const dy = hole.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 420) {
          const force = ((420 - dist) / 420) * 350;
          const angle = Math.atan2(dy, dx);
          enemy.kbX += Math.cos(angle) * force * dt * 3.5;
          enemy.kbY += Math.sin(angle) * force * dt * 3.5;

          if (dist < enemy.radius + 80 && hole.pulseTimer >= 0.15) {
            enemy.takeDamage(damage, true);
            this.player.trackDamage(this.id, damage);
          }
        }
      }

      if (hole.pulseTimer >= 0.15) hole.pulseTimer = 0;

      if (hole.timer <= 0) {
        Sound.playHeavyImpact();
        ParticleSystem.spawnExplosion(hole.x, hole.y, '#aa00ff', 35);

        const implosionDmg = Math.round(200 * this.player.damageMult);
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (enemy.hp <= 0) continue;

          const dist = Math.hypot(enemy.x - hole.x, enemy.y - hole.y);
          if (dist < 260) {
            enemy.takeDamage(implosionDmg, true);
            this.player.trackDamage(this.id, implosionDmg);

            enemy.speed = 0;
            // [Phase A.3] Use frozenUntil (gameTime threshold), spec-compliant.
            const nowSec = (typeof performance !== 'undefined') ? performance.now() / 1000 : Date.now() / 1000;
            enemy.frozenUntil = nowSec + 3.0;
            
            ParticleSystem.spawnExplosion(enemy.x, enemy.y, '#00ffcc', 4);
          }
        }

        this.activeHole = null;
      }
    }
  }

  draw(ctx) {
    if (!this.activeHole) return;

    const hole = this.activeHole;
    ctx.save();
    ctx.shadowBlur = hole.radius * 0.75;
    ctx.shadowColor = '#aa00ff';

    ctx.strokeStyle = 'rgba(170, 0, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, 420 * (1.0 - (hole.timer / this.duration)), 0, Math.PI * 2);
    ctx.stroke();

    const rot = Date.now() * 0.005;
    ctx.translate(hole.x, hole.y);
    ctx.rotate(rot);

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.rect(-100, -100, 200, 200);
    ctx.stroke();

    ctx.strokeStyle = '#aa00ff';
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0a0514';
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ----------------------------------------------------
// EVOLVED 5. PRISM CASCADE OVERLORD (From Prismatic Beam)
// ----------------------------------------------------
export class PrismCascadeOverlord extends Weapon {
  constructor(player) {
    super(player, 'prismcascade', '초신성 레인보우 프리즘 [진화]', '프리즘 굴절기와 오버차지 리액터의 융합체. 4개의 거대 무지개 레이저 기둥이 전장을 상시 소탕하며, 닿는 모든 장벽에서 무지개 굴절 유도탄을 튕겨내 격쇄합니다.');
    this.cooldown = 0;
    this.damage = 38;
    this.angle = 0;
    this.spinSpeed = 0.55;
    this.beamWidth = 20;
    this.tickTimer = 0;
  }

  update(dt, enemies) {
    this.angle += this.spinSpeed * dt;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

    this.tickTimer += dt;
    const damage = Math.round(this.damage * this.player.damageMult);

    if (this.tickTimer >= 0.15) {
      this.tickTimer = 0;
      const range = 750;

      for (let b = 0; b < 4; b++) {
        const laserAngle = this.angle + (b * Math.PI / 2);
        const cos = Math.cos(laserAngle);
        const sin = Math.sin(laserAngle);

        enemies.forEach((enemy) => {
          if (enemy.hp <= 0) return;
          const ex = enemy.x - this.player.x;
          const ey = enemy.y - this.player.y;

          const projection = ex * cos + ey * sin;
          if (projection > 0 && projection < range) {
            const distToAxis = Math.abs(-ex * sin + ey * cos);
            if (distToAxis < enemy.radius + this.beamWidth / 2) {
              enemy.takeDamage(damage, true);
              this.player.trackDamage(this.id, damage);
              enemy.knockback(laserAngle, 100);

              if (Math.random() < 0.18) {
                this.spawnRefractedShard(enemy.x, enemy.y, laserAngle);
              }
            }
          }
        });
      }
    }
  }

  spawnRefractedShard(x, y, baseAngle) {
    const shardAngle = baseAngle + (Math.random() - 0.5) * 1.5;
    const speed = 400;
    const vx = Math.cos(shardAngle) * speed;
    const vy = Math.sin(shardAngle) * speed;

    activeProjectiles.push(new Projectile(
      x,
      y,
      vx,
      vy,
      3.5,
      Math.round(15 * this.player.damageMult),
      { pierce: 3, color: '#00ffcc', weaponId: this.id, isEvolution: true }
    ));
  }

  draw(ctx) {
    ctx.save();
    const range = 750;

    for (let b = 0; b < 4; b++) {
      const laserAngle = this.angle + (b * Math.PI / 2);
      const endX = this.player.x + Math.cos(laserAngle) * range;
      const endY = this.player.y + Math.sin(laserAngle) * range;

      ctx.shadowBlur = 15;
      const colors = ['#ff0055', '#ff9900', '#00ff66', '#00f0ff'];
      ctx.shadowColor = colors[b];
      ctx.strokeStyle = colors[b];
      ctx.lineWidth = this.beamWidth;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = this.beamWidth * 0.35;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ----------------------------------------------------
// EVOLVED 6. CYBERNETIC ZOMBIE OVERLORD (From Nanite Infector)
// ----------------------------------------------------
export class CyberneticZombieOverlord extends Weapon {
  constructor(player) {
    super(player, 'cyberneticzombie', '가상 좀비 네트워크 [진화]', '나노 바이러스 포자와 나노 아머의 융합체. 감염되어 죽은 모든 적을 디지털 해킹하여 아군 디바이스로 변환시킵니다.');
    this.cooldown = 0;
    this.damage = 0;
    this.zombies = [];
  }

  update(dt, enemies) {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.lifeTime -= dt;

      let closestEnemy = null;
      let minDist = Infinity;

      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (e.hp <= 0 || e.naniteInfectedZombie) continue;
        const d = Math.hypot(e.x - z.x, e.y - z.y);
        if (d < minDist) {
          minDist = d;
          closestEnemy = e;
        }
      }

      if (closestEnemy) {
        const dx = closestEnemy.x - z.x;
        const dy = closestEnemy.y - z.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 2) {
          z.x += (dx / dist) * z.speed * dt;
          z.y += (dy / dist) * z.speed * dt;
        }

        if (dist < z.radius + closestEnemy.radius) {
          const dmg = Math.round(30 * this.player.damageMult);
          closestEnemy.takeDamage(dmg, true);
          this.player.trackDamage(this.id, dmg);
          
          const angle = Math.atan2(closestEnemy.y - z.y, closestEnemy.x - z.x);
          closestEnemy.knockback(angle, 150);

          z.lifeTime = 0;
        }
      }

      if (Math.random() < 0.15) {
        ParticleSystem.spawnTrail(z.x, z.y, '#00ff66', z.radius * 0.7);
      }

      if (z.lifeTime <= 0) {
        Sound.playHeavyImpact();
        ParticleSystem.spawnExplosion(z.x, z.y, '#00ff66', 15);

        const gasDamage = Math.round(75 * this.player.damageMult);
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - z.x, e.y - z.y);
          if (d < e.radius + 90) {
            e.takeDamage(gasDamage, true);
            this.player.trackDamage(this.id, gasDamage);

            e.naniteInfected = true;
            e.infected = true;
            e.naniteTickTimer = 0;
          }
        }

        this.zombies.splice(i, 1);
      }
    }
  }

  spawnHackedZombie(x, y, radius, speed, type) {
    if (this.zombies.length >= 15) return;

    this.zombies.push({
      x: x,
      y: y,
      radius: radius,
      speed: speed * 1.5,
      type: type,
      lifeTime: 5.0,
      color: '#00ff66'
    });
  }

  draw(ctx) {
    ctx.save();
    for (let i = 0; i < this.zombies.length; i++) {
      const z = this.zombies[i];

      ctx.shadowBlur = z.radius * 2;
      ctx.shadowColor = z.color;
      ctx.strokeStyle = z.color;
      ctx.fillStyle = 'rgba(10, 22, 12, 0.85)';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.fillStyle = z.color;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', z.x, z.y - z.radius - 8);
      ctx.restore();
    }
    ctx.restore();
  }
}


