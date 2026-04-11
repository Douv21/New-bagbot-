const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // API : Récupérer les émojis du serveur pour l'affichage type DraftBot
    app.get('/api/emojis', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const emojis = guild.emojis.cache.map(e => ({ 
            id: e.id, 
            name: e.name, 
            animated: e.animated, 
            url: e.url 
        }));
        res.json(emojis);
    });

    // API : Liste des salons textuels
    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })));
    });

    // API : Liste des rôles (non gérés par des bots)
    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name })));
    });

    // API : Déploiement du message (Bouton ou Select)
    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, roleMode, content, title, description, buttonLabel, emojiId } = req.body;
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let options = { embeds: [], components: [], files: [] };

            // Construction de l'Embed (Style DraftBot)
            if (mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(title || role.name)
                    .setDescription(description || "Sélectionnez votre rôle ci-dessous.")
                    .setColor("#d78266"); // Couleur orange DraftBot
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    options.files = [file];
                }
                options.embeds = [embed];
            } else {
                options.content = content || `Cliquez pour obtenir le rôle **${role.name}**`;
            }

            const row = new ActionRowBuilder();
            const customId = `role_${roleMode}_${roleId}`;
            const label = buttonLabel || role.name;

            if (displayType === 'select') {
                const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(label);
                const menuOption = { label: label, value: roleId };
                if (emojiId) menuOption.emoji = emojiId;
                menu.addOptions([menuOption]);
                row.addComponents(menu);
            } else {
                const btn = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Secondary);
                if (emojiId) btn.setEmoji(emojiId);
                row.addComponents(btn);
            }
            options.components = [row];

            await channel.send(options);
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
