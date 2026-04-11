const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    // Création du dossier d'upload s'il n'existe pas
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // Route API : Salons
    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.status(500).json({ error: "Serveur Discord introuvable" });
        const channels = guild.channels.cache
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    });

    // Route API : Rôles
    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.status(500).json({ error: "Serveur Discord introuvable" });
        const roles = guild.roles.cache
            .filter(r => !r.managed && r.name !== "@everyone")
            .map(r => ({ id: r.id, name: r.name }));
        res.json(roles);
    });

    // Route API : Envoi du message
    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, messageId, content, title, description } = req.body;
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let msgOptions = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôles")
                    .setDescription(description || "Cliquez ci-dessous")
                    .setColor("#ff4d4d");
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    msgOptions.files = [file];
                }
                msgOptions.embeds = [embed];
            } else {
                msgOptions.content = content || "Recevez votre rôle :";
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            msgOptions.components = [row];

            if (messageId && /^\d{17,20}$/.test(messageId)) {
                const msg = await channel.messages.fetch(messageId);
                await msg.edit(msgOptions);
            } else {
                await channel.send(msgOptions);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
