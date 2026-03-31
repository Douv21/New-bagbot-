const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Définition de la commande /config en dur pour le test
const commands = [
  {
    name: 'config',
    description: 'Configuration du bot (Panel intégré)',
    options: [
      {
        name: 'autorole',
        description: 'Modifier l\'apparence',
        type: 1, // Subcommand
        options: [
            { name: 'titre', description: 'Le titre', type: 3 },
            { name: 'gif', description: 'Lien du GIF', type: 3 }
        ]
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  
  try {
    console.log('🔄 Enregistrement des commandes Slash...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('🚀 Commandes enregistrées avec succès !');
  } catch (error) {
    console.error(error);
  }
});

// Logique de réponse à la commande
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'config') {
    const titre = interaction.options.getString('titre') || "Gestion des Rôles";
    const gif = interaction.options.getString('gif') || "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndnZueXp6bm9ueXp6bm9ueXp6bm9ueXp6bm9ueXp6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxof4ZpT79e/giphy.gif";

    const embed = new EmbedBuilder()
      .setTitle(titre)
      .setImage(gif)
      .setColor('#5865F2')
      .setFooter({ text: "Test de modularité réussi !" });

    await interaction.reply({ content: "Voici l'aperçu de ton module :", embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
