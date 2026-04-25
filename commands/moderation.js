const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Commandes de modération')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Bannir un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur à bannir')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Raison du bannissement')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Expulser un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur à expulser')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Raison de l\'expulsion')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Rendre muet un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur à rendre muet')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Durée en minutes')
                        .setRequired(false)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Raison du mute')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Avertir un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur à avertir')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Raison de l\'avertissement')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Supprimer des messages')
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Nombre de messages à supprimer')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnings')
                .setDescription('Voir les avertissements d\'un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Utilisateur')
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ban':
                await banUser(interaction);
                break;
            case 'kick':
                await kickUser(interaction);
                break;
            case 'mute':
                await muteUser(interaction);
                break;
            case 'warn':
                await warnUser(interaction);
                break;
            case 'clear':
                await clearMessages(interaction);
                break;
            case 'warnings':
                await showWarnings(interaction);
                break;
        }
    }
};

async function banUser(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée';

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de bannir des membres.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Impossible de bannir')
            .setDescription('Vous ne pouvez pas bannir un administrateur.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
        await interaction.guild.bans.create(target.id, { reason });

        // Log de modération
        await logModeration(interaction, 'ban', target, reason);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔨 Utilisateur banni')
            .setDescription(`**${target.tag}** a été banni du serveur.`)
            .addFields(
                { name: 'Raison', value: reason, inline: false },
                { name: 'Modérateur', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du bannissement.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function kickUser(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée';

    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission d\'expulser des membres.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Utilisateur introuvable')
            .setDescription('Cet utilisateur n\'est pas sur le serveur.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Impossible d\'expulser')
            .setDescription('Vous ne pouvez pas expulser un administrateur.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
        await member.kick(reason);

        // Log de modération
        await logModeration(interaction, 'kick', target, reason);

        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('👢 Utilisateur expulsé')
            .setDescription(`**${target.tag}** a été expulsé du serveur.`)
            .addFields(
                { name: 'Raison', value: reason, inline: false },
                { name: 'Modérateur', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'expulsion.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function muteUser(interaction) {
    const target = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration') || 10;
    const reason = interaction.options.getString('reason') || 'Aucune raison spécifiée';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de rendre muet des membres.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Utilisateur introuvable')
            .setDescription('Cet utilisateur n\'est pas sur le serveur.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
        await member.timeout(duration * 60 * 1000, reason);

        // Log de modération
        await logModeration(interaction, 'mute', target, `${reason} (${duration} minutes)`);

        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('🔇 Utilisateur rendu muet')
            .setDescription(`**${target.tag}** a été rendu muet pendant ${duration} minutes.`)
            .addFields(
                { name: 'Raison', value: reason, inline: false },
                { name: 'Durée', value: `${duration} minutes`, inline: true },
                { name: 'Modérateur', value: interaction.user.tag, inline: true }
            )
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du mute.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function warnUser(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission d\'avertir des membres.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Ajouter l'avertissement à la base de données
    await database.addModLog(interaction.guild.id, {
        userId: target.id,
        moderatorId: interaction.user.id,
        action: 'warn',
        reason: reason,
        timestamp: Date.now()
    });

    // Log de modération
    await logModeration(interaction, 'warn', target, reason);

    const embed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle('⚠️ Utilisateur averti')
        .setDescription(`**${target.tag}** a reçu un avertissement.`)
        .addFields(
            { name: 'Raison', value: reason, inline: false },
            { name: 'Modérateur', value: interaction.user.tag, inline: true }
        )
        .setThumbnail(target.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Envoyer un message privé à l'utilisateur
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('⚠️ Avertissement')
            .setDescription(`Vous avez reçu un avertissement sur **${interaction.guild.name}**`)
            .addFields(
                { name: 'Raison', value: reason, inline: false },
                { name: 'Modérateur', value: interaction.user.tag, inline: true }
            )
            .setTimestamp();

        await target.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.log('Impossible d\'envoyer le message privé à:', target.tag);
    }
}

async function clearMessages(interaction) {
    const amount = interaction.options.getInteger('amount');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de supprimer des messages.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
        const messages = await interaction.channel.bulkDelete(amount, true);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🧹 Messages supprimés')
            .setDescription(`${messages.size} messages ont été supprimés avec succès.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log de modération
        await logModeration(interaction, 'clear', null, `Suppression de ${messages.size} messages`);

    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la suppression des messages.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function showWarnings(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const logs = await database.getModLogs(interaction.guild.id);
    const userWarnings = logs.filter(log => log.userId === target.id && log.action === 'warn');

    if (userWarnings.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Aucun avertissement')
            .setDescription(`**${target.tag}** n'a aucun avertissement.`)
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor('#ffff00')
        .setTitle(`⚠️ Avertissements de ${target.tag}`)
        .setDescription(`${target.tag} a ${userWarnings.length} avertissement(s):`)
        .setTimestamp();

    userWarnings.forEach((warning, index) => {
        const moderator = interaction.guild.members.cache.get(warning.moderatorId);
        const date = moment(warning.timestamp).format('DD/MM/YYYY HH:mm');
        
        embed.addFields({
            name: `Avertissement #${index + 1}`,
            value: `**Raison:** ${warning.reason}\n**Modérateur:** ${moderator?.user.tag || 'Inconnu'}\n**Date:** ${date}`,
            inline: false
        });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function logModeration(interaction, action, target, reason) {
    const guild = await database.getGuild(interaction.guild.id);
    
    if (!guild.moderation.logChannelId) {
        return;
    }

    const logChannel = interaction.guild.channels.cache.get(guild.moderation.logChannelId);
    
    if (!logChannel || !logChannel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle(`📋 Log: ${action.toUpperCase()}`)
        .setDescription(`**${interaction.user.tag}** a effectué une action de modération`)
        .addFields(
            {
                name: 'Action',
                value: action,
                inline: true
            },
            {
                name: 'Cible',
                value: target ? target.tag : 'N/A',
                inline: true
            },
            {
                name: 'Raison',
                value: reason,
                inline: false
            }
        )
        .setTimestamp();

    if (target) {
        embed.setThumbnail(target.displayAvatarURL());
    }

    await logChannel.send({ embeds: [embed] });
}
