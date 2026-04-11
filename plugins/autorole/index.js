app.post('/update-bot', upload.single('imageFile'), async (req, res) => {
    const { mode, channelId, roleId, content, title, description, imageUrl, displayType } = req.body;
    
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ success: false, message: "Salon introuvable" });

        const role = await channel.guild.roles.fetch(roleId);
        const messageOptions = { embeds: [], components: [], files: [] };

        if (mode === 'simple') {
            messageOptions.content = content || "Cliquez ci-dessous pour le rôle :";
        } else {
            const embed = new EmbedBuilder()
                .setTitle(title || "Sélection de rôle")
                .setDescription(description || "Appuyez sur le bouton pour obtenir votre rôle.")
                .setColor("#ff4d4d");

            if (req.file) {
                // Utilisation du fichier local uploadé
                const file = new AttachmentBuilder(`public/uploads/${req.file.filename}`);
                embed.setImage(`attachment://${req.file.filename}`);
                messageOptions.files = [file];
            } else if (imageUrl && imageUrl.startsWith('http')) {
                embed.setImage(imageUrl);
            }
            messageOptions.embeds = [embed];
        }

        const row = new ActionRowBuilder();
        if (displayType === 'select') {
            row.addComponents(new StringSelectMenuBuilder()
                .setCustomId(`role_select_${roleId}`)
                .setPlaceholder('Choisir un rôle...')
                .addOptions([{ label: role ? role.name : "Rôle", value: roleId }]));
        } else {
            row.addComponents(new ButtonBuilder()
                .setCustomId(`role_btn_${roleId}`)
                .setLabel(role ? role.name : "Obtenir le rôle")
                .setStyle(ButtonStyle.Danger));
        }
        messageOptions.components = [row];

        // LOG DANS LA CONSOLE POUR VÉRIFIER
        console.log(`🚀 Tentative d'envoi dans le salon : ${channel.name}`);
        
        await channel.send(messageOptions);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Erreur d'envoi Discord :", err);
        res.status(500).json({ success: false, message: err.message });
    }
});
