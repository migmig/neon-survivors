// --- Player Entity Class (Volt, Guardian, Glitch character classes) ---

import { Sound } from '../systems/Sound.js';
import { ParticleSystem } from '../systems/Particle.js';

export class Player {
  constructor(x, y, characterType = 'volt') {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.characterType = characterType; // 'volt', 'shield' (Guardian), 'glitch'
    
    // Core states
    this.isDead = false;
    this.hitTimer = 0; // Visual flash when hit
    this.chips = 0; // Collected chips in current run
    
    // Unique character passive timers
    this.voltOverdriveTimer = 0;
    this.barrierTimer = 0;
    this.barrierCooldown = 0;

    // Initialize weapon damage tracking for endgame DPS summaries
    this.weaponDps = {
      plasmabolt: 0,
      orbitingshield: 0,
      lightningstrike: 0,
      neonfiretrail: 0,
      cyberdrone: 0,
      retrosynthwave: 0,
      quantumvoidrift: 0,
      prismaticbeam: 0,
      naniteinfector: 0,
      gigaparticle: 0,
      hypernovaegis: 0,
      subwooferresonance: 0,
      eventhorizonglitch: 0,
      prismcascade: 0,
      cyberneticzombie: 0
    };

    // Load Meta-Progression upgrades levels from localStorage
    const metaData = JSON.parse(localStorage.getItem('neon_survivors_meta_data') || '{}');
    this.metaLevels = {
      damage: metaData.damage || 0,
      hp: metaData.hp || 0,
      magnet: metaData.magnet || 0,
      speed: metaData.speed || 0,
      armor: metaData.armor || 0,
      regen: metaData.regen || 0,
      xpGain: metaData.xpGain || 0,
      chipGain: metaData.chipGain || 0,
      luck: metaData.luck || 0,
      critChance: metaData.critChance || 0,
      critDamage: metaData.critDamage || 0,
      cooldown: metaData.cooldown || 0,
      dodge: metaData.dodge || 0,
      lifesteal: metaData.lifesteal || 0,
      reflect: metaData.reflect || 0,
      revive: metaData.revive || 0,
      startShield: metaData.startShield || 0,
      projSpeed: metaData.projSpeed || 0,
      projSize: metaData.projSize || 0,
      pierce: metaData.pierce || 0,
      area: metaData.area || 0,
      duration: metaData.duration || 0,
      multishot: metaData.multishot || 0,
      bossDmg: metaData.bossDmg || 0
    };

    // Initialize character specific base stats
    this.initCharacterStats();
  }

  initCharacterStats() {
    let baseMaxHp = 100;
    let baseSpeed = 180;
    let baseMagnet = 80;
    let baseArmor = 0;
    let baseDamageMult = 1.0;

    switch (this.characterType) {
      case 'volt':
        baseMaxHp = 100; // Volt HP boost (from 85)
        baseSpeed = 220; 
        baseArmor = 1.0; // Volt gains baseline starting armor
        this.color = '#00f0ff'; // Glowing Cyan
        break;

      case 'shield': // Represents "Guardian"
        baseMaxHp = 150; // Guardian HP boost (from 120)
        baseSpeed = 162; 
        baseArmor = 3.0; // Guardian starts with stronger armor (from 2.0)
        this.color = '#ff00aa'; // Glowing Pink
        break;

      case 'glitch':
        baseMaxHp = 120; // Glitch HP boost (from 100)
        baseSpeed = 180;
        baseMagnet = 92; 
        baseArmor = 1.0; // Glitch gains baseline starting armor
        baseDamageMult = 1.15; 
        this.color = '#00ff66'; // Glowing Mint Green
        break;

      default:
        baseArmor = 1.0;
        this.color = '#00f0ff';
        break;
    }

    // Apply Meta permanent shop levels dynamically on top of character statistics
    this.maxHp = baseMaxHp + this.metaLevels.hp * 10;
    this.hp = this.maxHp;
    this.speed = baseSpeed * (1 + this.metaLevels.speed * 0.05); // +5% speed per permanent level
    this.magnet = baseMagnet * (1 + this.metaLevels.magnet * 0.15); // +15% magnet range per permanent level
    // Armor is intentionally modest — final mitigation has a percentage cap
    // applied in takeDamage(), so flat armor can never reduce a hit below
    // ~15% of its raw value. That keeps the player vulnerable late game.
    this.armor = baseArmor + this.metaLevels.hp * 0.15 + this.metaLevels.armor * 0.5;
    this.damageMult = baseDamageMult * (1 + this.metaLevels.damage * 0.04);

    // Newly added meta effects. Tuned so a fully maxed shop doesn't make the
    // player effectively immortal.
    this.regenPerSec = this.metaLevels.regen * 0.12;
    this.xpGainMult = 1 + this.metaLevels.xpGain * 0.06;
    this.chipDropMult = 1 + this.metaLevels.chipGain * 0.05;
    this.luckMult = 1 + this.metaLevels.luck * 0.04;
    this.critChance = Math.min(0.65, this.metaLevels.critChance * 0.03);
    this.critDamageMult = 1.5 + this.metaLevels.critDamage * 0.25;
    this.cooldownMult = Math.max(0.6, 1 - this.metaLevels.cooldown * 0.03);
    this.dodgeChance = Math.min(0.35, this.metaLevels.dodge * 0.012);
    this.lifestealRate = this.metaLevels.lifesteal * 0.0025;
    this.reflectPct = this.metaLevels.reflect * 0.02;
    this.revivesLeft = this.metaLevels.revive; // 1 revive per level
    this.projectileSpeedMult = 1 + this.metaLevels.projSpeed * 0.05;
    this.projectileSizeMult = 1 + this.metaLevels.projSize * 0.04;
    this.extraPierce = this.metaLevels.pierce;
    this.areaMult = 1 + this.metaLevels.area * 0.05;
    this.durationMult = 1 + this.metaLevels.duration * 0.06;
    this.multishotChance = Math.min(0.9, this.metaLevels.multishot * 0.03);
    this.bossDmgMult = 1 + this.metaLevels.bossDmg * 0.05;

    // Start-of-run invulnerability shield (reuses Guardian barrierTimer field).
    if (this.metaLevels.startShield > 0) {
      this.barrierTimer = this.metaLevels.startShield * 1.0;
    }

    // Progression variables
    this.xp = 0;
    this.level = 1;
    this.xpNeeded = 80;
    
    // Weapon & Passive lists
    this.weapons = [];
    this.passives = {
      speed: 0,
      magnet: 0,
      armor: 0,
      damage: 0
    };
  }

  // Calculate XP requirement for the next level
  calculateXpNeeded() {
    return Math.floor(60 + Math.pow(this.level, 1.4) * 25);
  }

  // Accumulate DPS logs
  trackDamage(weaponId, amount) {
    if (!this.weaponDps) this.weaponDps = {};

    // Strip evolved suffixes for cleaner grouping if needed, or group individually
    this.weaponDps[weaponId] = (this.weaponDps[weaponId] || 0) + amount;

    // [Phase A.2] Also accumulate on the originating weapon instance.
    if (this.weapons) {
      for (let i = 0; i < this.weapons.length; i++) {
        if (this.weapons[i].id === weaponId) {
          this.weapons[i].totalDamageDealt = (this.weapons[i].totalDamageDealt || 0) + amount;
          break;
        }
      }
    }

    // Lifesteal: silently heal a fraction of damage dealt.
    if (this.lifestealRate > 0 && !this.isDead) {
      const heal = amount * this.lifestealRate;
      this.hp = Math.min(this.maxHp, this.hp + heal);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;

    // Dodge: chance to fully negate.
    if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
      ParticleSystem.spawnDamageText(this.x, this.y - 22, 'DODGE!', '#7fff7f');
      return;
    }

    // Apply armor reduction. Capped so stacked armor can never wipe out more
    // than 85% of an incoming hit — without this, fully-maxed shop builds
    // could reduce every enemy contact to 1 damage and then heal it back.
    const minFloor = Math.max(1, Math.round(amount * 0.15));
    const armored = Math.round(amount - this.armor);
    const finalDamage = Math.max(minFloor, armored);

    // Trigger Guardian Absolute Barrier if conditions are met
    if (this.characterType === 'shield' && this.barrierCooldown <= 0 && (this.hp - finalDamage) / this.maxHp <= 0.20 && this.hp > 0) {
      this.barrierTimer = 3.0; // 3 seconds invulnerable
      this.barrierCooldown = 60.0; // 60s cooldown
      ParticleSystem.spawnDamageText(this.x, this.y - 45, '🛡️ ABSOLUTE SHIELD! 🛡️', '#ff00aa');
      ParticleSystem.spawnExplosion(this.x, this.y, '#ff00aa', 15);
    }

    // Ignore damage if barrier is active
    if (this.barrierTimer > 0) {
      ParticleSystem.spawnDamageText(this.x, this.y, 'IMMUNE', '#ffffff');
      return;
    }

    this.hp = Math.max(0, this.hp - finalDamage);
    this.hitTimer = 0.15; // Flash player for 0.15s

    // Reflect: cache reflect damage so main.js / weapons can deal it back to
    // nearby enemies on the next update (Player has no enemy ref here).
    if (this.reflectPct > 0) {
      this.pendingReflectDmg = (this.pendingReflectDmg || 0) + finalDamage * this.reflectPct;
    }

    // Spawn a damage floating text indicator
    ParticleSystem.spawnDamageText(this.x, this.y, `-${finalDamage}`, '#ff0055');

    // Play SFX
    Sound.playHit();

    if (this.hp <= 0) {
      // Revive: use one charge if available.
      if (this.revivesLeft > 0) {
        this.revivesLeft--;
        this.hp = Math.round(this.maxHp * 0.5);
        this.barrierTimer = 2.5; // brief invuln after revive
        ParticleSystem.spawnDamageText(this.x, this.y - 50, '♻️ BACKUP CORE ACTIVATED ♻️', '#ffd700');
        ParticleSystem.spawnExplosion(this.x, this.y, '#ffd700', 24);
        Sound.playLevelUp();
        return;
      }
      this.isDead = true;
      Sound.playDefeat();
    }
  }

  gainXp(amount) {
    if (this.isDead) return false;

    // XP gain multiplier from meta upgrade
    const scaled = Math.round(amount * (this.xpGainMult || 1));
    this.xp += scaled;
    let leveledUp = false;
    
    while (this.xp >= this.xpNeeded) {
      this.xp -= this.xpNeeded;
      this.level++;
      this.xpNeeded = this.calculateXpNeeded();
      leveledUp = true;
      
      // Heal 35% max HP on level up as a nice reward (increased from 20% for easier playability)
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.35));
      
      // Spawn flashy green level up shockwave
      ParticleSystem.spawnLevelUpShockwave(this.x, this.y);
      
      // Play level-up sound
      Sound.playLevelUp();

      // Trigger Volt speed overdrive passive on level up
      if (this.characterType === 'volt') {
        this.voltOverdriveTimer = 5.0; // 5 seconds boost
        ParticleSystem.spawnDamageText(this.x, this.y - 45, '⚡ OVERDRIVE ACTIVE! ⚡', '#00f0ff');
      }
    }
    
    return leveledUp;
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    ParticleSystem.spawnDamageText(this.x, this.y, `+${amount}`, '#00ff66');
  }

  applyUpgrade(upgrade) {
    Sound.playUpgrade();
    
    if (upgrade.type === 'weapon') {
      const activeWeapon = this.weapons.find(w => w.id === upgrade.id);
      if (activeWeapon) {
        activeWeapon.levelUp();
      } else {
        const WeaponClass = upgrade.weaponClass;
        this.weapons.push(new WeaponClass(this));
      }
    } else if (upgrade.type === 'passive') {
      this.passives[upgrade.id]++;
      
      // Apply stat changes (boosted for satisfying high-impact gameplay)
      switch (upgrade.id) {
        case 'speed':
          // speed passive stacks +15%
          this.speed = (this.characterType === 'volt' ? 216 : this.characterType === 'shield' ? 162 : 180) * 
                       (1 + this.metaLevels.speed * 0.05) * (1 + this.passives.speed * 0.15);
          break;
        case 'magnet':
          this.magnet = (this.characterType === 'glitch' ? 92 : 80) * 
                        (1 + this.metaLevels.magnet * 0.15) * (1 + this.passives.magnet * 0.30);
          break;
        case 'armor':
          this.armor = (this.characterType === 'shield' ? 2.0 : 0) + 
                       this.metaLevels.hp * 0.5 + this.passives.armor * 2.0;
          break;
        case 'damage':
          this.damageMult = (this.characterType === 'glitch' ? 1.15 : 1.0) * 
                            (1 + this.metaLevels.damage * 0.04) * (1 + this.passives.damage * 0.20);
          break;
      }
    }
  }

  update(dt, input, mapWidth, mapHeight, enemies) {
    if (this.isDead) return;

    // Decrement visual hit timer
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
    }

    // Tick unique character passive timers
    if (this.voltOverdriveTimer > 0) {
      this.voltOverdriveTimer -= dt;
    }
    if (this.barrierTimer > 0) {
      this.barrierTimer -= dt;
    }
    if (this.barrierCooldown > 0) {
      this.barrierCooldown -= dt;
    }

    // HP regeneration from meta upgrade (silent, no floaty text).
    if (this.regenPerSec > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenPerSec * dt);
    }

    // Apply pending reflect damage to the nearest enemy in range.
    if (this.pendingReflectDmg && enemies && enemies.length > 0) {
      let best = null;
      let bestDist = 220 * 220; // squared
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.hp <= 0) continue;
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) { bestDist = d2; best = e; }
      }
      if (best) {
        best.takeDamage(this.pendingReflectDmg);
        ParticleSystem.spawnDamageText(best.x, best.y - 12, `↩ ${Math.round(this.pendingReflectDmg)}`, '#a0c4ff');
      }
      this.pendingReflectDmg = 0;
    }

    // Handle movement physics
    const move = input.getMovementVector();
    
    // Volt passive acceleration factor
    let currentSpeed = this.speed;
    if (this.characterType === 'volt' && this.voltOverdriveTimer > 0) {
      currentSpeed *= 1.25; // Volt overdrive is +25% speed burst!
      
      // Spawn cyan speed sparks
      if (Math.random() < 0.18) {
        ParticleSystem.spawnTrail(this.x, this.y, '#00f0ff', this.radius * 0.65);
      }
    }

    // [Phase D.6] codeLag debuff: -30% movement and fire-rate while active.
    const nowSec = (typeof performance !== 'undefined') ? performance.now() / 1000 : Date.now() / 1000;
    const codeLagActive = this._codeLagUntil && this._codeLagUntil > nowSec;
    const speedMult = codeLagActive ? 0.7 : 1.0;
    const fireDt = codeLagActive ? dt * 0.7 : dt;

    this.x += move.x * currentSpeed * speedMult * dt;
    this.y += move.y * currentSpeed * speedMult * dt;

    // Clamp inside map boundaries (with circular room padding)
    const margin = this.radius + 10;
    this.x = Math.max(margin, Math.min(mapWidth - margin, this.x));
    this.y = Math.max(margin, Math.min(mapHeight - margin, this.y));

    // Update active weapons
    for (let i = 0; i < this.weapons.length; i++) {
      this.weapons[i].update(fireDt, enemies);
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    
    // Neon Ambient Underglow
    ctx.shadowBlur = this.radius * 2.5;
    ctx.shadowColor = this.color;
    
    // Core player body
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    // Flash white when hit, otherwise glowing cyan
    if (this.hitTimer > 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.color;
    }
    ctx.fill();

    // High tech details (glowing inner white core ring)
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();

    // Render Guardian Invulnerable shield visual circle
    if (this.characterType === 'shield' && this.barrierTimer > 0) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff00aa';
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 2.5;
      
      // Draw outer rotating barrier bars
      const rotation = Date.now() * 0.005;
      ctx.translate(this.x, this.y);
      ctx.rotate(rotation);
      
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, Math.PI, Math.PI * 1.4);
      ctx.stroke();
      
      ctx.restore();
    }
  }
}
