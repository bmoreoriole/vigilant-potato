const db = require('../database/db');
const { salaryForOverall } = require('./playerGen');
const CONFIG = require('../config');

/**
 * AI-controlled teams sign free agents in the offseason.
 * Simple heuristic: fill weakest roster spots if they can afford.
 */
function aiFreeAgency() {
  const teams = db.Teams.all();
  const fas = db.Players.freeAgents();
  for (const team of teams) {
    let roster = db.Players.byTeam(team.id);
    if (roster.length >= 53) continue;
    for (const fa of fas) {
      if (roster.length >= 53) break;
      const cap = db.Teams.get(team.id).cap_space;
      const wantSalary = salaryForOverall(fa.overall);
      if (wantSalary > cap) continue;
      const existingAtPos = roster.filter(p => p.position === fa.position).length;
      const target = CONFIG.ROSTER_TARGETS[fa.position] || 1;
      if (existingAtPos >= target) continue;
      // Sign
      db.Players.setTeam(fa.id, team.id, 0);
      db.Contracts.insert({
        player_id: fa.id, team_id: team.id,
        salary: wantSalary, years_remaining: 2, signing_bonus: 0
      });
      db.Teams.addCap(team.id, -wantSalary);
      db.Transactions.log(team.id, 'sign', `Signed FA ${fa.first_name} ${fa.last_name} (${fa.position}, ${fa.overall})`);
      roster.push(fa);
    }
  }
}

/**
 * Player command: sign a free agent to your team.
 */
function signFreeAgent(teamId, playerId) {
  const team = db.Teams.get(teamId);
  const player = db.Players.get(playerId);
  if (!player) return { ok: false, reason: 'Player not found' };
  if (player.team_id) return { ok: false, reason: 'Player is not a free agent' };
  if (db.Players.byTeam(teamId).length >= 53) return { ok: false, reason: 'Roster is full (53)' };
  const cost = salaryForOverall(player.overall);
  if (team.cap_space < cost) return { ok: false, reason: `Not enough cap. Need ${cost}, have ${team.cap_space}` };

  return db.tx(() => {
    db.Players.setTeam(playerId, teamId, 0);
    db.Contracts.insert({
      player_id: playerId, team_id: teamId,
      salary: cost, years_remaining: 2, signing_bonus: 0
    });
    db.Teams.addCap(teamId, -cost);
    db.Transactions.log(teamId, 'sign', `Signed ${player.first_name} ${player.last_name}`);
    return { ok: true, cost };
  })();
}

function releasePlayer(teamId, playerId) {
  const player = db.Players.get(playerId);
  if (!player || player.team_id !== teamId) return { ok: false, reason: 'Not on your team' };
  const contract = db.Contracts.get(playerId);
  // Cap penalty = 50% of signing bonus
  const penalty = Math.round((contract?.signing_bonus || 0) * 0.5);
  return db.tx(() => {
    db.Players.release(playerId);
    if (contract) db.Contracts.delete(playerId);
    db.Teams.addCap(teamId, contract?.salary || 0);
    db.Teams.addCap(teamId, -penalty);
    db.Transactions.log(teamId, 'release', `Released ${player.first_name} ${player.last_name}`);
    return { ok: true, penalty };
  })();
}

module.exports = { aiFreeAgency, signFreeAgent, releasePlayer };