const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Import de ton Economy Handler
const economyHandler = require('./handlers/economyHandlers');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// Rendre l'économie accessible globalement pour tes fichiers de commandes
global.handleEconomyAction = economyHandler.handleEconomyAction;
global.getEconomyConfig = economyHandler.getEconomyConfig;

// Collection pour stocker les commandes
client.commands = new Collection();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 2. Chargement récursif des commandes (pour aller chercher dans /actions)
const foldersPath = path.join(__dirname, 'commands');
if (fs.existsSync(foldersPath)) {
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        // On vérifie si c'est bien un dossier
        if (fs.lstatSync(commandsPath).isDirectory()) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    console.log(`Loaded command: ${command.data.name}`);
                }
            }
        }
    }
}

// 3. Gestion des Interactions (Exécution + Autocomplétion)
client.on(Events.InteractionCreate, async interaction => {
    // Gestion des commandes Slash
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Une erreur est survenue !', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Une erreur est survenue !', ephemeral: true });
            }
        }
    }

    // IMPORTANT : Gestion de l'autocomplétion pour tes zones (ex: /69)
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Bot prêt ! Connecté en tant que ${readyClient.user.tag}`);
});

// Chargement de ton plugin autorole existant
try {
    const autorole = require('./plugins/autorole/index.js');
    autorole(app, client);
} catch (err) {
    console.error("Erreur chargement plugin:", err.message);
}

app.listen(49500, '0.0.0.0', () => {
    console.log("🌐 Dashboard sur le port 49500");
});

client.login(process.env.DISCORD_TOKEN);
