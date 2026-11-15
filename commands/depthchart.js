const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const CONFIG = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('depth')
    .setDescription('View depth chart')
    .addStringOption(o => o.setName('team').setDescription('Team ID'))
    .addStringOption(o => o.setName('position').setDescription('Position')),
  async execute(interaction) {
    const teamId = interaction.options.getString('team')?.toUpperCase()
      || db.Teams.ownerOf(interaction.user.id)?.id;
    if (!teamId) return interaction.reply('Specify a team.');
    const pos = interaction.options.getString('position')?.toUpperCase();
    let players = db.Players.byTeam(teamId).filter(p => !p.is_on_practice_squad);
    if (pos) players = players.filter(p => p.position === pos);
    const grouped = {};
    for (const p of players) {
      if (!grouped[p.position]) grouped[p.position] = [];
      grouped[p.position].push(p);
    }
    const lines = [];
    for (const [position, list] of Object.entries(grouped)) {
      const sorted = list.sort((a, b) => b.overall - a.overall);
      lines.push(`**${position}**: ${sorted.map(p => `${p.overall} ${p.last_name}`).join(' > ')}`);
    }
    interaction.reply(lines.join('\n') || 'Empty roster.');
  }
};