const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const moment = require('moment');

module.exports = {
    name: Events.GuildMemberRemove,
    
    async execute(member) {
        try {
            const guild = await database.getGuild(member.guild.id);
            
            // Système d'au revoir
            if (guild.goodbye.enabled) {
                await sendGoodbyeMessage(member, guild);
            }
            
            // Mettre à jour les statistiques
            await updateStats(member, 'leave');
            
            // Log de départ si configuré
            await logDeparture(member, guild);
            
        } catch (error) {
            console.error('Erreur dans guildMemberRemove:', error);
        }
    }
};

async function sendGoodbyeMessage(member, guild) {
    const goodbyeChannel = member.guild.channels.cache.get(guild.goodbye.channelId);
    
    if (!goodbyeChannel || !goodbyeChannel.permissionsFor(member.guild.members.me).has('SendMessages')) {
        return;
    }

    // Calculer la durée sur le serveur
    const joinedAt = member.joinedAt;
    const duration = moment.duration(Date.now() - joinedAt.getTime());
    const durationString = duration.humanize();

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('👋 Départ d\'un membre')
        .setDescription(formatMessage(guild.goodbye.message, member, member.guild))
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '👤 Utilisateur',
                value: `${member.user.username}#${member.user.discriminator}`,
                inline: true
            },
            {
                name: '⏱️ Durée sur le serveur',
                value: durationString,
                inline: true
            },
            {
                name: '📅 Rejoint le',
                value: `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>`,
                inline: true
            },
            {
                name: '👥 Membres restants',
                value: `${member.guild.memberCount}`,
                inline: true
            }
        )
        .setFooter({
            text: `ID: ${member.id}`,
            iconURL: member.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    await goodbyeChannel.send({ embeds: [embed] });
}

async function logDeparture(member, guild) {
    if (!guild.moderation.logChannelId) {
        return;
    }

    const logChannel = member.guild.channels.cache.get(guild.moderation.logChannelId);
    
    if (!logChannel || !logChannel.permissionsFor(member.guild.members.me).has('SendMessages')) {
        return;
    }

    const embed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('📋 Log: Départ de membre')
        .setDescription(`**${member.user.tag}** a quitté le serveur`)
        .addFields(
            {
                name: 'ID Utilisateur',
                value: member.id,
                inline: true
            },
            {
                name: 'Rejoint le',
                value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`,
                inline: true
            },
            {
                name: 'Durée sur le serveur',
                value: moment.duration(Date.now() - member.joinedAt.getTime()).humanize(),
                inline: true
            }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await logChannel.send({ embeds: [embed] });
}

async function updateStats(member, type) {
    const guild = await database.getGuild(member.guild.id);
    
    if (!guild.stats) {
        guild.stats = {
            joins: 0,
            leaves: 0,
            messages: 0,
            commands: 0
        };
    }

    if (type === 'join') {
        guild.stats.joins++;
    } else if (type === 'leave') {
        guild.stats.leaves++;
    }

    await database.setGuild(member.guild.id, guild);
}

function formatMessage(message, member, guild) {
    return message
        .replace(/{user}/g, `**${member.user.username}**`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount)
        .replace(/{duration}/g, moment.duration(Date.now() - member.joinedAt.getTime()).humanize());
}
