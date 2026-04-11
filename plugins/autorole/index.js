const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = function(app, client) {
    app.get('/api/channels', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.channels.cache.filter(c => c.type === 0).map(c => ({ id: c.id, name: c.name })) : []);
    });

    app.get('/api/roles', (req, res) => {
        const guild = client.guilds.cache.first();
        res.json(guild ? guild.roles.cache.filter(r => !r.managed && r.name !== "@everyone").map(r => ({ id: r.id, name: r.name })) : []);
    });

    app.post('/update-bot', async (req, res) => {
        try {
            const { channelId, roleId, content } = req.body;

            // Vérification ultra-basique mais obligatoire
            if (!channelId || channelId === "undefined") return res.status(400).json({ error: "ID Salon manquant" });

            const channel = await client.channels.fetch(channelId);
            const role = await channel.guild.roles.fetch(roleId);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_normal_${roleId}`)
                    .setLabel(role.name)
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ content: content || "Sélectionnez votre rôle :", components: [row] });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
};
