const db = require('../database/db');
const { generateId } = require('../utils/helpers');

function createOffer(fromTeam, toTeam, offerPlayers, requestPlayers, offerPicks, requestPicks) {
  const id = generateId();
  db.db.prepare(`
    INSERT INTO trade_offers (id, from_team, to_team, offer_players, request_players,
      offer_picks, request_picks, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id, fromTeam, toTeam,
    JSON.stringify(offerPlayers), JSON.stringify(requestPlayers),
    JSON.stringify(offerPicks), JSON.stringify(requestPicks),
    Date.now()
  );
  return id;
}

function validateTrade(teamA, teamB, playersA, playersB, picksA, picksB) {
  // Roster size checks
  const rosterA = db.Players.byTeam(teamA).length;
  const rosterB = db.Players.byTeam(teamB).length;
  if (rosterA - playersA.length + playersB.length > 53) return { ok: false, reason: `${teamA} roster overflow` };
  if (rosterB - playersB.length + playersA.length > 53) return { ok: false, reason: `${teamB} roster overflow` };

  // Ownership
  for (const id of playersA) {
    const p = db.Players.get(id);
    if (!p || p.team_id !== teamA) return { ok: false, reason: `Player ${id} not on ${teamA}` };
  }
  for (const id of playersB) {
    const p = db.Players.get(id);
    if (!p || p.team_id !== teamB) return { ok: false, reason: `Player ${id} not on ${teamB}` };
  }

  // Cap check
  const sumSal = (ids) => ids.reduce((s, id) => s + (db.Contracts.get(id)?.salary || 0), 0);
  const salOutA = sumSal(playersA), salInA = sumSal(playersB);
  const salOutB = sumSal(playersB), salInB = sumSal(playersA);
  const teamAObj = db.Teams.get(teamA), teamBObj = db.Teams.get(teamB);
  if (teamAObj.cap_space - (salInA - salOutA) < 0) return { ok: false, reason: `${teamA} exceeds cap` };
  if (teamBObj.cap_space - (salInB - salOutB) < 0) return { ok: false, reason: `${teamB} exceeds cap` };

  // Picks ownership
  for (const pid of picksA) {
    const pick = db.DraftPicks.get(pid);
    if (!pick || pick.current_team !== teamA) return { ok: false, reason: `Pick ${pid} not owned by ${teamA}` };
  }
  for (const pid of picksB) {
    const pick = db.DraftPicks.get(pid);
    if (!pick || pick.current_team !== teamB) return { ok: false, reason: `Pick ${pid} not owned by ${teamB}` };
  }

  return { ok: true };
}

function executeTrade(teamA, teamB, playersA, playersB, picksA, picksB) {
  const check = validateTrade(teamA, teamB, playersA, playersB, picksA, picksB);
  if (!check.ok) return check;

  return db.tx(() => {
    for (const id of playersA) {
      db.Players.setTeam(id, teamB);
      const c = db.Contracts.get(id);
      db.Contracts.update({ ...c, team_id: teamB });
    }
    for (const id of playersB) {
      db.Players.setTeam(id, teamA);
      const c = db.Contracts.get(id);
      db.Contracts.update({ ...c, team_id: teamA });
    }
    for (const id of picksA) db.DraftPicks.transfer(id, teamB);
    for (const id of picksB) db.DraftPicks.transfer(id, teamA);

    const sumSal = (ids) => ids.reduce((s, id) => s + (db.Contracts.get(id)?.salary || 0), 0);
    db.Teams.addCap(teamA, sumSal(playersA) - sumSal(playersB));
    db.Teams.addCap(teamB, sumSal(playersB) - sumSal(playersA));

    db.Transactions.log(teamA, 'trade', `Traded with ${teamB}`);
    db.Transactions.log(teamB, 'trade', `Traded with ${teamA}`);
    db.db.prepare('UPDATE trade_offers SET status = ? WHERE from_team = ? AND to_team = ? AND status = ?')
      .run('executed', teamA, teamB, 'pending');
    return { ok: true };
  })();
}

function getPendingOffers(teamId) {
  return db.db.prepare(
    `SELECT * FROM trade_offers WHERE to_team = ? AND status = 'pending' ORDER BY created_at DESC`
  ).all(teamId);
}

module.exports = { createOffer, validateTrade, executeTrade, getPendingOffers };