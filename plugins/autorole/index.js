const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = function(app, client) {
    
    // API : Salons & Rôles (inchangé mais indispensable)
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

    // API : Déploiement du message ultra-complet
    app.post('/update-bot', async (req, res) => {
        const { channelId, roleId, title, description, imageUrl, displayType, color } = req.body;
        
        try {
            const channel = await client.channels.fetch(channelId);
            const role = (await channel.guild.roles.fetch()).get(roleId);

            const embed = new EmbedBuilder()
                .setTitle(title || "Choix de rôles")
                .setDescription(description || "Interagissez ci-dessous")
                .setColor(color || "#ff4d4d");
            
            if (imageUrl) embed.setImage(imageUrl);

            const row = new ActionRowBuilder();

            if (displayType === "select") {
                row.addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`select_role_${roleId}`)
                        .setPlaceholder('Choisissez votre rôle...')
                        .addOptions([{ label: role.name, value: roleId, description: 'Cliquez pour obtenir ce rôle' }])
                );
            } else {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`role_${roleId}`)
                        .setLabel(role.name)
                        .setStyle(ButtonStyle.Danger)
                );
            }

            await channel.send({ embeds: [embed], components: [row] });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // Gestionnaire d'interactions (Boutons + Sélecteurs)
    client.on('interactionCreate', async (i) => {
        if (!i.isButton() && !i.isStringSelectMenu()) return;
        if (!i.customId.includes('role_')) return;

        const roleId = i.isStringSelectMenu() ? i.values[0] : i.customId.split('_').pop();
        const member = i.member;

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await i.reply({ content: "✅ Rôle retiré.", ephemeral: true });
        } else {
            await member.roles.add(roleId);
            await i.reply({ content: "✅ Rôle ajouté.", ephemeral: true });
        }
    });
};
