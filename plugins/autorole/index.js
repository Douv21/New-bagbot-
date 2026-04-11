const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });

module.exports = function(app, client) {
    app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
        try {
            const { mode, channelId, roleId, content, title, description, imageUrl, displayType, messageId, roleMode } = req.body;
            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);
            
            let messageOptions = { embeds: [], components: [], files: [] };

            // Construction du contenu (Simple ou Embed)
            if (mode === 'simple') {
                messageOptions.content = content || "Gestion des rôles :";
            } else {
                const embed = new EmbedBuilder().setColor("#ff4d4d")
                    .setTitle(title || "Rôles").setDescription(description || "Cliquez ci-dessous");
                if (req.file) {
                    const file = new AttachmentBuilder(req.file.path, { name: 'image.png' });
                    embed.setImage('attachment://image.png');
                    messageOptions.files = [file];
                } else if (imageUrl) embed.setImage(imageUrl);
                messageOptions.embeds = [embed];
            }

            // Création du composant (Bouton ou Select) avec le MODE encodé dans le CustomID
            const row = new ActionRowBuilder();
            const customId = `role_${roleMode || 'normal'}_${roleId}`;
            
            if (displayType === 'select') {
                row.addComponents(new StringSelectMenuBuilder().setCustomId(customId)
                    .addOptions([{ label: role.name, value: roleId }]));
            } else {
                row.addComponents(new ButtonBuilder().setCustomId(customId)
                    .setLabel(role.name).setStyle(ButtonStyle.Danger));
            }
            messageOptions.components = [row];

            // SI ID MESSAGE : On modifie. SINON : On envoie.
            if (messageId) {
                const targetMsg = await channel.messages.fetch(messageId);
                await targetMsg.edit(messageOptions);
            } else {
                await channel.send(messageOptions);
            }

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // LOGIQUE DES MODES (Normal, Inversé, Définitif...)
    client.on('interactionCreate', async (i) => {
        if (!i.isButton() && !i.isStringSelectMenu()) return;
        if (!i.customId.startsWith('role_')) return;

        const [_, mode, roleId] = i.customId.split('_');
        const member = i.member;
        const hasRole = member.roles.cache.has(roleId);

        try {
            if (mode === 'normal') {
                hasRole ? await member.roles.remove(roleId) : await member.roles.add(roleId);
            } else if (mode === 'inverse') {
                hasRole ? await member.roles.add(roleId) : await member.roles.remove(roleId);
            } else if (mode === 'definitif' && !hasRole) {
                await member.roles.add(roleId);
            } else if (mode === 'retrait' && hasRole) {
                await member.roles.remove(roleId);
            }
            await i.reply({ content: "Mise à jour du rôle effectuée.", ephemeral: true });
        } catch (e) {
            await i.reply({ content: "Erreur de permissions.", ephemeral: true });
        }
    });
};
