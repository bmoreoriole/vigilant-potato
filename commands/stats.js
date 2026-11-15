const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View player stats')
    .addStringOption(o => o.setName('player').setDescription('Player name').setRequired(true)),
  async execute(interaction) {
    const q = interaction.options.getString('player').toLowerCase();
    const p = db.Players.all().find(pl =>
      `${pl.first_name} ${pl.last_name}`.toLowerCase().includes(q)
    );
    if (!p) return interaction.reply('Player not found.');
    const year = db.State.get('currentYear');
    const stats = db.db.prepare('SELECT * FROM player_season_stats WHERE player_id = ? AND year = ?').get(p.id, year);
    if (!stats) return interaction.reply('No stats for this season yet.');
    const embed = baseEmbed(`${p.first_name} ${p.last_name} — ${year}`, COLORS.INFO);
    const fields = [];
    if (stats.pass_att > 0) fields.push(`Pass: ${stats.pass_comp}/${stats.pass_att}, ${stats.pass_yds} yds, ${stats.pass_td} TD, ${stats.ints_thrown} INT`);
    if (stats.rush_att > 0) fields.push(`Rush: ${stats.rush_att} att, ${stats.rush_yds} yds, ${stats.rush_td} TD`);
    if (stats.receptions > 0) fields.push(`Rec: ${stats.receptions}/${stats.targets}, ${stats.rec_yds} yds, ${stats.rec_td} TD`);
    if (stats.tackles > 0) fields.push(`Def: ${stats.tackles} tkl, ${stats.sacks} sck, ${stats.interceptions} int`);
    embed.setDescription(fields.join('\n') || 'No stats.');
    interaction.reply({ embeds: [embed] });
  }
};