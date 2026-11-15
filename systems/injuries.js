const db = require('../database/db');
const { random, randomChoice } = require('../utils/helpers');

/**
 * Roll injuries after a game. Probability scales with player age and fatigue.
 */
function rollInjuries(teamId, severity = 'normal') {
  const players = db.Players.byTeam(teamId);
  for (const p of players) {
    const baseChance = 0.005 * (1 + (p.age - 25) * 0.05);
    if (Math.random() < baseChance) {
      const weeks = severity === 'major' ? random(4, 12) : random(1, 4);
      db.Players.setInjury(p.id, weeks);
      db.Transactions.log(teamId, 'injury', `${p.first_name} ${p.last_name} injured (${weeks}w)`);
    }
  }
}

function healPlayers() {
  db.Players.decrementInjuries();
}

module.exports = { rollInjuries, healPlayers };