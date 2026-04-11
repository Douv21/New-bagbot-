const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })) : []);
    });

    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name })) : []);
    });

    // On utilise upload.none() si pas d'image, ou on gère le JSON
    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            // Nettoyage forcé des IDs pour éviter le bug Snowflake
            const channelId = String(req.body.channelId || "").trim();
            const roleId = String(req.body.roleId || "").trim();

            if (!/^\d{17,20}$/.test(channelId)) {
                return res.status(400).json({ success: false, message: `ID Salon invalide : ${channelId}` });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let messageOptions = { embeds: [], components: [], files: [] };

            if (req.body.mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(req.body.title || "Sélection de rôle")
                    .setDescription(req.body.description || "Cliquez ci-dessous")
                    .setColor("#ff4d4d");

                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    messageOptions.files = [file];
                }
                messageOptions.embeds = [embed];
            } else {
                messageOptions.content = req.body.content || "Veuillez choisir votre rôle :";
            }

            const row = new ActionRowBuilder();
            const customId = `role_normal_${roleId}`;

            if (req.body.displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(role.name)
                    .setStyle(ButtonStyle.Danger));
            }

            messageOptions.components = [row];

            if (req.body.messageId && /^\d{17,20}$/.test(req.body.messageId)) {
                const targetMsg = await channel.messages.fetch(req.body.messageId);
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
