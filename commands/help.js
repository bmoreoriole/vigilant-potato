const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
  async execute(interaction) {
    const embed = baseEmbed('NFL GM Simulator', COLORS.PRIMARY)
      .setDescription('**Multiplayer NFL GM Simulator**\nClaim a team and run it — draft, trade, sign, simulate.')
      .addFields(
        { name: '🏈 Team', value: '`/team claim <id>` `/team release` `/team info <id>`' },
        { name: '📋 Roster', value: '`/roster [team] [page]` `/player <name>` `/depth [team] [position]`' },
        { name: '📈 Season', value: '`/schedule [team] [week]` `/standings [conf]` `/stats <player>`' },
        { name: '🔄 Trades', value: '`/trade offer <to> <give> <get>`\n`/trade offers`\n`/trade accept <id>`\n`/trade reject <id>`' },
        { name: '💰 Free Agency', value: '`/freeagents [position] [limit]` `/sign <player>` `/release <player>`' },
        { name: '🏟️ Practice Squad', value: '`/practice list` `/practice add <player>` `/practice promote <player>`' },
        { name: '🏆 Draft', value: '`/draft board [position]` `/draft picks` `/draft onclock` `/draft pick <prospect>`' },
        { name: '⏱️ Simulate', value: '`/simulate week` `/simulate game <id>` `/simulate season`' },
        { name: '🛠️ Admin', value: '`/admin ai_fa` `/admin progress` `/admin awards` `/admin start_playoffs` `/admin sim_playoffs` `/admin new_season`' }
      );
    interaction.reply({ embeds: [embed] });
  }
};