// ... (imports habituels)

client.on('interactionCreate', async (interaction) => {
    
    // COMMANDE DE DÉPLOIEMENT (Lancée par le Dashboard ou un Admin)
    if (interaction.isChatInputCommand() && interaction.commandName === 'refresh-panel') {
        const plugin = manager.plugins.get('autorole');
        const data = plugin.data.settings; // On récupère les réglages du Dashboard

        const embed = new EmbedBuilder()
            .setTitle(data.embed.title)
            .setDescription(data.embed.description)
            .setColor(data.embed.color)
            .setImage(data.embed.banner_url || null) // La Bannière personnalisable
            .setThumbnail(data.embed.thumbnail_url || null)
            .setFooter({ 
                text: data.embed.footer_text, 
                iconURL: data.embed.footer_icon || null 
            });

        // Génération automatique des lignes de boutons (Illimité)
        const rows = [];
        let currentRow = new ActionRowBuilder();

        data.buttons.forEach((btn, index) => {
            if (index > 0 && index % 5 === 0) { // Discord limite à 5 boutons par ligne
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }

            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`role_${btn.roleName}`) // On lie le bouton au nom du rôle
                    .setLabel(btn.label)
                    .setEmoji(btn.emoji || '🔘')
                    .setStyle(ButtonStyle[btn.style || 'Primary'])
            );
        });
        
        if (currentRow.components.length > 0) rows.push(currentRow);

        await interaction.reply({ embeds: [embed], components: rows });
    }

    // GESTION DES CLICS (Système Universel)
    if (interaction.isButton() && interaction.customId.startsWith('role_')) {
        const roleName = interaction.customId.replace('role_', '');
        const role = interaction.guild.roles.cache.find(r => r.name === roleName);

        if (!role) return interaction.reply({ content: "❌ Ce rôle n'existe plus sur le serveur.", ephemeral: true });

        try {
            if (interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.remove(role);
                await interaction.reply({ content: `➖ Retiré : **${role.name}**`, ephemeral: true });
            } else {
                await interaction.member.roles.add(role);
                await interaction.reply({ content: `➕ Ajouté : **${role.name}**`, ephemeral: true });
            }
        } catch (e) {
            await interaction.reply({ content: "⚠️ Erreur de permissions (Hiérarchie).", ephemeral: true });
        }
    }
});
