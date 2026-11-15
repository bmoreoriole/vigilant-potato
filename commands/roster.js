const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { rosterEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roster')
    .setDescription('View a team roster')
    .addStringOption(o => o.setName('team').setDescription('Team ID (default: yours)'))
    .addIntegerOption(o => o.setName('page').setDescription('Page').setMinValue(0)),
  async execute(interaction) {
    const teamId = interaction.options.getString('team')?.toUpperCase()
      || db.Teams.ownerOf(interaction.user.id)?.id;
    if (!teamId) return interaction.reply({ content: 'Specify a team or claim one.', ephemeral: true });
    const team = db.Teams.get(teamId);
    if (!team) return interaction.reply({ content: 'Team not found.', ephemeral: true });
    const players = db.Players.byTeam(teamId);
    if (players.length === 0) return interaction.reply({ content: 'Empty roster.', ephemeral: true });
    const page = interaction.options.getInteger('page') || 0;
    interaction.reply({ embeds: [rosterEmbed(team, players, page)] });
  }
};