const db = require('../database/db');

/**
 * Compute end-of-season awards from stats.
 */
function computeAwards(year) {
  const stats = db.db.prepare('SELECT * FROM player_season_stats WHERE year = ?').all(year);
  const getPlayer = (id) => db.Players.get(id);

  const qbs = stats.filter(s => getPlayer(s.player_id)?.position === 'QB');
  const rbs = stats.filter(s => getPlayer(s.player_id)?.position === 'RB');
  const wrs = stats.filter(s => getPlayer(s.player_id)?.position === 'WR');

  const mvpScore = (s) => s.pass_yds * 0.04 + s.pass_td * 4 - s.ints_thrown * 2;
  const opoyScore = (s) => s.pass_yds * 0.04 + s.pass_td * 4 + s.rush_yds * 0.1 + s.rush_td * 6;
  const dpoyCandidates = stats.filter(s => {
    const p = getPlayer(s.player_id);
    return p && ['DE','DT','NT','OLB','ILB','MLB','CB','FS','SS'].includes(p.position);
  });
  const dpoyScore = (s) => s.sacks * 3 + s.tackles * 0.5 + s.interceptions * 5;
  const oroyCandidates = stats.filter(s => getPlayer(s.player_id)?.experience === 0);
  const droyCandidates = oroyCandidates.filter(s => {
    const p = getPlayer(s.player_id);
    return p && ['DE','DT','NT','OLB','ILB','MLB','CB','FS','SS'].includes(p.position);
  });

  const pickBest = (arr, scorer) => arr.length ? arr.reduce((a, b) => scorer(a) > scorer(b) ? a : b) : null;

  const insertAward = db.db.prepare(
    'INSERT OR REPLACE INTO awards (year, award, player_id, team_id) VALUES (?, ?, ?, ?)'
  );

  const awardList = [
    ['MVP', pickBest(qbs, mvpScore)],
    ['OPOY', pickBest(stats, opoyScore)],
    ['DPOY', pickBest(dpoyCandidates, dpoyScore)],
    ['OROY', pickBest(oroyCandidates, opoyScore)],
    ['DROY', pickBest(droyCandidates, dpoyScore)]
  ];

  for (const [name, stat] of awardList) {
    if (!stat) continue;
    const p = getPlayer(stat.player_id);
    insertAward.run(year, name, stat.player_id, p?.team_id || null);
  }
}

module.exports = { computeAwards };