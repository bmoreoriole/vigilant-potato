const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('standings')
    .setDescription('Show league standings')
    .addStringOption(o => o.setName('conference').setDescription('AFC or NFC')),
  async execute(interaction) {
    const conf = interaction.options.getString('conference')?.toUpperCase();
    const teams = conf ? db.Teams.byConference(conf) : db.Teams.all();
    const sorted = [...teams].sort((a, b) => {
      const wa = (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties || 1);
      const wb = (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties || 1);
      if (wb !== wa) return wb - wa;
      return (b.points_for - b.points_against) - (a.points_for - a.points_against);
    });
    const embed = baseEmbed(`Standings${conf ? ` — ${conf}` : ''}`, COLORS.PRIMARY);
    embed.setDescription(sorted.map(t =>
      `**${t.id}** ${t.wins}-${t.losses}-${t.ties} | ${t.points_for}PF ${t.points_against}PA`
    ).join('\n'));
    interaction.reply({ embeds: [embed] });
  }
};