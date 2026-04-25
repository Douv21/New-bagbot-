const { Client, GatewayIntentBits, Collection, Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Charger les commandes
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[COMMANDE] Chargée: ${command.data.name}`);
        } else {
            console.log(`[AVERTISSEMENT] La commande dans ${filePath} manque des propriétés "data" ou "execute".`);
        }
    }
}

// Charger les événements
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// Connexion du bot
client.once(Events.ClientReady, c => {
    console.log(`[BOT] Connecté en tant que ${c.user.tag}`);
    
    // Enregistrement des commandes slash
    const commands = [];
    for (const command of client.commands.values()) {
        commands.push(command.data.toJSON());
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    (async () => {
        try {
            console.log('[COMMANDES] Début de l\'enregistrement des commandes slash...');
            
            if (process.env.GUILD_ID) {
                await rest.put(
                    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID),
                    { body: commands }
                );
                console.log('[COMMANDES] Commandes slash enregistrées pour le serveur de test.');
            } else {
                await rest.put(
                    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
                    { body: commands }
                );
                console.log('[COMMANDES] Commandes slash enregistrées globalement.');
            }
        } catch (error) {
            console.error('[ERREUR] Erreur lors de l\'enregistrement des commandes:', error);
        }
    })();
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('[ERREUR] Échec de la connexion:', error);
});

module.exports = client;
