// --- High Performance Neon Particle System ---

class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx ?? (Math.random() - 0.5) * (options.speed ?? 100);
    this.vy = options.vy ?? (Math.random() - 0.5) * (options.speed ?? 100);
    this.size = options.size ?? Math.random() * 3 + 2;
    this.originalSize = this.size;
    this.color = options.color ?? '#00f0ff';
    this.alpha = 1;
    this.decay = options.decay ?? Math.random() * 0.8 + 0.8; // alpha drop per second
    this.glow = options.glow ?? true;
    this.friction = options.friction ?? 0.96; // slows down over time
    this.gravity = options.gravity ?? 0;
    this.type = options.type ?? 'circle'; // circle, square, text, trail
    this.text = options.text ?? '';
    this.font = options.font ?? 'bold 12px Orbitron';
  }

  update(dt) {
    this.vx *= Math.pow(this.friction, dt * 60);
    this.vy *= Math.pow(this.friction, dt * 60);
    this.vy += this.gravity * dt;
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    this.alpha -= this.decay * dt;
    if (this.type === 'circle' || this.type === 'square') {
      this.size = Math.max(0.1, this.originalSize * this.alpha);
    }
    return this.alpha > 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);

    if (this.glow) {
      ctx.shadowBlur = this.size * 3;
      ctx.shadowColor = this.color;
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'square') {
      ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
    } else if (this.type === 'trail') {
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.08, this.y - this.vy * 0.08);
      ctx.stroke();
    } else if (this.type === 'text') {
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.font = this.font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x, this.y);
    }

    ctx.restore();
  }
}

class ParticleManager {
  constructor() {
    this.particles = [];
  }

  clear() {
    this.particles = [];
  }

  // Neon explosion on enemy defeat
  spawnExplosion(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 80;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        decay: Math.random() * 1.2 + 0.8,
        friction: 0.95
      }));
    }
  }

  // Spark trail for projectiles
  spawnTrail(x, y, color, size = 3) {
    this.particles.push(new Particle(x, y, {
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      size: size,
      color: color,
      decay: 2.5,
      friction: 0.9,
      type: 'circle',
      glow: true
    }));
  }

  // Floating damage indicators
  spawnDamageText(x, y, text, color = '#ff0055') {
    this.particles.push(new Particle(x, y - 10, {
      vx: (Math.random() - 0.5) * 40,
      vy: -Math.random() * 60 - 40, // Rise upwards
      size: 1,
      color: color,
      decay: 1.2,
      friction: 0.97,
      type: 'text',
      text: text,
      font: 'bold 13px Orbitron',
      glow: true
    }));
  }

  // Player level up shockwave
  spawnLevelUpShockwave(x, y) {
    // Spawn standard sparkle particles going high-up
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 100;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 3,
        color: '#00ff66',
        decay: Math.random() * 0.7 + 0.5,
        friction: 0.96,
        type: 'circle'
      }));
    }

    // Spawn green rising floats
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Particle(x + (Math.random() - 0.5) * 40, y - 20, {
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 120 - 80,
        color: '#00ff66',
        decay: 0.8,
        friction: 0.98,
        type: 'text',
        text: 'LEVEL UP!',
        font: 'bold 16px Orbitron'
      }));
    }
  }

  update(dt) {
    // Keep dt clamped to prevent gigantic jumps
    const clampedDt = Math.min(dt, 0.1);
    
    // We update in place to avoid allocating new arrays
    let activeIndex = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.update(clampedDt)) {
        this.particles[activeIndex] = p;
        activeIndex++;
      }
    }
    this.particles.length = activeIndex;
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }
}

export const ParticleSystem = new ParticleManager();
