require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const { initLeague } = require('./systems/season');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.commands = new Collection();

// Load all commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    try {
        require('./systems/playerGen').seedInitialPlayers();
        require('./systems/draft').seedInitialPicks(2025);
        require('./systems/season').initLeague();
        console.log('League initialized.');
    } catch (e) { console.error('Init Error:', e); }

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set([...client.commands.values()].map(c => c.data));
        console.log('Commands deployed.');
    }
});
    
    // Register slash commands (only for test Guild; for global use, remove GuildId)
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        await guild.commands.set([...client.commands.values()].map(c => c.data));
        console.log('Commands registered to guild.');
    }
;

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Error executing command.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);