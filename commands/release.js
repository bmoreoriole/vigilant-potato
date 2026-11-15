const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { releasePlayer } = require('../systems/freeAgency');
const { requireTeam } = require('./_shared');
const { formatMoney } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release a player')
    .addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)),
  async execute(interaction) {
    const team = requireTeam(interaction);
    if (!team) return;
    const q = interaction.options.getString('player').toLowerCase();
    const p = db.Players.byTeam(team.id).find(pl =>
      `${pl.first_name} ${pl.last_name}`.toLowerCase().includes(q)
    );
    if (!p) return interaction.reply({ content: 'Player not on your team.', ephemeral: true });
    const result = releasePlayer(team.id, p.id);
    if (!result.ok) return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
    interaction.reply(`Released **${p.first_name} ${p.last_name}**. Cap penalty: ${formatMoney(result.penalty)}.`);
  }
};