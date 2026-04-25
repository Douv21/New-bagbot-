const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ComponentType 
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Ouvrir la boutique du serveur'),

  async execute(interaction) {
    // 1. On prépare la réponse
    await interaction.deferReply();

    // 2. Définition des articles (Tu pourras les mettre dans ton config.json plus tard)
    const articles = [
      { id: 'role_vip', name: '👑 Rôle VIP', price: 5000, desc: 'Obtenez le grade VIP sur le serveur.' },
      { id: 'pass_69', name: '🔥 Pass 69', price: 500, desc: 'Débloque l\'accès illimité à la commande /69.' },
      { id: 'bonus_xp', name: '⚡ Bonus XP', price: 1000, desc: 'Double votre XP pendant 24 heures.' }
    ];

    // 3. Création de l'Embed visuel
    const shopEmbed = new EmbedBuilder()
      .setTitle('🏪 Boutique Officielle')
      .setDescription('Voici les articles disponibles. Utilisez le menu ci-dessous pour acheter.')
      .setColor('#f1c40f')
      .setThumbnail(interaction.guild.iconURL());

    articles.forEach(art => {
      shopEmbed.addFields({ name: `${art.name}`, value: `Prix: **${art.price}** 💰\n*${art.desc}*`, inline: false });
    });

    // 4. Création du menu de sélection
    const menu = new StringSelectMenuBuilder()
      .setCustomId('select_boutique')
      .setPlaceholder('Sélectionnez un article à acheter...')
      .addOptions(articles.map(art => ({
        label: art.name,
        description: `${art.price} coins`,
        value: art.id
      })));

    const row = new ActionRowBuilder().addComponents(menu);

    // 5. Envoi de la boutique
    const response = await interaction.editReply({
      embeds: [shopEmbed],
      components: [row]
    });

    // 6. COLLECTEUR : C'est ici qu'on gère le clic sur le menu sans sortir du fichier
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000 // Le menu expire après 60 secondes
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
          return i.reply({ content: "❌ Ce menu n'est pas pour vous.", ephemeral: true });
      }

      const selectedId = i.values[0];
      const item = articles.find(a => a.id === selectedId);

      // --- LOGIQUE D'ACHAT (Simulation) ---
      // Ici, tu devras normalement vérifier l'argent dans ton config.json ou ta DB
      const userMoney = 10000; // Simulation : l'utilisateur a 10.000 coins

      if (userMoney >= item.price) {
          await i.reply({ 
              content: `✅ Achat validé ! Tu as reçu **${item.name}** pour **${item.price}** 💰.`, 
              ephemeral: true 
          });
      } else {
          await i.reply({ 
              content: `❌ Tu n'as pas assez d'argent pour acheter **${item.name}**.`, 
              ephemeral: true 
          });
      }
    });

    collector.on('end', () => {
      // Désactive le menu une fois le temps écoulé
      row.components[0].setDisabled(true);
      interaction.editReply({ components: [row] }).catch(() => {});
    });
  }
};
