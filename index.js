const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const PluginManager = require('./core/pluginManager');
const startAPI = require('./core/api');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const manager = new PluginManager(client);

client.once('ready', () => {
    console.log(`✅ Bot connecté : ${client.user.tag}`);
    manager.loadAll();
    startAPI(manager);
});

client.on('interactionCreate', async (interaction) => {
    // 1. COMMANDE DE CONFIGURATION (Pour envoyer l'embed avec le GIF)
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup-roles') {
        const plugin = manager.plugins.get('autorole');
        if (!plugin) return interaction.reply("❌ Plugin non trouvé.");

        const { visuals, options } = plugin.data;

        const embed = new EmbedBuilder()
            .setTitle(visuals.title)
            .setDescription(visuals.description)
            .setImage(visuals.gif_url)
            .setColor(visuals.color)
            .setFooter({ text: visuals.footer });

        const row = new ActionRowBuilder();
        options.forEach(opt => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(opt.id)
                    .setLabel(opt.label)
                    .setEmoji(opt.emoji)
                    .setStyle(ButtonStyle[opt.style])
            );
        });

        await interaction.reply({ embeds: [embed], components: [row] });
    }

    // 2. GESTION DES CLICS SUR LES BOUTONS (Recherche par NOM)
    if (interaction.isButton()) {
        const plugin = manager.plugins.get('autorole');
        if (!plugin) return;

        // On cherche l'option qui correspond au bouton cliqué
        const option = plugin.data.options.find(opt => opt.id === interaction.customId);
        if (!option) return;

        // RECHERCHE DU RÔLE PAR SON NOM
        const role = interaction.guild.roles.cache.find(r => r.name === option.roleName);

        if (!role) {
            return interaction.reply({ 
                content: `❌ Le rôle "**${option.roleName}**" est introuvable sur ce serveur.`, 
                ephemeral: true 
            });
        }

        try {
            if (interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `✅ Rôle **${role.name}** retiré !`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `✅ Rôle **${role.name}** ajouté !`, ephemeral: true });
            }
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "❌ Je n'ai pas les permissions pour gérer ce rôle.", ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
