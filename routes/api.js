const express = require('express');
const router = express.Router();
const { Client, GatewayIntentBits } = require('discord.js');

// Créer une instance du client Discord pour l'API
const apiClient = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Route pour obtenir les informations du bot
router.get('/bot/stats', async (req, res) => {
    try {
        if (!apiClient.readyAt) {
            await apiClient.login(process.env.DISCORD_TOKEN);
        }
        
        const stats = {
            username: apiClient.user.username,
            id: apiClient.user.id,
            guilds: apiClient.guilds.cache.size,
            uptime: apiClient.uptime,
            readyAt: apiClient.readyAt,
            ping: apiClient.ws.ping
        };
        
        res.json(stats);
    } catch (error) {
        console.error('[API] Erreur lors de la récupération des stats du bot:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour obtenir les informations d'un serveur
router.get('/guild/:guildId', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        
        if (!apiClient.readyAt) {
            await apiClient.login(process.env.DISCORD_TOKEN);
        }
        
        const guild = apiClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Serveur non trouvé' });
        }
        
        // Récupérer les informations complètes du serveur
        const guildInfo = {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true }),
            memberCount: guild.memberCount,
            ownerId: guild.ownerId,
            createdAt: guild.createdTimestamp,
            channels: {
                total: guild.channels.cache.size,
                text: guild.channels.cache.filter(c => c.type === 0).size,
                voice: guild.channels.cache.filter(c => c.type === 2).size,
                category: guild.channels.cache.filter(c => c.type === 4).size
            },
            roles: guild.roles.cache.size,
            emojis: guild.emojis.cache.size,
            boosts: guild.premiumSubscriptionCount || 0,
            premiumTier: guild.premiumTier
        };
        
        res.json(guildInfo);
    } catch (error) {
        console.error('[API] Erreur lors de la récupération des infos du serveur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour obtenir les membres d'un serveur
router.get('/guild/:guildId/members', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const limit = parseInt(req.query.limit) || 50;
        
        if (!apiClient.readyAt) {
            await apiClient.login(process.env.DISCORD_TOKEN);
        }
        
        const guild = apiClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Serveur non trouvé' });
        }
        
        // Récupérer les membres (limité pour éviter les gros payloads)
        const members = guild.members.cache.first(limit).map(member => ({
            id: member.id,
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.displayAvatarURL({ dynamic: true }),
            nickname: member.nickname,
            joinedAt: member.joinedTimestamp,
            roles: member.roles.cache.map(role => role.name),
            status: member.presence?.status || 'offline'
        }));
        
        res.json({
            members,
            total: guild.memberCount,
            limit
        });
    } catch (error) {
        console.error('[API] Erreur lors de la récupération des membres:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour obtenir les salons d'un serveur
router.get('/guild/:guildId/channels', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        
        if (!apiClient.readyAt) {
            await apiClient.login(process.env.DISCORD_TOKEN);
        }
        
        const guild = apiClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Serveur non trouvé' });
        }
        
        const channels = guild.channels.cache.map(channel => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            position: channel.position,
            parentId: channel.parentId,
            topic: channel.topic,
            nsfw: channel.nsfw || false,
            memberCount: channel.members?.size || 0
        }));
        
        res.json(channels);
    } catch (error) {
        console.error('[API] Erreur lors de la récupération des salons:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour envoyer un message (admin uniquement)
router.post('/guild/:guildId/message', async (req, res) => {
    try {
        const guildId = req.params.guildId;
        const { channelId, content } = req.body;
        
        if (!apiClient.readyAt) {
            await apiClient.login(process.env.DISCORD_TOKEN);
        }
        
        const guild = apiClient.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Serveur non trouvé' });
        }
        
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) {
            return res.status(404).json({ error: 'Salon non trouvé' });
        }
        
        if (!channel.permissionsFor(apiClient.user).has('SendMessages')) {
            return res.status(403).json({ error: 'Le bot n\'a pas la permission d\'envoyer des messages dans ce salon' });
        }
        
        await channel.send(content);
        
        res.json({ success: true, message: 'Message envoyé avec succès' });
    } catch (error) {
        console.error('[API] Erreur lors de l\'envoi du message:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
