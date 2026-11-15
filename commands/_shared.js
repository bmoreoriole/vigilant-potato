const db = require('../database/db');

function getOwnedTeam(interaction) {
  return db.Teams.ownerOf(interaction.user.id);
}

function requireTeam(interaction) {
  const team = getOwnedTeam(interaction);
  if (!team) {
    interaction.reply({ content: '❌ You do not own a team. Use `/claim <team>` first.', ephemeral: true });
    return null;
  }
  return team;
}

module.exports = { getOwnedTeam, requireTeam };