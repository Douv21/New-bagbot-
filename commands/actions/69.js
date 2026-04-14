const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('69')
    .setDescription('Test simple'),

  async execute(interaction) {
    // Si CA ne répond pas, c'est que le bot ne reçoit même pas l'ordre
    return interaction.reply("✅ Le bot fonctionne et reçoit la commande !");
  }
};
