const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // API pour les listes déroulantes
    app.get('/api/channels', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })));
    });

    app.get('/api/roles', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).map(r => ({ id: r.id, name: r.name })));
    });

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            const { mode, channelId, roleId, content, title, description, imageUrl, displayType, messageId, roleMode } = req.body;

            // Vérification Snowflake (ID valide)
            const isSnowflake = (id) => id && /^\d{17,20}$/.test(id.trim());

            if (!isSnowflake(channelId)) return res.status(400).json({ success: false, message: "ID Salon invalide." });
            if (!isSnowflake(roleId)) return res.status(400).json({ success: false, message: "ID Rôle invalide." });

            const channel = await client.channels.fetch(channelId.trim());
            const role = await channel.guild.roles.fetch(roleId.trim());
            
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
                } else if (imageUrl && imageUrl.startsWith('http')) {
                    embed.setImage(imageUrl);
                }
                messageOptions.embeds = [embed];
            }

            const row = new ActionRowBuilder();
            const customId = `role_${roleMode || 'normal'}_${roleId.trim()}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Choisir un rôle...')
                    .addOptions([{ label: role.name, value: roleId.trim() }]));
            } else {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(role.name)
                    .setStyle(ButtonStyle.Danger));
            }
            messageOptions.components = [row];

            if (isSnowflake(messageId)) {
                const targetMsg = await channel.messages.fetch(messageId.trim());
                await targetMsg.edit(messageOptions);
            } else {
                await channel.send(messageOptions);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
