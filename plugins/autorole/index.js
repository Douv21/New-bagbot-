const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = function(app, client) {
    
    // --- API : Récupérer les salons pour le Dashboard ---
    app.get('/api/channels', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const channels = guild.channels.cache
            .filter(c => c.type === 0) // Salons textuels uniquement
            .map(c => ({ id: c.id, name: c.name }));
        res.json(channels);
    });

    // --- API : Récupérer les rôles pour le Dashboard ---
    app.get('/api/roles', async (req, res) => {
        const guild = client.guilds.cache.first();
        if (!guild) return res.json([]);
        const roles = guild.roles.cache
            .filter(r => r.name !== "@everyone" && !r.managed)
            .map(r => ({ id: r.id, name: r.name }));
        res.json(roles);
    });

    // --- API : Recevoir la commande du Dashboard ---
    app.post('/update-bot', async (req, res) => {
        const { title, roleId, channelId } = req.body;
        try {
            const channel = await client.channels.fetch(channelId);
            const embed = new EmbedBuilder()
                .setTitle(title || "Rôles-Réactions")
                .setDescription("Cliquez sur le bouton ci-dessous pour obtenir ou retirer votre rôle.")
                .setColor("#ff4d4d");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_${roleId}`)
                    .setLabel("Obtenir le rôle")
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embed], components: [row] });
            res.json({ success: true, message: "Panneau déployé !" });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });

    // --- LOGIQUE : Gestion du clic sur le bouton ---
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton() || !interaction.customId.startsWith('role_')) return;

        const roleId = interaction.customId.replace('role_', '');
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) return interaction.reply({ content: "❌ Rôle introuvable.", ephemeral: true });

        try {
            if (interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `➖ Rôle **${role.name}** retiré !`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `➕ Rôle **${role.name}** ajouté !`, ephemeral: true });
            }
        } catch (error) {
            interaction.reply({ content: "❌ Erreur de permissions (mon rôle est peut-être trop bas).", ephemeral: true });
        }
    });
};
