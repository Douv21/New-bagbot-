const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: String(c.id), name: c.name })) : []);
    });

    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: String(r.id), name: r.name })) : []);
    });

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            // Nettoyage forcé des entrées
            const channelId = String(req.body.channelId || "").trim();
            const roleId = String(req.body.roleId || "").trim();
            const messageId = String(req.body.messageId || "").trim();

            // Validation Snowflake stricte
            if (!/^\d{17,20}$/.test(channelId)) {
                return res.status(400).json({ success: false, message: `ID Salon invalide : ${channelId}` });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let options = { embeds: [], components: [], files: [] };

            if (req.body.mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(req.body.title || "Sélection")
                    .setDescription(req.body.description || " ")
                    .setColor("#ff4d4d");

                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    options.files = [file];
                }
                options.embeds = [embed];
            } else {
                options.content = req.body.content || "Veuillez choisir votre rôle :";
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            
            if (req.body.displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            options.components = [row];

            if (messageId && /^\d{17,20}$/.test(messageId)) {
                const targetMsg = await channel.messages.fetch(messageId);
                await targetMsg.edit(options);
            } else {
                await channel.send(options);
            }

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
