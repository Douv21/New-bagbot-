const { Client, GatewayIntentBits, Collection } = require('discord.js');
const PluginManager = require('./core/pluginManager');
const startAPI = require('./core/api');
require('dotenv').config();

// 1. Initialisation du Client Discord avec les intents nécessaires
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 2. Initialisation du Gestionnaire de Plugins (Le Cerveau)
// Il va scanner le dossier /plugins pour trouver tes modules (Auto-role, etc.)
const manager = new PluginManager(client);

client.once('ready', async () => {
    console.log('-------------------------------------------');
    console.log(`✅ Bot en ligne : ${client.user.tag}`);
    console.log(`🤖 ID du Bot : ${client.user.id}`);
    
    // Chargement dynamique des modules style Home Assistant
    try {
        manager.loadAll();
        console.log(`📦 Modules chargés avec succès.`);
    } catch (err) {
        console.error(`❌ Erreur lors du chargement des modules :`, err);
    }

    // Lancement de l'API pour le Panel Web
    try {
        startAPI(manager);
    } catch (err) {
        console.error(`🌐 Erreur lors du lancement de l'API :`, err);
    }
    
    console.log('-------------------------------------------');
});

// 3. Gestion des interactions (Boutons, Commandes Slash)
client.on('interactionCreate', async (interaction) => {
    // Si c'est une commande Slash (/config)
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands?.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Une erreur est survenue !', ephemeral: true });
        }
    }

    // Si c'est un bouton (Système Auto-Role)
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('role_')) {
            const roleId = interaction.customId.replace('role_', '');
            const role = interaction.guild.roles.cache.get(roleId);

            if (!role) return interaction.reply({ content: "Rôle introuvable.", ephemeral: true });

            if (interaction.member.roles.cache.has(roleId)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `Rôle ${role.name} retiré !`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `Rôle ${role.name} ajouté !`, ephemeral: true });
            }
        }
    }
});

// 4. Connexion au Token (Secret GitHub)
client.login(process.env.DISCORD_TOKEN);
