const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Simulons notre "Base de données" (ton fichier JSON de tout à l'heure)
const config = {
  autorole: {
    title: "Gestion des Rôles",
    description: "Cliquez sur les boutons pour choisir vos accès.",
    image: "https://media.giphy.com/media/v1.Y2lkPTc5.../giphy.gif", // Ton GIF ici
    color: "#5865F2",
    roles: [
      { id: "ID_DU_ROLE_1", label: "Joueur", emoji: "🎮" },
      { id: "ID_DU_ROLE_2", label: "News", emoji: "📢" }
    ]
  }
};

client.once('ready', () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
});

// Commande /config simple (pour l'instant en message)
client.on('messageCreate', async (message) => {
  if (message.content === '!setup-roles') {
    
    // Création de l'Embed PERSONNALISABLE (Image/GIF)
    const roleEmbed = new EmbedBuilder()
      .setTitle(config.autorole.title)
      .setDescription(config.autorole.description)
      .setColor(config.autorole.color)
      .setImage(config.autorole.image) // C'est ici que le GIF s'affiche en grand
      .setFooter({ text: "Panel de gestion modulable" });

    // Création des boutons dynamiquement
    const row = new ActionRowBuilder();
    config.autorole.roles.forEach(role => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`role_${role.id}`)
          .setLabel(role.label)
          .setEmoji(role.emoji)
          .setStyle(ButtonStyle.Primary)
      );
    });

    await message.channel.send({ embeds: [roleEmbed], components: [row] });
  }
});

client.login('TON_TOKEN_ICI'); // Mais utilise les Secrets GitHub pour plus de sécurité !
