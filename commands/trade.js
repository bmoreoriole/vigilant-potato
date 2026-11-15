const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const tradeSystem = require('../systems/trade');
const { requireTeam } = require('./_shared');
const { baseEmbed, COLORS } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade system')
    .addSubcommand(sub => sub.setName('offer').setDescription('Offer a trade')
      .addStringOption(o => o.setName('to').setDescription('Team ID').setRequired(true))
      .addStringOption(o => o.setName('give').setDescription('Player names to give (comma sep)').setRequired(true))
      .addStringOption(o => o.setName('get').setDescription('Player names to request (comma sep)').setRequired(true)))
    .addSubcommand(sub => sub.setName('offers').setDescription('List your pending offers'))
    .addSubcommand(sub => sub.setName('accept').setDescription('Accept an offer')
      .addStringOption(o => o.setName('id').setDescription('Offer ID').setRequired(true)))
    .addSubcommand(sub => sub.setName('reject').setDescription('Reject an offer')
      .addStringOption(o => o.setName('id').setDescription('Offer ID').setRequired(true))),
  async execute(interaction) {
    const team = requireTeam(interaction);
    if (!team) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'offer') {
      const toId = interaction.options.getString('to').toUpperCase();
      const toTeam = db.Teams.get(toId);
      if (!toTeam) return interaction.reply({ content: 'Target team not found.', ephemeral: true });
      if (!toTeam.owner_id) return interaction.reply({ content: 'Target team is unclaimed.', ephemeral: true });

      const resolve = (nameStr, teamId) => {
        const names = nameStr.split(',').map(s => s.trim().toLowerCase());
        const roster = db.Players.byTeam(teamId);
        const found = [];
        for (const n of names) {
          const p = roster.find(pl => `${pl.first_name} ${pl.last_name}`.toLowerCase().includes(n));
          if (!p) return { error: `Player "${n}" not on ${teamId}` };
          found.push(p.id);
        }
        return { ids: found };
      };
      const give = resolve(interaction.options.getString('give'), team.id);
      const get = resolve(interaction.options.getString('get'), toId);
      if (give.error) return interaction.reply({ content: give.error, ephemeral: true });
      if (get.error) return interaction.reply({ content: get.error, ephemeral: true });

      const id = tradeSystem.createOffer(team.id, toId, give.ids, get.ids, [], []);
      await interaction.reply(`📨 Trade offer **${id}** sent to ${toId}.`);
      // Notify owner
      try {
        const owner = await interaction.client.users.fetch(toTeam.owner_id);
        await owner.send(`You have a trade offer from **${team.id}** (ID: ${id}). Use /trade offers`);
      } catch {}
    } else if (sub === 'offers') {
      const offers = tradeSystem.getPendingOffers(team.id);
      if (offers.length === 0) return interaction.reply({ content: 'No pending offers.', ephemeral: true });
      const lines = offers.map(o => {
        const give = JSON.parse(o.offer_players).map(id => db.Players.get(id)).filter(Boolean);
        const get = JSON.parse(o.request_players).map(id => db.Players.get(id)).filter(Boolean);
        return `**${o.id}** from ${o.from_team}\nYou get: ${give.map(p => p.last_name).join(', ')}\nYou give: ${get.map(p => p.last_name).join(', ')}`;
      });
      interaction.reply({ content: lines.join('\n\n') });
    } else if (sub === 'accept') {
      const id = interaction.options.getString('id');
      const offer = db.db.prepare('SELECT * FROM trade_offers WHERE id = ? AND to_team = ? AND status = ?')
        .get(id, team.id, 'pending');
      if (!offer) return interaction.reply({ content: 'Offer not found.', ephemeral: true });
      const result = tradeSystem.executeTrade(
        offer.from_team, offer.to_team,
        JSON.parse(offer.offer_players), JSON.parse(offer.request_players),
        JSON.parse(offer.offer_picks), JSON.parse(offer.request_picks)
      );
      if (!result.ok) return interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
      db.db.prepare('UPDATE trade_offers SET status = ? WHERE id = ?').run('accepted', id);
      interaction.reply(`✅ Trade accepted.`);
    } else {
      const id = interaction.options.getString('id');
      db.db.prepare('UPDATE trade_offers SET status = ? WHERE id = ? AND to_team = ?').run('rejected', id, team.id);
      interaction.reply(`Rejected offer ${id}.`);
    }
  }
};