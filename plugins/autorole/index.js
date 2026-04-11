const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        // On ne montre que les salons où le bot peut envoyer des messages
        const channels = guild.channels.cache
            .filter(c => c.type === 0 && c.permissionsFor(client.user).has(PermissionFlagsBits.SendMessages))
            .map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    });

    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const roles = guild.roles.cache
            .filter(r => !r.managed && r.name !== "@everyone")
            .map(r => ({ id: r.id, name: r.name }));
        res.json(roles);
    });

    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, messageId, content, title, description } = req.body;
            
            if (!channelId || !roleId) throw new Error("Sélectionnez un salon et un rôle.");

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let msgOptions = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Attribution de rôle")
                    .setDescription(description || `Cliquez pour obtenir le rôle ${role.name}`)
                    .setColor("#ff4d4d");
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    msgOptions.files = [file];
                }
                msgOptions.embeds = [embed];
            } else {
                msgOptions.content = content || `Appuyez ci-dessous pour le rôle **${role.name}**`;
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).setPlaceholder("Choisir...").addOptions([{ label: role.name, value: roleId }]));
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
            console.error("Erreur Discord:", err.message);
            res.status(500).json({ success: false, message: "Erreur Discord : " + err.message });
        }
    });
};
