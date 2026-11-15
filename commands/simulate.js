const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { simulateGame } = require('../systems/gameSim');
const { rollInjuries, healPlayers } = require('../systems/injuries');
const { baseEmbed, COLORS } = require('../utils/embeds');

function simOneGame(game) {
  const result = simulateGame(game.home_team, game.away_team);
  db.Schedule.record(game.id, result.homeScore, result.awayScore);
  if (result.homeScore > result.awayScore) {
    db.Teams.recordWin(game.home_team, result.homeScore, result.awayScore);
    db.Teams.recordLoss(game.away_team, result.awayScore, result.homeScore);
  } else {
    db.Teams.recordWin(game.away_team, result.awayScore, result.homeScore);
    db.Teams.recordLoss(game.home_team, result.homeScore, result.awayScore);
  }
  rollInjuries(game.home_team);
  rollInjuries(game.away_team);
  return result;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('simulate')
    .setDescription('Simulate games')
    .addSubcommand(sub => sub.setName('week').setDescription('Simulate current week'))
    .addSubcommand(sub => sub.setName('game').setDescription('Simulate one game')
      .addStringOption(o => o.setName('game_id').setDescription('Game ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('season').setDescription('Sim remaining regular season')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const year = db.State.get('currentYear');
    const week = db.State.get('currentWeek');

    if (sub === 'game') {
      const gameId = parseInt(interaction.options.getString('game_id'));
      const game = db.Schedule.get(gameId);
      if (!game) return interaction.reply('Game not found.');
      if (game.played) return interaction.reply('Game already played.');
      const r = simOneGame(game);
      return interaction.reply(`**${game.home_team}** ${r.homeScore} - ${r.awayScore} **${game.away_team}**`);
    }

    if (sub === 'week') {
      const games = db.Schedule.byWeek(year, week);
      if (games.length === 0) return interaction.reply('No games this week.');
      const results = [];
      for (const g of games) {
        const r = simOneGame(g);
        results.push(`**${g.home_team}** ${r.homeScore} - ${r.awayScore} **${g.away_team}**`);
      }
      healPlayers();
      // Advance week automatically
      if (week >= 18) {
        db.State.set('currentWeek', 18);
        db.State.set('phase', 'playoffs');
      } else {
        db.State.set('currentWeek', week + 1);
      }
      const embed = baseEmbed(`Week ${week} Results`, COLORS.SUCCESS)
        .setDescription(results.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'season') {
      let w = week;
      const log = [];
      while (w <= 18) {
        const games = db.Schedule.byWeek(year, w);
        if (games.length === 0) break;
        if (!db.Schedule.hasWeekPlayed(year, w)) {
          for (const g of games) simOneGame(g);
        }
        log.push(`Week ${w}: simmed ${games.length} games`);
        w++;
      }
      db.State.set('currentWeek', 18);
      db.State.set('phase', 'playoffs');
      interaction.reply(`Simmed remaining season.\n${log.join('\n')}`);
    }
  }
};