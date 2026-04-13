const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boutique')
        .setDescription('Ouvrir la boutique du serveur')
        .setDMPermission(false),

    async execute(interaction) {
        // Lecture de la config la plus récente
        const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
        const boutique = config.shop || { title: "Boutique", items: [] };

        if (boutique.items.length === 0) {
            return interaction.reply({ content: "La boutique est actuellement vide.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(boutique.title || "🛒 Boutique du Serveur")
            .setDescription(boutique.description || "Sélectionnez un article ci-dessous pour voir les détails.")
            .setColor(boutique.color || "#ed4245")
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: "Système de Boutique Elite" });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('shop_select')
            .setPlaceholder('Choisissez un article...')
            .addOptions(boutique.items.map((item, index) => ({
                label: item.name,
                description: `${item.price} coins - ${item.short_desc || ''}`,
                value: `item_${index}`,
                emoji: '💰'
            })));

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
