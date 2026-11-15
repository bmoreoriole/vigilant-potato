const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { signFreeAgent } = require('../systems/freeAgency');
const { requireTeam } = require('./_shared');
const { formatMoney } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sign')
    .setDescription('Sign a free agent')
    .addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)),
  async execute(interaction) {
    const team = requireTeam(interaction);
    if (!team) return;
    const q = interaction.options.getString('player').toLowerCase();
    const fa = db.Players.freeAgents().find(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    );
    if (!fa) return interaction.reply({ content: 'Free agent not found.', ephemeral: true });
    const result = signFreeAgent(team.id, fa.id);
    if (!result.ok) return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
    interaction.reply(`✅ Signed **${fa.first_name} ${fa.last_name}** for ${formatMoney(result.cost)}.`);
  }
};