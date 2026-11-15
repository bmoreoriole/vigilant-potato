const db = require('../database/db');
const { clamp, gaussian, random } = require('../utils/helpers');
const CONFIG = require('../config');

/**
 * Yearly player progression.
 * Young players grow, old players decline. Dev trait multiplies growth.
 */
function progressPlayers(year) {
  const players = db.Players.all();
  for (const p of players) {
    const traitMult = CONFIG.DEV_TRAITS[p.dev_trait]?.growth || 0.6;
    let delta = 0;

    if (p.age <= 24) {
      delta = gaussian(3 * traitMult, 2);
    } else if (p.age <= 27) {
      delta = gaussian(1.5 * traitMult, 2);
    } else if (p.age <= 30) {
      delta = gaussian(-1, 2);
    } else {
      delta = gaussian(-3, 2);
    }

    // Physical decline for older players
    let newSpeed = p.speed, newStrength = p.strength;
    if (p.age > 29) {
      newSpeed = clamp(p.speed - random(0, 2), 40, 99);
      newStrength = clamp(p.strength - random(0, 1), 40, 99);
    }

    const newOverall = clamp(Math.round(p.overall + delta), 40, p.potential);
    const newAge = p.age + 1;

    // Retirement: age 33+ with declining overall, or age 36+
    let retire = false;
    if (newAge >= 36) retire = true;
    else if (newAge >= 33 && newOverall < 70) retire = Math.random() < 0.5;

    db.Players.update(p.id, {
      overall: newOverall,
      speed: newSpeed,
      strength: newStrength,
      age: newAge,
      experience: p.experience + 1
    });

    if (retire) {
      db.Players.retire(p.id);
      db.Contracts.delete(p.id);
      db.Transactions.log(p.team_id, 'retire', `${p.first_name} ${p.last_name} retired`);
    }
  }
  // Decrement contract years
  db.Contracts.decrementYears();
  db.db.prepare('DELETE FROM contracts WHERE years_remaining <= 0').run();
}

module.exports = { progressPlayers };