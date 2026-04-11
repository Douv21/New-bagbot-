const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

// On charge les variables d'environnement
require('dotenv').config();

module.exports = function(app, client) {
    const guildId = process.env.GUILD_ID;

    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // Route API : Salons (Utilise le GUILD_ID configuré)
    app.get('/api/channels', async (req, res) => {
        try {
            const guild = await client.guilds.fetch(guildId);
            const channels = guild.channels.cache
                .filter(c => c.type === 0)
                .map(c => ({ id: c.id, name: c.name }));
            res.json(channels);
        } catch (err) { res.status(500).json([]); }
    });

    // Route API : Rôles
    app.get('/api/roles', async (req, res) => {
        try {
            const guild = await client.guilds.fetch(guildId);
            const roles = guild.roles.cache
                .filter(r => !r.managed && r.name !== "@everyone")
                .map(r => ({ id: r.id, name: r.name }));
            res.json(roles);
        } catch (err) { res.status(500).json([]); }
    });

    // Route API : Déploiement (C'est ici que ça bloquait)
    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, content, title, description } = req.body;
            
            const guild = await client.guilds.fetch(guildId);
            const channel = await guild.channels.fetch(channelId);
            const role = await guild.roles.fetch(roleId);

            let msgOptions = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôles")
                    .setDescription(description || `Cliquez pour le rôle ${role.name}`)
                    .setColor("#ff4d4d");
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    msgOptions.files = [file];
                }
                msgOptions.embeds = [embed];
            } else {
                msgOptions.content = content || `Obtenez le rôle **${role.name}**`;
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            msgOptions.components = [row];

            await channel.send(msgOptions);
            res.json({ success: true });
        } catch (err) {
            console.error("Erreur de déploiement:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
