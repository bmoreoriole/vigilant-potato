const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'nfl.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// ---------- Teams ----------
const Teams = {
  all: () => db.prepare('SELECT * FROM teams').all(),
  get: (id) => db.prepare('SELECT * FROM teams WHERE id = ?').get(id),
  byConference: (c) => db.prepare('SELECT * FROM teams WHERE conference = ?').all(c),
  byDivision: (c, d) => db.prepare('SELECT * FROM teams WHERE conference = ? AND division = ?').all(c, d),
  insert: (t) => db.prepare(`
    INSERT INTO teams (id, name, conference, division, cap_space)
    VALUES (@id, @name, @conference, @division, 255500000)
  `).run(t),
  updateCap: (id, cap) => db.prepare('UPDATE teams SET cap_space = ? WHERE id = ?').run(cap, id),
  addCap: (id, delta) => db.prepare('UPDATE teams SET cap_space = cap_space + ? WHERE id = ?').run(delta, id),
  recordWin: (id, pf, pa) => db.prepare(`
    UPDATE teams SET wins = wins + 1, points_for = points_for + ?, points_against = points_against + ?
    WHERE id = ?
  `).run(pf, pa, id),
  recordLoss: (id, pf, pa) => db.prepare(`
    UPDATE teams SET losses = losses + 1, points_for = points_for + ?, points_against = points_against + ?
    WHERE id = ?
  `).run(pf, pa, id),
  recordTie: (id, pf, pa) => db.prepare(`
    UPDATE teams SET ties = ties + 1, points_for = points_for + ?, points_against = points_against + ?
    WHERE id = ?
  `).run(pf, pa, id),
  setOwner: (id, ownerId) => db.prepare('UPDATE teams SET owner_id = ? WHERE id = ?').run(ownerId, id),
  resetRecord: (id) => db.prepare(
    'UPDATE teams SET wins = 0, losses = 0, ties = 0, points_for = 0, points_against = 0 WHERE id = ?'
  ).run(id),
  ownerOf: (ownerId) => db.prepare('SELECT * FROM teams WHERE owner_id = ?').get(ownerId)
};

// ---------- Players ----------
const Players = {
  all: () => db.prepare('SELECT * FROM players WHERE retired = 0').all(),
  get: (id) => db.prepare('SELECT * FROM players WHERE id = ?').get(id),
  byTeam: (teamId) => db.prepare(
    'SELECT * FROM players WHERE team_id = ? AND retired = 0 ORDER BY overall DESC'
  ).all(teamId),
  freeAgents: () => db.prepare(
    'SELECT * FROM players WHERE is_free_agent = 1 AND team_id IS NULL AND retired = 0 ORDER BY overall DESC'
  ).all(),
  practiceSquad: (teamId) => db.prepare(
    'SELECT * FROM players WHERE team_id = ? AND is_on_practice_squad = 1 AND retired = 0'
  ).all(teamId),
  insert: (p) => db.prepare(`
    INSERT INTO players (id, first_name, last_name, position, overall, potential, age,
      speed, strength, awareness, college, experience, dev_trait, injury_weeks,
      team_id, is_free_agent, is_on_practice_squad)
    VALUES (@id, @first_name, @last_name, @position, @overall, @potential, @age,
      @speed, @strength, @awareness, @college, @experience, @dev_trait, @injury_weeks,
      @team_id, @is_free_agent, @is_on_practice_squad)
  `).run({
    injury_weeks: 0, team_id: null, is_free_agent: 0, is_on_practice_squad: 0,
    dev_trait: 'normal', experience: 0, college: 'Unknown', ...p
  }),
  update: (id, fields) => {
    const keys = Object.keys(fields);
    const set = keys.map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE players SET ${set} WHERE id = @id`).run({ id, ...fields });
  },
  setTeam: (id, teamId, isFA = 0) => db.prepare(
    'UPDATE players SET team_id = ?, is_free_agent = ?, is_on_practice_squad = 0 WHERE id = ?'
  ).run(teamId, isFA, id),
  release: (id) => db.prepare(
    'UPDATE players SET team_id = NULL, is_free_agent = 1, is_on_practice_squad = 0 WHERE id = ?'
  ).run(id),
  retire: (id) => db.prepare('UPDATE players SET retired = 1, team_id = NULL WHERE id = ?').run(id),
  setInjury: (id, weeks) => db.prepare('UPDATE players SET injury_weeks = ? WHERE id = ?').run(weeks, id),
  decrementInjuries: () => db.prepare(
    'UPDATE players SET injury_weeks = MAX(0, injury_weeks - 1) WHERE injury_weeks > 0'
  ).run()
};

// ---------- Contracts ----------
const Contracts = {
  get: (playerId) => db.prepare('SELECT * FROM contracts WHERE player_id = ?').get(playerId),
  byTeam: (teamId) => db.prepare('SELECT * FROM contracts WHERE team_id = ?').all(teamId),
  insert: (c) => db.prepare(`
    INSERT INTO contracts (player_id, team_id, salary, years_remaining, signing_bonus)
    VALUES (@player_id, @team_id, @salary, @years_remaining, @signing_bonus)
  `).run({ signing_bonus: 0, ...c }),
  delete: (playerId) => db.prepare('DELETE FROM contracts WHERE player_id = ?').run(playerId),
  update: (c) => db.prepare(`
    UPDATE contracts SET team_id = @team_id, salary = @salary,
      years_remaining = @years_remaining, signing_bonus = @signing_bonus
    WHERE player_id = @player_id
  `).run(c),
  capUsed: (teamId) => db.prepare(
    'SELECT COALESCE(SUM(salary),0) AS total FROM contracts WHERE team_id = ?'
  ).get(teamId).total,
  decrementYears: () => db.prepare(
    'UPDATE contracts SET years_remaining = years_remaining - 1 WHERE years_remaining > 0'
  ).run()
};

// ---------- Draft Picks ----------
const DraftPicks = {
  byYear: (year) => db.prepare('SELECT * FROM draft_picks WHERE year = ? ORDER BY pick_number').all(year),
  byTeam: (teamId, year) => db.prepare(`
    SELECT * FROM draft_picks WHERE current_team = ? AND year = ? AND player_id IS NULL
    ORDER BY round, pick_number
  `).all(teamId, year),
  get: (id) => db.prepare('SELECT * FROM draft_picks WHERE id = ?').get(id),
  nextAvailable: (year) => db.prepare(
    'SELECT * FROM draft_picks WHERE year = ? AND player_id IS NULL ORDER BY pick_number ASC LIMIT 1'
  ).get(year),
  transfer: (id, newTeam) => db.prepare('UPDATE draft_picks SET current_team = ? WHERE id = ?').run(newTeam, id),
  usePick: (id, playerId) => db.prepare('UPDATE draft_picks SET player_id = ? WHERE id = ?').run(playerId, id),
  insertRaw: (year, round, pick, orig, curr) => db.prepare(`
    INSERT INTO draft_picks (year, round, pick_number, original_team, current_team)
    VALUES (?, ?, ?, ?, ?)
  `).run(year, round, pick, orig, curr)
};

// ---------- Prospects ----------
const Prospects = {
  byYear: (year) => db.prepare(
    'SELECT * FROM draft_prospects WHERE draft_year = ? AND drafted_by IS NULL ORDER BY overall DESC'
  ).all(year),
  all: (year) => db.prepare('SELECT * FROM draft_prospects WHERE draft_year = ? ORDER BY overall DESC').all(year),
  get: (id) => db.prepare('SELECT * FROM draft_prospects WHERE id = ?').get(id),
  insert: (p) => db.prepare(`
    INSERT INTO draft_prospects (id, first_name, last_name, position, overall, potential, age,
      speed, strength, awareness, college, dev_trait, draft_year)
    VALUES (@id, @first_name, @last_name, @position, @overall, @potential, @age,
      @speed, @strength, @awareness, @college, @dev_trait, @draft_year)
  `).run(p),
  markDrafted: (id, teamId, pickNumber) => db.prepare(
    'UPDATE draft_prospects SET drafted_by = ?, pick_number = ? WHERE id = ?'
  ).run(teamId, pickNumber, id)
};

// ---------- Schedule ----------
const Schedule = {
  byWeek: (year, week) => db.prepare(
    'SELECT * FROM schedule WHERE year = ? AND week = ? AND is_playoff = 0'
  ).all(year, week),
  byTeam: (teamId, year) => db.prepare(`
    SELECT * FROM schedule WHERE year = ? AND (home_team = ? OR away_team = ?) AND is_playoff = 0
    ORDER BY week
  `).all(year, teamId, teamId),
  get: (id) => db.prepare('SELECT * FROM schedule WHERE id = ?').get(id),
  insert: (g) => db.prepare(`
    INSERT INTO schedule (year, week, home_team, away_team, is_playoff, playoff_round)
    VALUES (@year, @week, @home_team, @away_team, @is_playoff, @playoff_round)
  `).run({ is_playoff: 0, playoff_round: null, ...g }),
  record: (id, hs, as) => db.prepare(
    'UPDATE schedule SET home_score = ?, away_score = ?, played = 1 WHERE id = ?'
  ).run(hs, as, id),
  hasWeekPlayed: (year, week) => {
    const games = db.prepare('SELECT played FROM schedule WHERE year = ? AND week = ? AND is_playoff = 0').all(year, week);
    return games.length > 0 && games.every(g => g.played === 1);
  }
};

// ---------- Stats ----------
const Stats = {
  upsert: (s) => db.prepare(`
    INSERT INTO player_season_stats (player_id, year, team_id, pass_att, pass_comp, pass_yds, pass_td,
      ints_thrown, rush_att, rush_yds, rush_td, targets, receptions, rec_yds, rec_td,
      tackles, sacks, interceptions, games_played)
    VALUES (@player_id, @year, @team_id, @pass_att, @pass_comp, @pass_yds, @pass_td,
      @ints_thrown, @rush_att, @rush_yds, @rush_td, @targets, @receptions, @rec_yds, @rec_td,
      @tackles, @sacks, @interceptions, @games_played)
    ON CONFLICT(player_id, year) DO UPDATE SET
      pass_att = pass_att + excluded.pass_att,
      pass_comp = pass_comp + excluded.pass_comp,
      pass_yds = pass_yds + excluded.pass_yds,
      pass_td = pass_td + excluded.pass_td,
      ints_thrown = ints_thrown + excluded.ints_thrown,
      rush_att = rush_att + excluded.rush_att,
      rush_yds = rush_yds + excluded.rush_yds,
      rush_td = rush_td + excluded.rush_td,
      targets = targets + excluded.targets,
      receptions = receptions + excluded.receptions,
      rec_yds = rec_yds + excluded.rec_yds,
      rec_td = rec_td + excluded.rec_td,
      tackles = tackles + excluded.tackles,
      sacks = sacks + excluded.sacks,
      interceptions = interceptions + excluded.interceptions,
      games_played = games_played + excluded.games_played
  `).run({
    pass_att: 0, pass_comp: 0, pass_yds: 0, pass_td: 0, ints_thrown: 0,
    rush_att: 0, rush_yds: 0, rush_td: 0, targets: 0, receptions: 0, rec_yds: 0, rec_td: 0,
    tackles: 0, sacks: 0, interceptions: 0, games_played: 0, team_id: null, ...s
  })
};

// ---------- Transactions ----------
const Transactions = {
  log: (teamId, type, description) => db.prepare(
    'INSERT INTO transactions (timestamp, team_id, type, description) VALUES (?, ?, ?, ?)'
  ).run(Date.now(), teamId, type, description)
};

// ---------- State ----------
const State = {
  get: (key, defaultVal = null) => {
    const row = db.prepare('SELECT value FROM league_state WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : defaultVal;
  },
  set: (key, value) => db.prepare(
    'INSERT INTO league_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value))
};

// ---------- Transaction helper ----------
const tx = (fn) => db.transaction(fn);

module.exports = {
  db,
  Teams, Players, Contracts, DraftPicks, Prospects, Schedule, Stats, Transactions, State, tx
};