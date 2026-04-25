const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Import du Handler d'économie
const eco = require('./handlers/economyHandlers');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers
    ]
});

// 2. Rendre l'économie accessible globalement
global.handleEconomyAction = eco.handleEconomyAction;
global.getEconomyConfig = eco.getEconomyConfig;

// Collection pour stocker les commandes
client.commands = new Collection();

// 3. FONCTION DE CHARGEMENT RÉCURSIF DES COMMANDES
// Cette fonction cherche dans /commands et tous ses sous-dossiers
const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.lstatSync(filePath);

        if (stat.isDirectory()) {
            loadCommands(filePath); // Si c'est un dossier, on regarde dedans
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Commande chargée : ${command.data.name}`);
            }
        }
    }
};

const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
} else {
    console.error("❌ Erreur : Le dossier 'commands' n'existe pas !");
}

// 4. GESTION DES INTERACTIONS
client.on(Events.InteractionCreate, async interaction => {
    // --- Commandes Slash ---
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`[Erreur Execute] ${interaction.commandName}:`, error);
            const errorMsg = { content: 'Une erreur est survenue !', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg);
            } else {
                await interaction.reply(errorMsg);
            }
        }
    }

    // --- Autocomplétion (pour les zones du /69 par exemple) ---
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command && command.autocomplete) {
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`[Erreur Autocomplete]`, error);
            }
        }
    }
});

// 5. ÉVÉNEMENT PRÊT
client.once(Events.ClientReady, (readyClient) => {
    console.log(`🚀 Bot prêt ! Connecté en tant que ${readyClient.user.tag}`);
});

// 6. DASHBOARD & PLUGINS
const app = express();
app.use(express.json());
app.use(express.static('public'));

// Chargement du plugin autorole si présent
try {
    const autorolePath = './plugins/autorole/index.js';
    if (fs.existsSync(autorolePath)) {
        const autorole = require(autorolePath);
        autorole(app, client);
    }
} catch (err) {
    console.error("⚠️ Erreur chargement plugin autorole:", err.message);
}

// Lancement du serveur Web pour le Dashboard
app.listen(49500, '0.0.0.0', () => {
    console.log("🌐 Dashboard API sur le port 49500");
});

// Connexion au bot
client.login(process.env.DISCORD_TOKEN);
