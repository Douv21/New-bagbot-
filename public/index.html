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
    // S'assurer que le dossier existe
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    // API pour charger les salons et rôles
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

    // Route principale de déploiement
    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            const { mode, channelId, roleId, content, title, description, imageUrl, displayType, messageId, roleMode } = req.body;

            if (!channelId || channelId === "undefined") {
                return res.status(400).json({ success: false, message: "ID du salon invalide." });
            }

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            let messageOptions = { embeds: [], components: [], files: [] };

            // Construction du contenu
            if (mode === 'simple') {
                messageOptions.content = content || "Sélectionnez votre rôle :";
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôles")
                    .setDescription(description || "Cliquez pour obtenir le rôle")
                    .setColor("#ff4d4d");

                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path);
                    embed.setImage(`attachment://${path.basename(req.file.path)}`);
                    messageOptions.files = [file];
                } else if (imageUrl) {
                    embed.setImage(imageUrl);
                }
                messageOptions.embeds = [embed];
            }

            // Ajout du bouton ou menu
            const row = new ActionRowBuilder();
            const customId = `role_${roleMode || 'normal'}_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .addOptions([{ label: role ? role.name : "Rôle", value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(role ? role.name : "Rôle")
                    .setStyle(ButtonStyle.Danger));
            }
            messageOptions.components = [row];

            // Envoi ou Modification
            if (messageId && messageId.length > 10) {
                const targetMsg = await channel.messages.fetch(messageId);
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

    // Gestion des interactions (Logique DraftBot)
    client.on('interactionCreate', async (i) => {
        if (!i.isButton() && !i.isStringSelectMenu()) return;
        if (!i.customId.startsWith('role_')) return;

        const [_, mode, roleId] = i.customId.split('_');
        const hasRole = i.member.roles.cache.has(roleId);

        try {
            if (mode === 'normal') {
                hasRole ? await i.member.roles.remove(roleId) : await i.member.roles.add(roleId);
            } else if (mode === 'inverse') {
                hasRole ? await i.member.roles.add(roleId) : await i.member.roles.remove(roleId);
            } else if (mode === 'definitif' && !hasRole) {
                await i.member.roles.add(roleId);
            }
            await i.reply({ content: "Mise à jour effectuée !", ephemeral: true });
        } catch (e) {
            await i.reply({ content: "Erreur : Vérifiez la hiérarchie des rôles.", ephemeral: true });
        }
    });
};
