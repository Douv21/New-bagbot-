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

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            // Sécurité : Nettoyage strict des IDs
            const channelId = req.body.channelId ? String(req.body.channelId).trim() : "";
            const roleId = req.body.roleId ? String(req.body.roleId).trim() : "";

            // Si l'ID n'est pas un nombre de 17-19 chiffres, on refuse tout de suite
            if (!/^\d{17,20}$/.test(channelId)) {
                return res.status(400).json({ success: false, message: `ID Salon invalide : ${channelId}` });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let options = { embeds: [], components: [], files: [] };

            if (req.body.mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(req.body.title || "Sélection de rôle")
                    .setDescription(req.body.description || "Cliquez ci-dessous")
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

            if (req.body.messageId && /^\d{17,20}$/.test(req.body.messageId)) {
                const targetMsg = await channel.messages.fetch(req.body.messageId);
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
