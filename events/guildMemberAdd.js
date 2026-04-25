const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { createCanvas, loadImage } = require('canvas');
const moment = require('moment');

module.exports = {
    name: Events.GuildMemberAdd,
    
    async execute(member) {
        try {
            const guild = await database.getGuild(member.guild.id);
            
            // Système de bienvenue
            if (guild.welcome.enabled) {
                await sendWelcomeMessage(member, guild);
            }
            
            // Système d'auto-rôle (si configuré)
            await assignAutoRoles(member, guild);
            
            // Mettre à jour les statistiques
            await updateStats(member, 'join');
            
        } catch (error) {
            console.error('Erreur dans guildMemberAdd:', error);
        }
    }
};

async function sendWelcomeMessage(member, guild) {
    const welcomeChannel = member.guild.channels.cache.get(guild.welcome.channelId);
    
    if (!welcomeChannel || !welcomeChannel.permissionsFor(member.guild.members.me).has('SendMessages')) {
        return;
    }

    // Créer un embed de bienvenue
    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Bienvenue sur le serveur !')
        .setDescription(formatMessage(guild.welcome.message, member, member.guild))
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '👤 Utilisateur',
                value: `${member.user.username}#${member.user.discriminator}`,
                inline: true
            },
            {
                name: '📅 Date de création',
                value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
                inline: true
            },
            {
                name: '👥 Membres totaux',
                value: `${member.guild.memberCount}`,
                inline: true
            }
        )
        .setImage(await generateWelcomeImage(member))
        .setFooter({
            text: `ID: ${member.id}`,
            iconURL: member.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
    
    // Envoyer un message privé si configuré
    if (guild.welcome.dmEnabled) {
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Bienvenue sur ' + member.guild.name + ' !')
                .setDescription(guild.welcome.dmMessage || 'Merci de nous rejoindre ! N\'hésite pas à lire les règles.')
                .setThumbnail(member.guild.iconURL({ dynamic: true }))
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log('Impossible d\'envoyer le message privé à:', member.user.tag);
        }
    }
}

async function generateWelcomeImage(member) {
    const canvas = createCanvas(800, 300);
    const ctx = canvas.getContext('2d');

    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 800, 300);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 300);

    // Texte de bienvenue
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Bienvenue', 400, 80);

    ctx.font = '24px Arial';
    ctx.fillText(member.user.username, 400, 130);

    ctx.font = '18px Arial';
    ctx.fillText(`Tu es le ${member.guild.memberCount}ème membre`, 400, 170);

    // Avatar de l'utilisateur
    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ format: 'png', size: 128 }));
        ctx.beginPath();
        ctx.arc(400, 230, 40, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 360, 190, 80, 80);
    } catch (error) {
        // Si l'avatar ne peut pas être chargé, dessiner un cercle par défaut
        ctx.beginPath();
        ctx.arc(400, 230, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    return canvas.toDataURL();
}

async function assignAutoRoles(member, guild) {
    if (!guild.autoRoles || guild.autoRoles.length === 0) {
        return;
    }

    for (const roleId of guild.autoRoles) {
        const role = member.guild.roles.cache.get(roleId);
        if (role && member.guild.members.me.permissions.has('ManageRoles')) {
            try {
                await member.roles.add(role);
            } catch (error) {
                console.error(`Impossible d'ajouter le rôle ${roleId} à ${member.user.tag}:`, error);
            }
        }
    }
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
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{mention}/g, member.toString())
        .replace(/{server}/g, guild.name)
        .replace(/{count}/g, guild.memberCount)
        .replace(/{createdate}/g, `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`);
}
