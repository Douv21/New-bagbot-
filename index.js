const { Client, GatewayIntentBits, Events, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Import du Handler
const eco = require('./handlers/economyHandlers');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

// 2. Liaison Globale (pour que tes fichiers /commands voient ces fonctions)
global.handleEconomyAction = eco.handleEconomyAction;
global.getEconomyConfig = eco.getEconomyConfig;

client.commands = new Collection();

// 3. Chargement des commandes
const foldersPath = path.join(__dirname, 'commands');
if (fs.existsSync(foldersPath)) {
    const folders = fs.readdirSync(foldersPath);
    for (const folder of folders) {
        const fullPath = path.join(foldersPath, folder);
        if (fs.lstatSync(fullPath).isDirectory()) {
            const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));
            for (const file of files) {
                const command = require(path.join(fullPath, file));
                if (command.data) {
                    client.commands.set(command.data.name, command);
                    console.log(`✅ Commande chargée : ${command.data.name}`);
                }
            }
        }
    }
}

// 4. Gestion des interactions
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (err) {
            console.error(err);
            const msg = { content: "Erreur exécution !", ephemeral: true };
            interaction.replied ? await interaction.followUp(msg) : await interaction.reply(msg);
        }
    }

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) await command.autocomplete(interaction);
    }
});

client.once(Events.ClientReady, (c) => console.log(`🚀 ${c.user.tag} est en ligne !`));

const app = express();
app.listen(49500, '0.0.0.0', () => console.log("🌐 Web Port 49500"));

client.login(process.env.DISCORD_TOKEN);
