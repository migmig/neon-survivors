// --- XP Gem & Dynamic Pickup Entities (Gems, Chips, Heals, Evocores) ---

import { ParticleSystem } from '../systems/Particle.js';

export class Gem {
  constructor(x, y, xpValue = 10, tier = 1, type = 'gem') {
    this.x = x;
    this.y = y;
    this.xpValue = xpValue;
    this.tier = tier; // Tier 1: Blue, Tier 2: Pink, Tier 3: Green
    this.type = type; // 'gem', 'chip', 'heal', 'evocore'
    this.radius = 4 + tier * 1.5;
    
    // Setup specific styling depending on Type
    if (this.type === 'gem') {
      if (tier === 1) {
        this.color = '#00f0ff'; // Cyan
      } else if (tier === 2) {
        this.color = '#ff00aa'; // Pink
      } else {
        this.color = '#00ff66'; // Green
      }
      this.radius = 4 + tier * 1.5;
    } else if (this.type === 'chip') {
      this.color = '#ffd700'; // Gold/Yellow (Data Chip)
      this.radius = 5.5;
    } else if (this.type === 'heal') {
      this.color = '#ff0055'; // Red/Hot Pink (Health Pack)
      this.radius = 6.5;
    } else if (this.type === 'evocore') {
      this.color = '#ff8c00'; // Neon Orange (Evolution Core)
      this.radius = 8;
    }

    this.vx = 0;
    this.vy = 0;
    this.magnetized = false;
    this.collected = false;
  }

  update(dt, player) {
    if (this.collected) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 1. Check if player has grabbed the pickup
    if (dist < player.radius + this.radius) {
      this.collected = true;
      
      // Perform action based on pickup type
      if (this.type === 'gem') {
        player.gainXp(this.xpValue);
      } else if (this.type === 'chip') {
        player.chips = (player.chips || 0) + 1;
      } else if (this.type === 'heal') {
        player.heal(30);
      } else if (this.type === 'evocore') {
        player.triggerEvolution = true;
      }
      
      // Spawn small collecting sparkles
      ParticleSystem.spawnTrail(this.x, this.y, this.color, this.radius * 0.8);
      return;
    }

    // 2. Magnet Pull Physics (Gems are pulled, Evocores & other items also support magnet pull)
    // Note: player.magnet is the magnet pull radius
    if (dist < player.magnet) {
      this.magnetized = true;
    }

    if (this.magnetized) {
      // Accelerating pull physics
      const pullForce = (player.magnet - dist) / player.magnet; // Higher force as it gets closer
      const speed = 180 + pullForce * 400; // Pull speed ranges from 180 to 580
      
      const angle = Math.atan2(dy, dx);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  draw(ctx) {
    if (this.collected) return;

    ctx.save();
    ctx.shadowBlur = this.radius * 3;
    ctx.shadowColor = this.color;
    
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    if (this.type === 'gem') {
      ctx.save();
      ctx.translate(this.x, this.y);
      const angle = (Date.now() * 0.005) + this.xpValue; // Speed varies slightly by XP value
      ctx.rotate(angle);

      // Draw spinning crystal diamond shape on Canvas
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius * 0.65, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bright inner white core (highly visible over dark maps and hollow enemies!)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.type === 'chip') {
      ctx.save();
      ctx.translate(this.x, this.y);
      const angle = -(Date.now() * 0.003);
      ctx.rotate(angle);

      // Draw dynamic retro data chip golden coin
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Microchip gold pattern inside with a shiny white center
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(-this.radius * 0.45, -this.radius * 0.45, this.radius * 0.9, this.radius * 0.9);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-this.radius * 0.2, -this.radius * 0.2, this.radius * 0.4, this.radius * 0.4);
      ctx.restore();
    } else if (this.type === 'heal') {
      // Draw neon medical cross
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(this.x - this.radius, this.y - 2.5, this.radius * 2, 5);
      ctx.rect(this.x - 2.5, this.y - this.radius, 5, this.radius * 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'evocore') {
      // Draw premium pulsing orange pentagonal core
      const pulse = 1 + Math.sin(Date.now() * 0.015) * 0.18;
      ctx.translate(this.x, this.y);
      ctx.scale(pulse, pulse);
      
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = Math.cos(angle) * this.radius;
        const py = Math.sin(angle) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner white fusion core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
