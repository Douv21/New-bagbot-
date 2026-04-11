const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const express = require('express');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

// --- CONFIGURATION ---
const PORT = 49500;
const BOT_ID = "TON_ID_DE_BOT_ICI"; // <--- METS TON ID ICI
const ROLE_ID = "ID_DU_ROLE_A_DONNER"; // <--- METS L'ID DU ROLE ICI

// --- DASHBOARD ---
const app = express();
app.use(express.static('public'));
app.listen(PORT, () => console.log(`🌐 Dashboard: http://192.168.1.133:${PORT}`));

// --- COMMANDES ---
const commands = [{ name: 'refresh-panel', description: 'Affiche le panneau de rôles' }];
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once('ready', async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(BOT_ID), { body: commands });
        console.log('✅ Commande /refresh-panel enregistrée');
    } catch (e) { console.error("Erreur deploy:", e); }
});

// --- LOGIQUE ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'refresh-panel') {
        try {
            const embed = new EmbedBuilder()
                .setTitle("🎒 Sélection des Rôles")
                .setDescription("Clique sur le bouton pour obtenir ton rôle.")
                .setColor("#5865F2");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('role_toggle')
                    .setLabel('Obtenir le Rôle')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error("Erreur interaction:", err);
        }
    }

    if (interaction.isButton() && interaction.customId === 'role_toggle') {
        const role = interaction.guild.roles.cache.get(ROLE_ID);
        if (!role) return interaction.reply({ content: "❌ Rôle introuvable. Vérifie l'ID dans le code.", ephemeral: true });

        try {
            if (interaction.member.roles.cache.has(ROLE_ID)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `➖ Rôle ${role.name} retiré !`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `➕ Rôle ${role.name} ajouté !`, ephemeral: true });
            }
        } catch (e) {
            await interaction.reply({ content: "⚠️ Erreur de permissions. Mon rôle doit être au-dessus.", ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
