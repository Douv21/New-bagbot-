const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })));
    });

    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        res.json(guild.roles.cache.filter(r => r.name !== "@everyone" && !r.managed).map(r => ({ id: r.id, name: r.name })));
    });

    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            // Extraction directe - On force l'ID en String pour Discord
            const channelId = String(req.body.channelId);
            const roleId = String(req.body.roleId);

            if (channelId === "undefined" || channelId.length < 10) {
                return res.status(400).json({ success: false, message: "ID Salon manquant ou invalide." });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let options = { embeds: [], components: [], files: [] };

            // Construction du message
            if (req.body.mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(req.body.title || "Sélection")
                    .setDescription(req.body.description || " ")
                    .setColor("#ff4d4d");
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'img.png' });
                    embed.setImage('attachment://img.png');
                    options.files = [file];
                }
                options.embeds = [embed];
            } else {
                options.content = req.body.content || "Choisissez votre rôle :";
            }

            // Bouton ou Menu
            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            
            if (req.body.displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            options.components = [row];

            // Envoi
            if (req.body.messageId && req.body.messageId.length > 15) {
                const msg = await channel.messages.fetch(req.body.messageId);
                await msg.edit(options);
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
