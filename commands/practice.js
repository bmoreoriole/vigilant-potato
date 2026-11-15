const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { requireTeam } = require('./_shared');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('practice')
    .setDescription('Practice squad management')
    .addSubcommand(sub => sub.setName('list').setDescription('List your practice squad'))
    .addSubcommand(sub => sub.setName('add').setDescription('Move player to practice squad')
      .addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)))
    .addSubcommand(sub => sub.setName('promote').setDescription('Promote from practice squad')
      .addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true))),
  async execute(interaction) {
    const team = requireTeam(interaction);
    if (!team) return;
    const sub = interaction.options.getSubcommand();
    if (sub === 'list') {
      const ps = db.Players.practiceSquad(team.id);
      if (ps.length === 0) return interaction.reply('Practice squad empty.');
      interaction.reply(ps.map(p => `${p.position} ${p.first_name} ${p.last_name} (${p.overall})`).join('\n'));
    } else if (sub === 'add') {
      if (db.Players.practiceSquad(team.id).length >= 16)
        return interaction.reply({ content: 'Practice squad full (16).', ephemeral: true });
      const q = interaction.options.getString('player').toLowerCase();
      const p = db.Players.byTeam(team.id).find(pl =>
        !pl.is_on_practice_squad && `${pl.first_name} ${pl.last_name}`.toLowerCase().includes(q)
      );
      if (!p) return interaction.reply({ content: 'Not found on active roster.', ephemeral: true });
      db.Players.update(p.id, { is_on_practice_squad: 1 });
      interaction.reply(`${p.first_name} ${p.last_name} moved to practice squad.`);
    } else {
      const q = interaction.options.getString('player').toLowerCase();
      const p = db.Players.practiceSquad(team.id).find(pl =>
        `${pl.first_name} ${pl.last_name}`.toLowerCase().includes(q)
      );
      if (!p) return interaction.reply({ content: 'Not on practice squad.', ephemeral: true });
      if (db.Players.byTeam(team.id).filter(x => !x.is_on_practice_squad).length >= 53)
        return interaction.reply({ content: 'Active roster full.', ephemeral: true });
      db.Players.update(p.id, { is_on_practice_squad: 0 });
      interaction.reply(`${p.first_name} ${p.last_name} promoted to active roster.`);
    }
  }
};