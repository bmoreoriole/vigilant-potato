const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { formatMoney } = require('../utils/helpers');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('freeagents')
    .setDescription('List top free agents')
    .addStringOption(o => o.setName('position').setDescription('Filter by position'))
    .addIntegerOption(o => o.setName('limit').setDescription('How many to show').setMinValue(1).setMaxValue(25)),
  async execute(interaction) {
    const pos = interaction.options.getString('position')?.toUpperCase();
    const limit = interaction.options.getInteger('limit') || 15;
    let fas = db.Players.freeAgents();
    if (pos) fas = fas.filter(p => p.position === pos);
    fas = fas.slice(0, limit);
    if (fas.length === 0) return interaction.reply({ content: 'No free agents found.', ephemeral: true });
    const embed = baseEmbed(`Free Agents${pos ? ` — ${pos}` : ''}`, COLORS.INFO);
    embed.setDescription(fas.map(p =>
      `**${p.overall}** ${p.first_name[0]}. ${p.last_name} • ${p.position} • Age ${p.age}`
    ).join('\n'));
    interaction.reply({ embeds: [embed] });
  }
};