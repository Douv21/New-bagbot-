const { SlashCommandBuilder } = require('discord.js');

module.exports = {
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
    .setDMPermission(true),

  async autocomplete(interaction) {
    try {
      const guildId = interaction.guild?.id;
      let zones = ["le lit", "le canapé", "la douche", "la table"]; // Zones par défaut

      // On essaie de récupérer les zones depuis la config si possible
      if (guildId && global.getEconomyConfig) {
        const config = await global.getEconomyConfig(guildId);
        const configZones = config?.actions?.config?.sixtynine?.zones;
        if (configZones && configZones.length > 0) {
          zones = configZones;
        }
      }

      const focusedValue = interaction.options.getFocused().toLowerCase();
      const filtered = zones
        .filter(zone => zone.toLowerCase().includes(focusedValue))
        .map(zone => ({ name: zone, value: zone }));

      return await interaction.respond(filtered.slice(0, 25));
    } catch (error) {
      console.error('[69 Autocomplete Error]:', error);
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    // 1. On sécurise immédiatement l'interaction pour éviter le "ne répond pas"
    await interaction.deferReply();

    try {
      // 2. On vérifie si le handler global est bien présent
      if (global.handleEconomyAction) {
        return await global.handleEconomyAction(interaction, 'sixtynine');
      } else {
        // Fallback si le handler n'est pas chargé (pour éviter l'erreur)
        const cible = interaction.options.getUser('cible');
        const zone = interaction.options.getString('zone') || 'le lit';
        return await interaction.editReply({ 
          content: `🔥 **${interaction.user.username}** fait un 69 avec **${cible.username}** dans **${zone}** !` 
        });
      }
    } catch (err) {
      console.error('[69 Execute Error]:', err);
      return await interaction.editReply({ content: '❌ Une erreur est survenue lors de l\'action.' });
    }
  }
};
