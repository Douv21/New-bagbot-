const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('69')
    .setDescription('Position 69 avec quelqu\'un')
    .addUserOption(opt => opt.setName('cible').setDescription('La cible').setRequired(true))
    .addStringOption(opt => opt.setName('zone').setDescription('Le lieu').setAutocomplete(true)),

  async autocomplete(interaction) {
    try {
      // On évite de bloquer l'autocomplete
      const choices = ["Lit", "Canapé", "Table", "Douche"]; 
      const focused = interaction.options.getFocused().toLowerCase();
      const filtered = choices.filter(c => c.toLowerCase().includes(focused));
      return await interaction.respond(filtered.map(c => ({ name: c, value: c })));
    } catch (e) { console.error(e); }
  },

  async execute(interaction) {
    // ÉTAPE 1 : On dit immédiatement à Discord qu'on a reçu la commande
    // Ça empêche le message "L'application ne répond pas"
    await interaction.deferReply(); 

    // ÉTAPE 2 : On appelle la logique
    if (global.handleEconomyAction) {
        try {
            return await global.handleEconomyAction(interaction, 'sixtynine');
        } catch (err) {
            console.error(err);
            return await interaction.editReply("Erreur de liaison.");
        }
    }
    
    return await interaction.editReply("Système d'économie introuvable.");
  }
};
