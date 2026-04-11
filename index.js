const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

const app = express();
app.use(express.json());
app.use(express.static('public'));

// --- API POUR RÉCUPÉRER LES DONNÉES DU SERVEUR ---

app.get('/api/channels', async (req, res) => {
    const guild = client.guilds.cache.first();
    if (!guild) return res.json([]);
    const channels = guild.channels.cache
        .filter(c => c.type === 0) 
        .map(c => ({ id: c.id, name: c.name }));
    res.json(channels);
});

app.get('/api/roles', async (req, res) => {
    const guild = client.guilds.cache.first();
    if (!guild) return res.json([]);
    const roles = guild.roles.cache
        .filter(r => r.name !== "@everyone" && !r.managed)
        .map(r => ({ id: r.id, name: r.name }));
    res.json(roles);
});

// --- ENVOI DU PANNEAU DEPUIS LE DASHBOARD ---

app.post('/update-bot', async (req, res) => {
    const { title, roleId, channelId } = req.body;
    try {
        const channel = await client.channels.fetch(channelId);
        const embed = new EmbedBuilder()
            .setTitle(title || "Rôles-Réactions")
            .setDescription("Cliquez sur le bouton pour obtenir votre rôle.")
            .setColor("#ff4d4d");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`role_${roleId}`)
                .setLabel("Obtenir le rôle")
                .setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row] });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- GESTION DES BOUTONS ---

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith('role_')) {
        const roleId = interaction.customId.replace('role_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) return interaction.reply({ content: "Rôle introuvable.", ephemeral: true });

        try {
            if (interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `➖ Rôle **${role.name}** retiré.`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `➕ Rôle **${role.name}** ajouté.`, ephemeral: true });
            }
        } catch (e) {
            interaction.reply({ content: "Erreur : Mon rôle est trop bas dans la hiérarchie.", ephemeral: true });
        }
    }
});

client.once('ready', () => { console.log(`✅ Bot en ligne : ${client.user.tag}`); });
app.listen(49500, () => console.log("🌐 Dashboard: Port 49500"));
client.login(process.env.TOKEN);
