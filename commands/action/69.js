const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('69')
    .setDescription('Position 69 avec quelqu\'un')
    .addUserOption(opt => opt.setName('cible').setDescription('La personne').setRequired(true))
    .addStringOption(opt => opt.setName('zone').setDescription('Le lieu').setAutocomplete(true))
    .setDMPermission(true),

  async autocomplete(interaction) {
    try {
      const guildId = interaction.guild?.id;
      if (!guildId || !global.getEconomyConfig) return interaction.respond([]);

      const config = await global.getEconomyConfig(guildId);
      const zones = config.welcome?.zones || ["Lit", "Canapé", "Douche"]; // Fallback si vide
      
      const focused = interaction.options.getFocused().toLowerCase();
      const choices = zones
        .filter(z => z.toLowerCase().includes(focused))
        .map(z => ({ name: z, value: z }));

      return interaction.respond(choices.slice(0, 25));
    } catch (e) { return interaction.respond([]); }
  },

  async execute(interaction) {
    // On appelle la fonction globale définie dans index.js
    if (global.handleEconomyAction) {
        return await global.handleEconomyAction(interaction, 'sixtynine');
    }
    return interaction.reply({ content: "Système d'économie indisponible.", ephemeral: true });
  }
};
