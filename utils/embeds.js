const { EmbedBuilder } = require('discord.js');

const COLORS = { PRIMARY: 0x1a1f71, SUCCESS: 0x00a651, ERROR: 0xd50a0a, WARNING: 0xffa500, INFO: 0x00bfff };

function baseEmbed(title, color = COLORS.PRIMARY) {
  return new EmbedBuilder()
    .setTitle(title).setColor(color).setTimestamp()
    .setFooter({ text: 'NFL GM Simulator' });
}

function playerEmbed(p, team) {
  const e = baseEmbed(`${p.first_name} ${p.last_name}`, COLORS.PRIMARY)
    .addFields(
      { name: 'Position', value: p.position, inline: true },
      { name: 'OVR', value: `${p.overall}`, inline: true },
      { name: 'POT', value: `${p.potential}`, inline: true },
      { name: 'Age', value: `${p.age}`, inline: true },
      { name: 'Speed', value: `${p.speed}`, inline: true },
      { name: 'Strength', value: `${p.strength}`, inline: true },
      { name: 'Awareness', value: `${p.awareness}`, inline: true },
      { name: 'Dev', value: p.dev_trait, inline: true },
      { name: 'Exp', value: `${p.experience} yr`, inline: true }
    );
  if (team) e.addFields({ name: 'Team', value: team.name, inline: true });
  if (p.injury_weeks > 0) e.addFields({ name: '⚠️ Injured', value: `${p.injury_weeks} weeks`, inline: true });
  return e;
}

function rosterEmbed(team, players, page = 0, perPage = 20) {
  const active = players.filter(p => !p.is_on_practice_squad);
  const start = page * perPage;
  const pagePlayers = active.slice(start, start + perPage);
  const grouped = {};
  for (const p of pagePlayers) {
    if (!grouped[p.position]) grouped[p.position] = [];
    grouped[p.position].push(p);
  }
  const embed = baseEmbed(`${team.name} — Roster`, COLORS.PRIMARY);
  const order = ['QB','RB','FB','WR','TE','OT','OG','C','DE','DT','NT','OLB','ILB','MLB','CB','FS','SS','K','P','LS'];
  for (const pos of order) {
    if (grouped[pos]) embed.addFields({
      name: pos,
      value: grouped[pos].map(p => `**${p.overall}** ${p.first_name[0]}. ${p.last_name}`).join('\n'),
      inline: true
    });
  }
  embed.setFooter({ text: `Page ${page + 1}/${Math.ceil(active.length / perPage)} • ${active.length}/53` });
  return embed;
}

module.exports = { baseEmbed, playerEmbed, rosterEmbed, COLORS };