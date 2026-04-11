const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, Events } = require('discord.js');
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // API pour récupérer les salons textuels
    app.get('/api/channels', async (req, res) => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return res.json([]);
            const channels = guild.channels.cache
                .filter(c => c.type === 0)
                .map(c => ({ id: c.id, name: c.name }));
            res.json(channels);
        } catch (err) { res.status(500).json([]); }
    });

    // API pour récupérer les rôles (hors rôles gérés par bots)
    app.get('/api/roles', async (req, res) => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return res.json([]);
            const roles = guild.roles.cache
                .filter(r => !r.managed && r.name !== "@everyone")
                .map(r => ({ id: r.id, name: r.name }));
            res.json(roles);
        } catch (err) { res.status(500).json([]); }
    });

    // API de déploiement
    app.post('/api/deploy', upload.single('imageFile'), async (req, res) => {
        try {
            const { channelId, roleId, mode, displayType, content, title, description } = req.body;
            
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let msgOptions = { embeds: [], components: [], files: [] };

            // Mode EMBED (Avec Titre, Desc, Image)
            if (mode === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Sélection de Rôle")
                    .setDescription(description || `Appuyez ci-dessous pour recevoir le rôle **${role.name}**`)
                    .setColor("#ff4d4d");
                
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'banner.png' });
                    embed.setImage('attachment://banner.png');
                    msgOptions.files = [file];
                }
                msgOptions.embeds = [embed];
            } else {
                // Mode SIMPLE (Texte pur)
                msgOptions.content = content || `Cliquez pour obtenir le rôle ${role.name}`;
            }

            // Création du composant (Bouton ou Menu)
            const row = new ActionRowBuilder();
            const customId = `role_normal_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder("Choisissez votre rôle...")
                    .addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(role.name)
                    .setStyle(ButtonStyle.Danger));
            }
            msgOptions.components = [row];

            await channel.send(msgOptions);
            res.json({ success: true });
        } catch (err) {
            console.error("Erreur Déploiement:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
