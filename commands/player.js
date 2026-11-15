const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { playerEmbed } = require('../utils/embeds');
const { formatMoney } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('View a player')
    .addStringOption(o => o.setName('name').setDescription('Player name').setRequired(true)),
  async execute(interaction) {
    const q = interaction.options.getString('name').toLowerCase();
    const all = db.Players.all();
    const match = all.find(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    );
    if (!match) return interaction.reply({ content: 'Player not found.', ephemeral: true });
    const team = match.team_id ? db.Teams.get(match.team_id) : null;
    const embed = playerEmbed(match, team);
    const contract = db.Contracts.get(match.id);
    if (contract) {
      embed.addFields({
        name: 'Contract',
        value: `${formatMoney(contract.salary)} • ${contract.years_remaining} yrs`,
        inline: true
      });
    }
    interaction.reply({ embeds: [embed] });
  }
};