const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { makeDraftPick } = require('../systems/draft');
const { requireTeam } = require('./_shared');
const CONFIG = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('draft')
    .setDescription('Draft commands')
    .addSubcommand(sub => sub.setName('board').setDescription('View draft prospects')
      .addStringOption(o => o.setName('position').setDescription('Filter by position'))
      .addIntegerOption(o => o.setName('limit').setDescription('How many').setMinValue(1).setMaxValue(25)))
    .addSubcommand(sub => sub.setName('picks').setDescription('View your draft picks'))
    .addSubcommand(sub => sub.setName('onclock').setDescription('Who is on the clock'))
    .addSubcommand(sub => sub.setName('pick').setDescription('Make a draft pick')
      .addStringOption(o => o.setName('prospect').setDescription('Prospect name').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const year = db.State.get('currentYear', CONFIG.SEASON_YEAR_START);

    if (sub === 'board') {
      const pos = interaction.options.getString('position')?.toUpperCase();
      const limit = interaction.options.getInteger('limit') || 15;
      let prospects = db.Prospects.byYear(year);
      if (pos) prospects = prospects.filter(p => p.position === pos);
      prospects = prospects.slice(0, limit);
      if (prospects.length === 0) return interaction.reply('No prospects.');
      interaction.reply(prospects.map(p =>
        `**${p.overall}** ${p.first_name} ${p.last_name} — ${p.position} (${p.college})`
      ).join('\n'));
    } else if (sub === 'picks') {
      const team = requireTeam(interaction);
      if (!team) return;
      const picks = db.DraftPicks.byTeam(team.id, year);
      if (picks.length === 0) return interaction.reply('No draft picks.');
      interaction.reply(picks.map(p => `R${p.round} #${p.pick_number}`).join('\n'));
    } else if (sub === 'onclock') {
      const next = db.DraftPicks.nextAvailable(year);
      if (!next) return interaction.reply('Draft complete.');
      const owner = db.Teams.get(next.current_team);
      interaction.reply(`On the clock: **${owner.name}** (${owner.owner_id ? `<@${owner.owner_id}>` : 'unclaimed'})\nRound ${next.round}, Pick #${next.pick_number}`);
    } else {
      const team = requireTeam(interaction);
      if (!team) return;
      const next = db.DraftPicks.nextAvailable(year);
      if (!next || next.current_team !== team.id)
        return interaction.reply({ content: 'You are not on the clock.', ephemeral: true });
      const q = interaction.options.getString('prospect').toLowerCase();
      const prospects = db.Prospects.byYear(year);
      const prospect = prospects.find(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
      );
      if (!prospect) return interaction.reply({ content: 'Prospect not found.', ephemeral: true });
      const result = makeDraftPick(next.id, prospect.id);
      if (!result.ok) return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
      interaction.reply(`✅ Drafted **${prospect.first_name} ${prospect.last_name}** (${prospect.position}) at pick #${next.pick_number}`);
    }
  }
};