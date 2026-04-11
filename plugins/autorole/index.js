const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // Récupération des salons
    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })));
    });

    // Récupération des rôles
    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name })));
    });

    // Envoi/Modification du message
    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, messageId, content, title, description } = req.body;

            if (!channelId || channelId === "undefined") throw new Error("ID Salon manquant.");

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            let msgData = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder().setTitle(title || "Rôles").setDescription(description || " ").setColor("#ff4d4d");
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    msgData.files = [file];
                }
                msgData.embeds = [embed];
            } else {
                msgData.content = content || "Choisissez votre rôle :";
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            msgData.components = [row];

            if (messageId && /^\d{17,20}$/.test(messageId)) {
                const msg = await channel.messages.fetch(messageId);
                await msg.edit(msgData);
            } else {
                await channel.send(msgData);
            }
            res.json({ success: true });
        } catch (err) {
            console.error("Erreur déploiement:", err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
