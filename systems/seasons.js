const db = require('../database/db');
const { generateSchedule } = require('../data/scheduleGen');
const teamsData = require('../data/teams');
const CONFIG = require('../config');

function initLeague() {
  const count = db.Teams.all().length;
  if (count > 0) return;
  for (const t of teamsData) db.Teams.insert(t);
  const year = CONFIG.SEASON_YEAR_START;
  const sched = generateSchedule(teamsData, year);
  for (const g of sched) {
    db.Schedule.insert({ year: g.year, week: g.week, home_team: g.home, away_team: g.away });
  }
  db.State.set('currentYear', year);
  db.State.set('currentWeek', 1);
  console.log('League created.');
}

function advanceWeek() {
  const year = db.State.get('currentYear');
  const week = db.State.get('currentWeek');
  if (!db.Schedule.hasWeekPlayed(year, week)) return { ok: false, reason: 'Simulate all games first' };
  if (week >= 18) {
    return { ok: false, reason: 'Regular season complete. Use /playoffs' };
  }
  db.State.set('currentWeek', week + 1);
  return { ok: true, week: week + 1 };
}

module.exports = { initLeague, advanceWeek };