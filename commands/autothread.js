const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autothread')
        .setDescription('Gérer le système d\'auto-threads')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajouter un salon pour l\'auto-thread')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon à configurer')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Nom du thread (utilisez {author} pour l\'auteur)')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('archive')
                        .setDescription('Durée avant archivage (en heures)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(168)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Supprimer un salon de l\'auto-thread')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Salon à supprimer')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Voir les salons configurés pour l\'auto-thread')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Activer/désactiver l\'auto-thread')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                await addAutoThread(interaction);
                break;
            case 'remove':
                await removeAutoThread(interaction);
                break;
            case 'list':
                await listAutoThreads(interaction);
                break;
            case 'toggle':
                await toggleAutoThread(interaction);
                break;
        }
    }
};

async function addAutoThread(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de gérer les auto-threads.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const threadName = interaction.options.getString('name') || '💬 {author}';
    const archiveHours = interaction.options.getInteger('archive') || 24;

    if (!channel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Salon invalide')
            .setDescription('Veuillez sélectionner un salon textuel.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const threadConfig = {
        channelId: channel.id,
        channelName: channel.name,
        threadName: threadName,
        archiveHours: archiveHours,
        guildId: interaction.guild.id
    };

    await database.addAutoThread(interaction.guild.id, threadConfig);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Auto-thread configuré')
        .setDescription('Le salon a été configuré pour l\'auto-thread avec succès !')
        .addFields(
            { name: 'Salon', value: `<#${channel.id}>`, inline: true },
            { name: 'Nom du thread', value: threadName, inline: true },
            { name: 'Archivage', value: `${archiveHours} heures`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function removeAutoThread(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de gérer les auto-threads.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    const autoThreads = await database.getAutoThreads(interaction.guild.id);
    const threadConfig = autoThreads.find(t => t.channelId === channel.id);

    if (!threadConfig) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Configuration introuvable')
            .setDescription('Ce salon n\'est pas configuré pour l\'auto-thread.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await database.removeAutoThread(interaction.guild.id, threadConfig.id);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Auto-thread supprimé')
        .setDescription('Le salon a été retiré de l\'auto-thread.')
        .addFields(
            { name: 'Salon', value: `<#${channel.id}>`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function listAutoThreads(interaction) {
    const autoThreads = await database.getAutoThreads(interaction.guild.id);

    if (autoThreads.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('📋 Auto-threads')
            .setDescription('Aucun salon n\'est configuré pour l\'auto-thread.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('📋 Salons avec auto-thread')
        .setDescription('Voici les salons configurés pour l\'auto-thread:')
        .setTimestamp();

    autoThreads.forEach((config, index) => {
        const channel = interaction.guild.channels.cache.get(config.channelId);
        const channelName = channel ? channel.name : 'Salon supprimé';
        
        embed.addFields({
            name: `${index + 1}. ${channelName}`,
            value: `**Nom du thread:** ${config.threadName}\n**Archivage:** ${config.archiveHours} heures\n**ID:** \`${config.id}\``,
            inline: false
        });
    });

    await interaction.reply({ embeds: [embed] });
}

async function toggleAutoThread(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageThreads)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de gérer les auto-threads.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guild = await database.getGuild(interaction.guild.id);
    
    if (!guild.autothreads) {
        guild.autothreads = { enabled: true };
    } else {
        guild.autothreads.enabled = !guild.autothreads.enabled;
    }

    await database.setGuild(interaction.guild.id, guild);

    const embed = new EmbedBuilder()
        .setColor(guild.autothreads.enabled ? '#00ff00' : '#ff0000')
        .setTitle('✅ Auto-threads ' + (guild.autothreads.enabled ? 'activés' : 'désactivés'))
        .setDescription(`L'auto-thread est maintenant ${guild.autothreads.enabled ? 'activé' : 'désactivé'} sur ce serveur.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

// Événement pour créer des threads automatiquement
module.exports.handleMessage = async (message) => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Ignorer les messages qui sont déjà dans un thread
    if (message.channel.isThread()) return;

    // Ignorer les messages de commande
    if (message.content.startsWith('/')) return;

    try {
        const guild = await database.getGuild(message.guild.id);
        
        if (!guild.autothreads?.enabled) return;

        const autoThreads = await database.getAutoThreads(message.guild.id);
        const threadConfig = autoThreads.find(t => t.channelId === message.channel.id);

        if (!threadConfig) return;

        // Vérifier si le message a déjà un thread
        if (message.thread) return;

        // Formater le nom du thread
        const threadName = threadConfig.threadName
            .replace(/{author}/g, message.author.username)
            .replace(/{userid}/g, message.author.id)
            .replace(/{time}/g, new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

        // Créer le thread
        const thread = await message.startThread({
            name: threadName,
            autoArchiveDuration: threadConfig.archiveHours * 60, // Convertir en minutes
            reason: 'Auto-thread créé automatiquement'
        });

        // Envoyer un message de bienvenue dans le thread
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('💬 Discussion créée')
            .setDescription(`Ce thread a été créé automatiquement pour discuter du message de ${message.author}.`)
            .addFields(
                { name: 'Message original', value: `[Aller au message](${message.url})`, inline: true },
                { name: 'Archivage automatique', value: `Après ${threadConfig.archiveHours} heures d'inactivité`, inline: true }
            )
            .setTimestamp();

        await thread.send({ embeds: [welcomeEmbed] });

        console.log(`Auto-thread créé: ${thread.name} dans ${message.channel.name}`);

    } catch (error) {
        console.error('Erreur lors de la création de l\'auto-thread:', error);
    }
};
