const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.get('/api/channels', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        // On s'assure que l'ID est bien envoyé comme une String
        res.json(guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: String(c.id), name: c.name })));
    });

    app.get('/api/roles', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).map(r => ({ id: String(r.id), name: r.name })));
    });

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            // Extraction et nettoyage strict des IDs
            const channelId = req.body.channelId ? String(req.body.channelId).trim() : null;
            const roleId = req.body.roleId ? String(req.body.roleId).trim() : null;
            const messageId = req.body.messageId ? String(req.body.messageId).trim() : null;

            if (!channelId || channelId === "undefined" || !/^\d+$/.test(channelId)) {
                return res.status(400).json({ success: false, message: "ID Salon invalide (Snowflake manquant)" });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let messageOptions = { embeds: [], components: [], files: [] };

            if (req.body.mode === 'simple') {
                messageOptions.content = req.body.content || "Sélectionnez votre rôle :";
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(req.body.title || "Rôles")
                    .setDescription(req.body.description || "Cliquez ci-dessous")
                    .setColor("#ff4d4d");

                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    messageOptions.files = [file];
                } else if (req.body.imageUrl) {
                    embed.setImage(req.body.imageUrl);
                }
                messageOptions.embeds = [embed];
            }

            const row = new ActionRowBuilder();
            const customId = `role_${req.body.roleMode || 'normal'}_${roleId}`;
            
            if (req.body.displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(customId).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(customId).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            messageOptions.components = [row];

            if (messageId && messageId.length > 15) {
                const targetMsg = await channel.messages.fetch(messageId);
                await targetMsg.edit(messageOptions);
            } else {
                await channel.send(messageOptions);
            }
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
