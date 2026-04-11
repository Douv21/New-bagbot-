const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // Route directe pour les salons
    app.get('/api/chans', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.status(500).send([]);
        res.json(guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })));
    });

    // Route directe pour les rôles
    app.get('/api/rols', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.status(500).send([]);
        res.json(guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name })));
    });

    app.post('/api/send', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, messageId, content, title, description } = req.body;
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            let opt = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const em = new EmbedBuilder().setTitle(title || "Rôles").setDescription(description || " ").setColor("#ff4d4d");
                if (req.file) {
                    const f = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    em.setImage('attachment://banner.png');
                    opt.files = [f];
                }
                opt.embeds = [em];
            } else {
                opt.content = content || "Sélectionnez :";
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            opt.components = [row];

            if (messageId && /^\d{17,20}$/.test(messageId)) {
                const m = await channel.messages.fetch(messageId);
                await m.edit(opt);
            } else {
                await channel.send(opt);
            }
            res.json({ success: true });
        } catch (err) { res.status(500).json({ success: false, message: err.message }); }
    });
};
