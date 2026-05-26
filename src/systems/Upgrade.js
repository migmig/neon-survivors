// --- Evolution synthesis engine (data-driven, replaces hardcoded recipes) ---

import {
  EVOLUTION_RULES,
  EVOLUTION_PASSIVE_THRESHOLD,
  EVOLUTION_BASE_LEVEL_REQUIRED
} from '../data/evolutions.js';

import {
  GigaParticleAnnihilator,
  HypernovaAegis,
  SubwooferResonanceGrid,
  EventHorizonGlitch,
  PrismCascadeOverlord,
  CyberneticZombieOverlord
} from './Weapon.js';

const EVO_CONSTRUCTORS = {
  gigaparticle: GigaParticleAnnihilator,
  hypernovaegis: HypernovaAegis,
  subwooferresonance: SubwooferResonanceGrid,
  eventhorizonglitch: EventHorizonGlitch,
  prismcascade: PrismCascadeOverlord,
  cyberneticzombie: CyberneticZombieOverlord
};

/**
 * Try to evolve one of the player's weapons. Returns the rule that fired (or null).
 * Caller is responsible for consuming the EvolutionCore and showing UI flash.
 */
export function checkEvolution(player) {
  if (!player || !player.weapons) return null;

  for (let i = 0; i < EVOLUTION_RULES.length; i++) {
    const rule = EVOLUTION_RULES[i];
    const baseWeapon = player.weapons.find(w => w.id === rule.base);
    if (!baseWeapon) continue;
    if (baseWeapon.level < EVOLUTION_BASE_LEVEL_REQUIRED) continue;

    const passiveLevel = (player.passives && player.passives[rule.passive]) || 0;
    if (passiveLevel < EVOLUTION_PASSIVE_THRESHOLD) continue;

    const EvoClass = EVO_CONSTRUCTORS[rule.evo];
    if (!EvoClass) continue;

    // Replace base with evolution
    player.weapons = player.weapons.filter(w => w.id !== rule.base);
    const evoWeapon = new EvoClass(player);
    // Evolution weapons inherit the 'evolution' tag from WEAPON_DEFS (set in Weapon constructor).
    player.weapons.push(evoWeapon);
    return rule;
  }
  return null;
}
