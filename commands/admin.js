const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { aiFreeAgency } = require('../systems/freeAgency');
const { progressPlayers } = require('../systems/progression');
const { computeAwards } = require('../systems/awards');
const { generateProspectClass } = require('../systems/draft');
const { createWildCardRound } = require('../systems/playoffs');
const { simulateGame } = require('../systems/gameSim');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Commissioner tools')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName('advance_phase').setDescription('Advance league phase'))
    .addSubcommand(sub => sub.setName('ai_fa').setDescription('Run AI free agency'))
    .addSubcommand(sub => sub.setName('progress').setDescription('Run yearly progression'))
    .addSubcommand(sub => sub.setName('awards').setDescription('Compute season awards'))
    .addSubcommand(sub => sub.setName('new_draft_class').setDescription('Generate next year draft class'))
    .addSubcommand(sub => sub.setName('start_playoffs').setDescription('Start wild card round'))
    .addSubcommand(sub => sub.setName('sim_playoffs').setDescription('Sim wild card round'))
    .addSubcommand(sub => sub.setName('new_season').setDescription('Roll to next season')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const year = db.State.get('currentYear');

    if (sub === 'ai_fa') {
      aiFreeAgency();
      return interaction.reply('AI free agency complete.');
    }
    if (sub === 'progress') {
      progressPlayers(year);
      db.State.set('currentYear', year + 1);
      db.State.set('currentWeek', 1);
      db.State.set('phase', 'offseason');
      generateProspectClass(year + 1);
      return interaction.reply(`Progressed to year ${year + 1}.`);
    }
    if (sub === 'awards') {
      computeAwards(year);
      return interaction.reply('Awards computed.');
    }
    if (sub === 'new_draft_class') {
      generateProspectClass(year + 1);
      return interaction.reply(`Draft class for ${year + 1} created.`);
    }
    if (sub === 'start_playoffs') {
      createWildCardRound(year);
      return interaction.reply('Wild card round created.');
    }
    if (sub === 'sim_playoffs') {
      const games = db.db.prepare('SELECT * FROM schedule WHERE year = ? AND is_playoff = 1 AND played = 0').all(year);
      const log = [];
      for (const g of games) {
        const r = simulateGame(g.home_team, g.away_team);
        db.Schedule.record(g.id, r.homeScore, r.awayScore);
        log.push(`${g.away_team} ${r.awayScore} - ${r.homeScore} ${g.home_team}`);
      }
      return interaction.reply(log.join('\n') || 'No playoff games.');
    }
    if (sub === 'new_season') {
      db.Teams.all().forEach(t => db.Teams.resetRecord(t.id));
      const nextYear = year + 1;
      db.State.set('currentYear', nextYear);
      db.State.set('currentWeek', 1);
      db.State.set('phase', 'regular_season');
      return interaction.reply(`New season started: ${nextYear}.`);
    }
  }
};