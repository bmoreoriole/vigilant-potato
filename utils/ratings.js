const { gaussian, clamp } = require('./helpers');

// Position archetypes with rating distributions
const ARCHETYPES = {
  QB: { mean: 72, sd: 7, speed: 65, strength: 62, awareness: 75 },
  RB: { mean: 73, sd: 6, speed: 82, strength: 68, awareness: 70 },
  FB: { mean: 65, sd: 5, speed: 68, strength: 78, awareness: 68 },
  WR: { mean: 73, sd: 6, speed: 85, strength: 60, awareness: 72 },
  TE: { mean: 72, sd: 6, speed: 72, strength: 76, awareness: 72 },
  OT: { mean: 73, sd: 6, speed: 55, strength: 88, awareness: 74 },
  OG: { mean: 72, sd: 6, speed: 54, strength: 87, awareness: 73 },
  C:  { mean: 71, sd: 6, speed: 55, strength: 85, awareness: 75 },
  DE: { mean: 73, sd: 6, speed: 72, strength: 85, awareness: 72 },
  DT: { mean: 72, sd: 6, speed: 62, strength: 88, awareness: 72 },
  NT: { mean: 70, sd: 5, speed: 58, strength: 90, awareness: 70 },
  OLB: { mean: 73, sd: 6, speed: 78, strength: 76, awareness: 73 },
  ILB: { mean: 72, sd: 6, speed: 74, strength: 78, awareness: 74 },
  MLB: { mean: 73, sd: 6, speed: 73, strength: 80, awareness: 75 },
  CB: { mean: 73, sd: 6, speed: 88, strength: 58, awareness: 72 },
  FS: { mean: 72, sd: 6, speed: 82, strength: 65, awareness: 74 },
  SS: { mean: 72, sd: 6, speed: 78, strength: 76, awareness: 73 },
  K:  { mean: 74, sd: 5, speed: 50, strength: 55, awareness: 78 },
  P:  { mean: 74, sd: 5, speed: 50, strength: 58, awareness: 76 },
  LS: { mean: 70, sd: 4, speed: 55, strength: 70, awareness: 78 }
};

function generatePlayer(pos, tier = 'normal') {
  const arch = ARCHETYPES[pos];
  const tierBoost = { normal: 0, star: 4, superstar: 8, 'x-factor': 12 }[tier] || 0;
  const overall = clamp(Math.round(gaussian(arch.mean + tierBoost, arch.sd)), 40, 99);
  const potential = clamp(overall + Math.round(gaussian(6, 4)), overall, 99);
  return {
    overall,
    potential,
    speed: clamp(Math.round(gaussian(arch.speed, 5)), 40, 99),
    strength: clamp(Math.round(gaussian(arch.strength, 5)), 40, 99),
    awareness: clamp(Math.round(gaussian(arch.awareness, 5)), 40, 99),
    age: clamp(Math.round(gaussian(24, 3)), 21, 34),
    experience: 0,
    devTraitRoll: Math.random()
  };
}

function rollDevTrait(roll) {
  if (roll < 0.02) return 'x-factor';
  if (roll < 0.08) return 'superstar';
  if (roll < 0.30) return 'star';
  return 'normal';
}

module.exports = { generatePlayer, rollDevTrait, ARCHETYPES };