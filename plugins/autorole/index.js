const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // Récupérer les émojis du serveur
    app.get('/api/emojis', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const emojis = guild.emojis.cache.map(e => ({ id: e.id, name: e.name, animated: e.animated, url: e.url }));
        res.json(emojis);
    });

    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })) : []);
    });

    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name })) : []);
    });

    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, roleMode, content, title, description, buttonLabel, emojiId } = req.body;
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let options = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder().setTitle(title || "Rôle").setDescription(description || " ").setColor("#ff4d4d");
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    options.files = [file];
                }
                options.embeds = [embed];
            } else {
                options.content = content || ` `;
            }

            const row = new ActionRowBuilder();
            const customId = `role_${roleMode}_${roleId}`;
            const label = buttonLabel || role.name;

            if (displayType === 'select') {
                const menu = new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(label);
                const option = { label: label, value: roleId };
                if (emojiId) option.emoji = emojiId;
                menu.addOptions([option]);
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
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
