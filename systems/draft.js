const db = require('../database/db');
const { generatePlayerAt } = require('./playerGen');
const { generatePlayer, rollDevTrait } = require('../utils/ratings');
const { generateId, randomChoice, clamp, gaussian } = require('../utils/helpers');
const { FIRST, LAST, COLLEGE } = require('../data/names');
const CONFIG = require('../config');

/**
 * Generate a draft prospect class for a year.
 * Prospects are stored separately until drafted, then become players.
 */
function generateProspectClass(year) {
  const existing = db.Prospects.all(year).length;
  if (existing > 0) return;
  const positions = CONFIG.ALL_POSITIONS;
  for (let i = 0; i < 250; i++) {
    const pos = randomChoice(positions);
    const tierRoll = Math.random();
    let tier = 'normal';
    if (tierRoll < 0.01) tier = 'x-factor';
    else if (tierRoll < 0.05) tier = 'superstar';
    else if (tierRoll < 0.20) tier = 'star';
    const base = generatePlayer(pos, tier);
    const prospect = {
      id: generateId(),
      first_name: randomChoice(FIRST),
      last_name: randomChoice(LAST),
      position: pos,
      overall: base.overall,
      potential: base.potential,
      age: clamp(Math.round(gaussian(21, 1.2)), 20, 24),
      speed: base.speed,
      strength: base.strength,
      awareness: base.awareness,
      college: randomChoice(COLLEGE),
      dev_trait: rollDevTrait(base.devTraitRoll),
      draft_year: year
    };
    db.Prospects.insert(prospect);
  }
  console.log(`Generated ${year} draft class.`);
}

/**
 * Seed initial draft picks for a year. 7 rounds × 32 teams = 224 picks.
 */
function seedInitialPicks(year) {
  const existing = db.DraftPicks.byYear(year).length;
  if (existing > 0) return;
  const teams = db.Teams.all().sort((a, b) => a.id.localeCompare(b.id));
  let pickNum = 1;
  for (let round = 1; round <= 7; round++) {
    for (const t of teams) {
      db.DraftPicks.insertRaw(year, round, pickNum, t.id, t.id);
      pickNum++;
    }
  }
  generateProspectClass(year);
}

/**
 * Make a draft pick. Drafted prospect becomes a player on the picking team.
 */
function makeDraftPick(pickId, prospectId) {
  const pick = db.DraftPicks.get(pickId);
  if (!pick) return { ok: false, reason: 'Pick not found' };
  if (pick.player_id) return { ok: false, reason: 'Pick already used' };
  const prospect = db.Prospects.get(prospectId);
  if (!prospect) return { ok: false, reason: 'Prospect not found' };
  if (prospect.drafted_by) return { ok: false, reason: 'Prospect already drafted' };

  return db.tx(() => {
    const newPlayer = generatePlayerAt(prospect.position, {
      overall: prospect.overall,
      potential: prospect.potential,
      age: prospect.age,
      dev_trait: prospect.dev_trait,
      team_id: pick.current_team,
      is_free_agent: 0
    });
    const salary = db.Contracts ? Math.max(CONFIG.MIN_SALARY, Math.round(prospect.overall * 80_000)) : CONFIG.MIN_SALARY;
    db.Contracts.insert({
      player_id: newPlayer.id,
      team_id: pick.current_team,
      salary,
      years_remaining: 4,
      signing_bonus: Math.round(salary * 0.5)
    });
    db.Teams.addCap(pick.current_team, -salary);
    db.DraftPicks.usePick(pickId, newPlayer.id);
    db.Prospects.markDrafted(prospectId, pick.current_team, pick.pick_number);
    db.Transactions.log(pick.current_team, 'draft',
      `Selected ${prospect.first_name} ${prospect.last_name} (${prospect.position}) at pick ${pick.pick_number}`);
    return { ok: true, player: newPlayer, pick };
  })();
}

module.exports = { generateProspectClass, seedInitialPicks, makeDraftPick };