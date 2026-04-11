const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, REST, Routes 
} = require('discord.js');
const express = require('express');
require('dotenv').config();

// --- CONFIGURATION DU BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PORT = 49500;
const app = express();
app.use(express.static('public'));

// --- ENREGISTREMENT DE LA COMMANDE /refresh-panel ---
const commands = [{
    name: 'refresh-panel',
    description: 'Affiche le panneau de gestion des rôles'
}];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function registerCommands() {
    try {
        console.log('⏳ Mise à jour des commandes (/)');
        // Remplace l'ID ci-dessous par ton APPLICATION ID si nécessaire
        await rest.put(
            Routes.applicationCommands("TON_ID_DE_BOT_ICI"), 
            { body: commands }
        );
        console.log('✅ Commandes enregistrées !');
    } catch (error) {
        console.error('❌ Erreur deploiement:', error);
    }
}

// --- LOGIQUE DE L'AUTOROLE ---
// Tu peux modifier ces valeurs ici ou créer un système qui lit ton config.json
const panelConfig = {
    title: "🎒 Sélection de tes Rôles",
    description: "Clique sur les boutons pour obtenir ou retirer un rôle.",
    roles: [
        { id: "ID_DU_ROLE_1", label: "Membre", emoji: "✅", style: ButtonStyle.Success },
        { id: "ID_DU_ROLE_2", label: "News", emoji: "📢", style: ButtonStyle.Primary }
    ]
};

client.on('interactionCreate', async (interaction) => {
    // 1. Envoi du Panneau
    if (interaction.isChatInputCommand() && interaction.commandName === 'refresh-panel') {
        const embed = new EmbedBuilder()
            .setTitle(panelConfig.title)
            .setDescription(panelConfig.description)
            .setColor('#7289da');

        const row = new ActionRowBuilder();
        panelConfig.roles.forEach(r => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_${r.id}`)
                    .setLabel(r.label)
                    .setEmoji(r.emoji)
                    .setStyle(r.style)
            );
        });

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // 2. Gestion des clics sur les boutons
    if (interaction.isButton() && interaction.customId.startsWith('role_')) {
        const roleId = interaction.customId.replace('role_', '');
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) return interaction.reply({ content: "❌ Rôle introuvable.", ephemeral: true });

        try {
            if (interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `➖ Rôle **${role.name}** retiré !`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `➕ Rôle **${role.name}** ajouté !`, ephemeral: true });
            }
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "⚠️ Erreur : Vérifie que mon rôle est bien AU-DESSUS des autres !", ephemeral: true });
        }
    }
});

// --- DÉMARRAGE ---
client.once('ready', () => {
    
