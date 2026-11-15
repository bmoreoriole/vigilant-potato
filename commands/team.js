const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { baseEmbed, COLORS } = require('../utils/embeds');
const { formatMoney } = require('../utils/helpers');
const { getOwnedTeam } = require('./_shared');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('Claim or view a team')
    .addSubcommand(sub => sub.setName('claim').setDescription('Claim a team')
      .addStringOption(o => o.setName('id').setDescription('Team ID (e.g. KC)').setRequired(true)))
    .addSubcommand(sub => sub.setName('release').setDescription('Release your team'))
    .addSubcommand(sub => sub.setName('info').setDescription('Show team info')
      .addStringOption(o => o.setName('id').setDescription('Team ID').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'claim') {
      const existing = getOwnedTeam(interaction);
      if (existing) return interaction.reply({ content: `You already own ${existing.id}.`, ephemeral: true });
      const id = interaction.options.getString('id').toUpperCase();
      const team = db.Teams.get(id);
      if (!team) return interaction.reply({ content: 'Team not found.', ephemeral: true });
      if (team.owner_id) return interaction.reply({ content: `${id} is already claimed.`, ephemeral: true });
      db.Teams.setOwner(id, interaction.user.id);
      interaction.reply(`✅ Claimed **${team.name}**.`);
    } else if (sub === 'release') {
      const team = getOwnedTeam(interaction);
      if (!team) return interaction.reply({ content: 'You do not own a team.', ephemeral: true });
      db.Teams.setOwner(team.id, null);
      interaction.reply(`Released ${team.id}.`);
    } else {
      const id = interaction.options.getString('id').toUpperCase();
      const team = db.Teams.get(id);
      if (!team) return interaction.reply({ content: 'Not found.', ephemeral: true });
      const owner = team.owner_id ? `<@${team.owner_id}>` : '*Unclaimed*';
      const embed = baseEmbed(`${team.id} — ${team.name}`, COLORS.PRIMARY)
        .addFields(
          { name: 'Record', value: `${team.wins}W-${team.losses}L-${team.ties}T`, inline: true },
          { name: 'Cap Space', value: formatMoney(team.cap_space), inline: true },
          { name: 'Division', value: `${team.conference} ${team.division}`, inline: true },
          { name: 'Owner', value: owner, inline: true },
          { name: 'Roster', value: `${db.Players.byTeam(id).length}/53`, inline: true }
        );
      interaction.reply({ embeds: [embed] });
    }
  }
};