const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // Route pour les salons
    app.get('/get-channels', (req, res) => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return res.status(500).json({ error: "Bot non connecté à un serveur" });
            const channels = guild.channels.cache
                .filter(c => c.type === 0)
                .map(c => ({ id: String(c.id), name: c.name }));
            res.setHeader('Content-Type', 'application/json');
            res.json(channels);
        } catch (err) { res.status(500).json([]); }
    });

    // Route pour les rôles
    app.get('/get-roles', (req, res) => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return res.status(500).json({ error: "Bot non connecté" });
            const roles = guild.roles.cache
                .filter(r => !r.managed && r.name !== "@everyone")
                .map(r => ({ id: String(r.id), name: r.name }));
            res.setHeader('Content-Type', 'application/json');
            res.json(roles);
        } catch (err) { res.status(500).json([]); }
    });

    // Route de déploiement
    app.post('/deploy-bot', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, messageId, content, title, description } = req.body;
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            let options = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder().setTitle(title || "Rôles").setDescription(description || " ").setColor("#ff4d4d");
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    options.files = [file];
                }
                options.embeds = [embed];
            } else {
                options.content = content || "Sélectionnez votre rôle :";
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            options.components = [row];

            if (messageId && /^\d{17,20}$/.test(messageId)) {
                const msg = await channel.messages.fetch(messageId);
                await msg.edit(options);
            } else {
                await channel.send(options);
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
};
