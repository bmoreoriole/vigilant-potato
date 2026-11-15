const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('View schedule')
    .addStringOption(o => o.setName('team').setDescription('Team ID'))
    .addIntegerOption(o => o.setName('week').setDescription('Week')),
  async execute(interaction) {
    const year = db.State.get('currentYear');
    const teamId = interaction.options.getString('team')?.toUpperCase()
      || db.Teams.ownerOf(interaction.user.id)?.id;
    const week = interaction.options.getInteger('week');

    if (week) {
      const games = db.Schedule.byWeek(year, week);
      if (games.length === 0) return interaction.reply('No games.');
      const embed = baseEmbed(`Week ${week}`, COLORS.PRIMARY);
      embed.setDescription(games.map(g =>
        `${g.home_team} vs ${g.away_team}${g.played ? ` — ${g.home_score}-${g.away_score}` : ''}`
      ).join('\n'));
      return interaction.reply({ embeds: [embed] });
    }
    if (!teamId) return interaction.reply('Specify team or week.');
    const games = db.Schedule.byTeam(teamId, year);
    if (games.length === 0) return interaction.reply('No games.');
    const embed = baseEmbed(`${teamId} Schedule`, COLORS.PRIMARY);
    embed.setDescription(games.map(g => {
      const opp = g.home_team === teamId ? g.away_team : g.home_team;
      const loc = g.home_team === teamId ? 'vs' : '@';
      const score = g.played
        ? ` — ${g.home_team === teamId ? g.home_score : g.away_score}-${g.home_team === teamId ? g.away_score : g.home_score}`
        : '';
      return `Wk${g.week}: ${loc} ${opp}${score}`;
    }).join('\n'));
    interaction.reply({ embeds: [embed] });
  }
};