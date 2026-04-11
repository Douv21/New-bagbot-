const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

const app = express();
app.use(express.json()); // Pour que le bot puisse lire les messages du Dashboard
app.use(express.static('public'));

// Variables pour stocker la config envoyée par le Dashboard
let currentDashboardConfig = {
    title: "🎒 Autorole",
    roleId: ""
};

// ROUTE : Le Dashboard envoie les infos ici
app.post('/update-bot', async (req, res) => {
    const { title, roleId, channelId } = req.body;
    
    try {
        const channel = await client.channels.fetch(channelId);
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription("Cliquez ci-dessous pour obtenir votre rôle.")
            .setColor("#00FF00");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('role_toggle')
                .setLabel('Obtenir le Rôle')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row] });
        currentDashboardConfig = { title, roleId }; // On sauvegarde
        
        res.json({ success: true, message: "Panneau envoyé sur Discord !" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Gestion du bouton (ID du rôle stocké dynamiquement)
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'role_toggle') {
        const role = interaction.guild.roles.cache.get(currentDashboardConfig.roleId);
        if (!role) return interaction.reply({ content: "❌ ID de rôle invalide.", ephemeral: true });

        if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            await interaction.reply({ content: `➖ Rôle retiré !`, ephemeral: true });
        } else {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: `➕ Rôle ajouté !`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
app.listen(49500, () => console.log("🌐 Dashboard lié au Bot sur le port 49500"));
