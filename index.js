const { Client, GatewayIntentBits, Events } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

// IMPORTANT : Correction de l'événement "ready" en "ClientReady"
client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Bot prêt ! Connecté en tant que ${readyClient.user.tag}`);
});

// Chargement sécurisé de ton plugin autorole
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
