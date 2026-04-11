const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            let { mode, channelId, roleId, content, title, description, imageUrl, displayType, messageId, roleMode } = req.body;

            // --- SÉCURITÉ ANTI-UNDEFINED ---
            if (!channelId || channelId === "undefined" || channelId.length < 10) {
                return res.status(400).json({ success: false, message: "ID de salon invalide ou non sélectionné." });
            }
            if (!roleId || roleId === "undefined" || roleId.length < 10) {
                return res.status(400).json({ success: false, message: "ID de rôle invalide ou non sélectionné." });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let messageOptions = { embeds: [], components: [], files: [] };

            if (mode === 'simple') {
                messageOptions.content = content || "Gestion des rôles :";
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôles")
                    .setDescription(description || "Cliquez ci-dessous pour obtenir votre rôle.")
                    .setColor("#ff4d4d");

                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    messageOptions.files = [file];
                } else if (imageUrl && imageUrl.startsWith('http')) {
                    embed.setImage(imageUrl);
                }
                messageOptions.embeds = [embed];
            }

            const row = new ActionRowBuilder();
            const customId = `role_${roleMode || 'normal'}_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Choisir un rôle...')
                    .addOptions([{ label: role ? role.name : "Rôle", value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(role ? role.name : "Obtenir le rôle")
                    .setStyle(ButtonStyle.Danger));
            }
            messageOptions.components = [row];

            if (messageId && messageId.trim().length > 5) {
                const targetMsg = await channel.messages.fetch(messageId.trim());
                await targetMsg.edit(messageOptions);
            } else {
                await channel.send(messageOptions);
            }

            res.json({ success: true });
        } catch (err) {
            console.error("Erreur Discord:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
