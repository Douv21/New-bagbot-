const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // API Salons
    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const channels = guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    });

    // API Rôles
    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const roles = guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name }));
        res.json(roles);
    });

    // API Déploiement
    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        console.log("--- Tentative de déploiement ---");
        try {
            const { channelId, roleId, mode, displayType, content, title, description } = req.body;
            
            const channel = await client.channels.fetch(channelId);
            if (!channel) return res.status(400).json({ success: false, message: "Salon introuvable" });

            const role = await channel.guild.roles.fetch(roleId);
            if (!role) return res.status(400).json({ success: false, message: "Rôle introuvable" });

            let options = { embeds: [], components: [], files: [] };

            if (mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Choix du rôle")
                    .setDescription(description || `Cliquez pour obtenir ${role.name}`)
                    .setColor("#ff4d4d");
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    options.files = [file];
                }
                options.embeds = [embed];
            } else {
                options.content = content || `Rôle disponible : **${role.name}**`;
            }

            const row = new ActionRowBuilder();
            const cid = `role_normal_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(cid).addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(cid).setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            options.components = [row];

            await channel.send(options);
            console.log("✅ Succès : Message envoyé dans #" + channel.name);
            res.json({ success: true });
        } catch (err) {
            console.error("❌ Erreur :", err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
