const db = require('../database/db');
const { FIRST, LAST, COLLEGE } = require('../data/names');
const { generatePlayer, rollDevTrait } = require('../utils/ratings');
const { generateId, random, randomChoice } = require('../utils/helpers');
const CONFIG = require('../config');

/**
 * Generate a single player at a position.
 * Inserts into `players` table. Free agent by default.
 */
function generatePlayerAt(pos, opts = {}) {
  const tierRoll = Math.random();
  let tier = 'normal';
  if (tierRoll < 0.02) tier = 'x-factor';
  else if (tierRoll < 0.08) tier = 'superstar';
  else if (tierRoll < 0.28) tier = 'star';

  const base = generatePlayer(pos, tier);
  const player = {
    id: generateId(),
    first_name: randomChoice(FIRST),
    last_name: randomChoice(LAST),
    position: pos,
    overall: opts.overall ?? base.overall,
    potential: opts.potential ?? base.potential,
    age: opts.age ?? base.age,
    speed: base.speed,
    strength: base.strength,
    awareness: base.awareness,
    college: randomChoice(COLLEGE),
    experience: opts.experience ?? 0,
    dev_trait: opts.dev_trait ?? rollDevTrait(base.devTraitRoll),
    injury_weeks: 0,
    team_id: opts.team_id ?? null,
    is_free_agent: opts.is_free_agent ?? 0,
    is_on_practice_squad: 0
  };
  db.Players.insert(player);
  return player;
}

/**
 * Auto-generate a full 53-man roster + practice squad for a team.
 * Uses ROSTER_TARGETS from config to determine depth at each position.
 */
function generateRosterForTeam(teamId) {
  const targets = CONFIG.ROSTER_TARGETS;
  const created = [];
  for (const [pos, count] of Object.entries(targets)) {
    for (let i = 0; i < count; i++) {
      // Starters get better ratings; depth tapers
      const depthPenalty = i * 3;
      const p = generatePlayerAt(pos, {
        team_id: teamId,
        overall: Math.max(45, (Math.random() < 0.15 ? 85 : 72) - depthPenalty + random(-3, 3)),
        is_free_agent: 0
      });
      // Contract: salary based on overall
      const salary = salaryForOverall(p.overall);
      db.Contracts.insert({
        player_id: p.id,
        team_id: teamId,
        salary,
        years_remaining: random(1, 4),
        signing_bonus: Math.round(salary * 0.3)
      });
      db.Teams.addCap(teamId, -salary);
      created.push(p);
    }
  }
  // 16 practice squad players (random positions, low ratings)
  for (let i = 0; i < CONFIG.PRACTICE_SQUAD_LIMIT; i++) {
    const pos = randomChoice(CONFIG.ALL_POSITIONS);
    const p = generatePlayerAt(pos, {
      team_id: teamId,
      overall: random(55, 68),
      is_free_agent: 0
    });
    db.Players.update(p.id, { is_on_practice_squad: 1 });
    db.Contracts.insert({
      player_id: p.id,
      team_id: teamId,
      salary: CONFIG.MIN_SALARY,
      years_remaining: 1,
      signing_bonus: 0
    });
    db.Teams.addCap(teamId, -CONFIG.MIN_SALARY);
  }
  return created;
}

function salaryForOverall(ovr) {
  if (ovr >= 95) return 35_000_000 + random(0, 10_000_000);
  if (ovr >= 90) return 25_000_000 + random(0, 8_000_000);
  if (ovr >= 85) return 15_000_000 + random(0, 8_000_000);
  if (ovr >= 80) return 8_000_000 + random(0, 5_000_000);
  if (ovr >= 75) return 3_500_000 + random(0, 3_000_000);
  if (ovr >= 70) return 1_500_000 + random(0, 1_500_000);
  return CONFIG.MIN_SALARY;
}

/**
 * Seed initial free agent pool + fill all 32 rosters.
 * Called once on bot startup.
 */
function seedInitialPlayers() {
  const existing = db.Players.all().length;
  if (existing > 100) return; // Already seeded

  const teams = db.Teams.all();
  for (const team of teams) {
    if (db.Players.byTeam(team.id).length === 0) {
      generateRosterForTeam(team.id);
    }
  }
  // Seed a pool of ~200 free agents
  const positions = CONFIG.ALL_POSITIONS;
  for (let i = 0; i < 200; i++) {
    generatePlayerAt(randomChoice(positions), {
      is_free_agent: 1,
      overall: random(55, 85)
    });
  }
  console.log(`Seeded ${teams.length} rosters and 200 free agents.`);
}

module.exports = { generatePlayerAt, generateRosterForTeam, salaryForOverall, seedInitialPlayers };