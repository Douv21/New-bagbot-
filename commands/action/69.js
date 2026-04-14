const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: '69',
  data: new SlashCommandBuilder()
    .setName('69')
    .setDescription('Position 69 avec quelqu\'un')
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Personne avec qui faire un 69')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('zone')
        .setDescription('Zone spécifique (ex: lit, canapé...)')
        .setRequired(false)
        .setAutocomplete(true))
    .setDMPermission(true)
    .setContexts([0, 1, 2]) // Autorise partout (Serveur, DM, Privé)
    .setIntegrationTypes([0, 1]), // Installation Guild & User

  async autocomplete(interaction) {
    try {
      // On récupère l'ID de la guilde ou celui par défaut des variables d'environnement
      const guildId = interaction.guild?.id || process.env.GUILD_ID;
      
      if (!guildId || !global.getEconomyConfig) {
        return interaction.respond([]);
      }

      const eco = await global.getEconomyConfig(guildId);
      // On cherche spécifiquement la configuration de l'action "sixtynine"
      const actionConfig = eco?.actions?.config?.sixtynine || {};
      const zones = actionConfig.zones || [];

      if (zones.length === 0) return interaction.respond([]);

      // Filtrage selon ce que l'utilisateur commence à taper
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const filtered = zones
        .filter(zone => zone.toLowerCase().includes(focusedValue))
        .map(zone => ({ name: zone, value: zone }));

      return interaction.respond(filtered.slice(0, 25));
    } catch (error) {
      console.error('[69 Autocomplete] Error:', error);
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    // Redirection vers le handler global d'économie pour traiter l'action
    if (global.handleEconomyAction) {
      try {
        return await global.handleEconomyAction(interaction, 'sixtynine');
      } catch (err) {
        console.error('[69 Execute] Error:', err);
        return interaction.reply({ content: '❌ Erreur lors de l\'exécution.', ephemeral: true });
      }
    } else {
      return interaction.reply({ 
        content: '❌ Système d\'économie non disponible sur ce bot.', 
        ephemeral: true 
      });
    }
  }
};
