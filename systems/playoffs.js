const db = require('../database/db');

/**
 * Determine playoff seedings from regular season standings.
 */
function getSeeds(year, conference) {
  const teams = db.Teams.byConference(conference).map(t => {
    const schedule = db.Schedule.byTeam(t.id, year);
    let wins = 0, losses = 0, ties = 0, pf = 0, pa = 0;
    for (const g of schedule) {
      if (!g.played) continue;
      const isHome = g.home_team === t.id;
      const own = isHome ? g.home_score : g.away_score;
      const opp = isHome ? g.away_score : g.home_score;
      pf += own; pa += opp;
      if (own > opp) wins++;
      else if (own < opp) losses++;
      else ties++;
    }
    return { ...t, wins, losses, ties, pf, pa };
  });

  teams.sort((a, b) => {
    const winPctA = (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties || 1);
    const winPctB = (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties || 1);
    if (winPctB !== winPctA) return winPctB - winPctA;
    return (b.pf - b.pa) - (a.pf - a.pa);
  });

  return teams.slice(0, 7);
}

/**
 * Create wild card round games.
 */
function createWildCardRound(year) {
  const afc = getSeeds(year, 'AFC');
  const nfc = getSeeds(year, 'NFC');
  const games = [];
  // 2v7, 3v6, 4v5 (1 seed gets bye)
  const matchups = [[1, 6], [2, 5], [3, 4]]; // indices: 0=seed1
  for (const conf of [afc, nfc]) {
    for (const [i, j] of matchups) {
      games.push({
        year, week: 19, home: conf[i].id, away: conf[j].id,
        is_playoff: 1, playoff_round: 'wildcard'
      });
    }
  }
  for (const g of games) db.Schedule.insert(g);
  return games;
}

module.exports = { getSeeds, createWildCardRound };