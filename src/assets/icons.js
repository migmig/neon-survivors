// --- Cyberpunk / Synthwave Styled SVG Icons for Neon Survivors ---

export const SvgIcons = {
  // Logo with a glowing retro-futuristic grid and typography
  logo: `
    <svg viewBox="0 0 400 150" class="svg-logo" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="neon-blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f0ff" />
          <stop offset="100%" stop-color="#0072ff" />
        </linearGradient>
        <linearGradient id="neon-pink-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ff00aa" />
          <stop offset="100%" stop-color="#ff0055" />
        </linearGradient>
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <!-- Grid overlay behind text -->
      <g stroke="#ff00aa" stroke-opacity="0.15" stroke-width="1.5">
        <path d="M 0,90 H 400 M 0,110 H 400 M 0,125 H 400 M 0,135 H 400" />
        <path d="M 200,70 L 0,140 M 200,70 L 80,140 M 200,70 L 160,140 M 200,70 L 240,140 M 200,70 L 320,140 M 200,70 L 400,140" />
      </g>

      <!-- NEON Text -->
      <text x="50%" y="65" font-family="'Orbitron', sans-serif" font-weight="900" font-size="54" 
            fill="url(#neon-blue-grad)" text-anchor="middle" letter-spacing="12" filter="url(#neon-glow)">
        NEON
      </text>

      <!-- SURVIVORS Text -->
      <text x="50%" y="120" font-family="'Orbitron', sans-serif" font-weight="900" font-size="44" 
            fill="url(#neon-pink-grad)" text-anchor="middle" letter-spacing="4" filter="url(#neon-glow)">
        SURVIVORS
      </text>
    </svg>
  `,

  // Heart icon for HP bar
  heart: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      <path d="M12 8.5v3M10.5 10h3" stroke-width="1.5"></path>
    </svg>
  `,

  // Trophy icon for High Score
  trophy: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
      <path d="M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path>
      <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"></path>
    </svg>
  `,

  // Mouse icon for Controls Guide
  mouse: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
      <rect x="5" y="2" width="14" height="20" rx="7"></rect>
      <path d="M12 2v6M9 8h6"></path>
      <circle cx="12" cy="14" r="2" fill="currentColor" fill-opacity="0.3"></circle>
    </svg>
  `,

  // WASD / Keyboard icon for Controls Guide
  keyboard: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon">
      <rect x="2" y="4" width="20" height="16" rx="3"></rect>
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M18 12h.01M7 16h10"></path>
      <rect x="9" y="11" width="2" height="2" rx="0.5"></rect>
      <rect x="13" y="11" width="2" height="2" rx="0.5"></rect>
    </svg>
  `,

  // Weapon: Plasma Bolt
  plasmabolt: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fill-opacity="0.1"></polygon>
      <circle cx="12" cy="11" r="9" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.5"></circle>
    </svg>
  `,

  // Weapon: Orbiting Shield
  orbitingshield: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fill-opacity="0.1"></path>
      <circle cx="12" cy="12" r="4" stroke-width="1.5"></circle>
      <path d="M12 5a7 7 0 0 1 7 7" stroke-width="1" stroke-dasharray="2 2"></path>
      <path d="M12 19a7 7 0 0 1-7-7" stroke-width="1" stroke-dasharray="2 2"></path>
    </svg>
  `,

  // Weapon: Lightning Strike
  lightningstrike: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58"></path>
      <polygon points="13 11 9 17 12 17 11 23 15 17 12 17 13 11" fill="currentColor" fill-opacity="0.2"></polygon>
    </svg>
  `,

  // Passive: Speed
  speed: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <path d="M13 4l-4 4H5L3 14h6l2 6 6-6h4l2-4h-8L13 4z" fill="currentColor" fill-opacity="0.1"></path>
      <path d="M3 18h5M4 21h2" stroke-width="1.5"></path>
    </svg>
  `,

  // Passive: Magnet
  magnet: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <path d="M7 2v10a5 5 0 0 0 10 0V2" fill="currentColor" fill-opacity="0.1"></path>
      <line x1="5" y1="2" x2="9" y2="2" stroke-width="3"></line>
      <line x1="15" y1="2" x2="19" y2="2" stroke-width="3"></line>
      <path d="M4 14a8 8 0 0 0 16 0" stroke-dasharray="2 2"></path>
      <path d="M2 14a10 10 0 0 0 20 0" stroke-dasharray="3 3"></path>
    </svg>
  `,

  // Passive: Armor
  armor: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" fill="currentColor" fill-opacity="0.1"></polygon>
      <polyline points="2 8.5 12 15 22 8.5"></polyline>
      <line x1="12" y1="15" x2="12" y2="22"></line>
    </svg>
  `,

  // Passive: Damage
  damage: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.2"></circle>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"></path>
    </svg>
  `,

  // New Weapon: Neon Fire Trail
  neonfiretrail: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="currentColor" fill-opacity="0.1"></path>
      <path d="M12 2v3M12 19v3" stroke-width="1"></path>
    </svg>
  `,

  // New Weapon: Cyber Drone
  cyberdrone: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <circle cx="12" cy="12" r="4" fill="currentColor" fill-opacity="0.1"></circle>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" stroke-width="1.5"></path>
    </svg>
  `,

  // Evolved Weapon: Giga Particle Annihilator
  gigaparticle: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fill-opacity="0.2"></polygon>
      <circle cx="12" cy="11" r="10" stroke-width="2"></circle>
      <path d="M12 1v20" stroke-width="2" stroke-dasharray="1 1"></path>
    </svg>
  `,

  // Evolved Weapon: Hypernova Aegis
  hypernovaegis: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-icon-large">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fill-opacity="0.2"></path>
      <circle cx="12" cy="12" r="6" stroke-width="2"></circle>
      <path d="M6 6l12 12M18 6L6 18" stroke-width="1.5"></path>
    </svg>
  `
};
