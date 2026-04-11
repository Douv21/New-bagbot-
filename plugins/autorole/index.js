const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = function(app, client) {
    
    // API : Récupération data
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

    // API : Déploiement
    app.post('/update-bot', async (req, res) => {
        const { mode, channelId, roleId, content, title, description, imageUrl, displayType } = req.body;
        
        try {
            const channel = await client.channels.fetch(channelId);
            const role = (await channel.guild.roles.fetch()).get(roleId);
            const messageOptions = { embeds: [], components: [] };

            // Construction du contenu
            if (mode === 'simple') {
                messageOptions.content = content || "Cliquez ci-dessous :";
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(title || "Rôle")
                    .setDescription(description || "Choisissez votre rôle")
                    .setColor("#ff4d4d");
                if (imageUrl) embed.setImage(imageUrl);
                messageOptions.embeds = [embed];
            }

            // Bouton ou Sélecteur
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
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // Handler d'interactions
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
