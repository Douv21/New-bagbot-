const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.get('/api/channels', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    });

    app.get('/api/roles', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const roles = guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).map(r => ({ id: r.id, name: r.name }));
        res.json(roles);
    });

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        console.log("📥 Données reçues :", req.body); // Pour voir l'erreur dans ton terminal

        try {
            const { mode, channelId, roleId, roleMode, displayType, messageId, content, title, description, imageUrl } = req.body;

            if (!channelId || channelId === "undefined" || channelId.length < 15) {
                return res.status(400).json({ success: false, message: "ID Salon invalide reçu par le bot." });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let messageOptions = { embeds: [], components: [], files: [] };

            if (mode === 'simple') {
                messageOptions.content = content || "Sélectionnez votre rôle :";
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôles")
                    .setDescription(description || "Cliquez ci-dessous")
                    .setColor("#ff4d4d");

                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    messageOptions.files = [file];
                } else if (imageUrl) {
                    embed.setImage(imageUrl);
                }
                messageOptions.embeds = [embed];
            }

            const row = new ActionRowBuilder();
            const customId = `role_${roleMode || 'normal'}_${roleId}`;
            
            if (displayType === 'select') {
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
            console.error("❌ Erreur Discord :", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
