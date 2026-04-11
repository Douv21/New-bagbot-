const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage des images
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

module.exports = function(app, client) {
    // S'assurer que le dossier uploads existe
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

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

    // ROUTE DE DÉPLOIEMENT (Modifiée pour accepter les fichiers)
    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        const { mode, channelId, roleId, content, title, description, imageUrl, displayType } = req.body;
        
        try {
            const channel = await client.channels.fetch(channelId);
            const role = (await channel.guild.roles.fetch()).get(roleId);
            const messageOptions = { embeds: [], components: [], files: [] };

            if (mode === 'simple') {
                messageOptions.content = content || "Cliquez ci-dessous :";
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôle")
                    .setDescription(description || "Choisissez votre rôle")
                    .setColor("#ff4d4d");

                // Priorité : Fichier uploadé > URL collée
                if (req.file) {
                    const file = new AttachmentBuilder(`public/uploads/${req.file.filename}`);
                    embed.setImage(`attachment://${req.file.filename}`);
                    messageOptions.files = [file];
                } else if (imageUrl) {
                    embed.setImage(imageUrl);
                }
                
                messageOptions.embeds = [embed];
            }

            const row = new ActionRowBuilder();
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder()
                    .setCustomId(`role_select_${roleId}`)
                    .setPlaceholder('Sélectionner un rôle')
                    .addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(`role_btn_${roleId}`)
                    .setLabel(role.name)
                    .setStyle(ButtonStyle.Danger));
            }
            messageOptions.components = [row];

            await channel.send(messageOptions);
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: err.message });
        }
    });

    client.on('interactionCreate', async (i) => {
        if (!i.isButton() && !i.isStringSelectMenu()) return;
        if (!i.customId.includes('role_')) return;
        const roleId = i.isStringSelectMenu() ? i.values[0] : i.customId.split('_').pop();
        if (i.member.roles.cache.has(roleId)) {
            await i.member.roles.remove(roleId);
            await i.reply({ content: "❌ Rôle retiré.", ephemeral: true });
        } else {
            await i.member.roles.add(roleId);
            await i.reply({ content: "✅ Rôle ajouté.", ephemeral: true });
        }
    });
};
