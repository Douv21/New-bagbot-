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
      // Zones par défaut si la config est vide
      let zones = ["le lit", "le canapé", "la douche", "la table", "le tapis"];

      if (guildId && global.getEconomyConfig) {
        const eco = await global.getEconomyConfig(guildId);
        const actionConfig = eco?.actions?.config?.sixtynine;
        if (actionConfig?.zones && actionConfig.zones.length > 0) {
          zones = actionConfig.zones;
        }
      }

      const focusedValue = interaction.options.getFocused().toLowerCase();
      const filtered = zones
        .filter(zone => zone.toLowerCase().includes(focusedValue))
        .map(zone => ({ name: zone, value: zone }));

      return await interaction.respond(filtered.slice(0, 25));
    } catch (error) {
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    // 1. On sécurise l'interaction immédiatement
    await interaction.deferReply();

    try {
      // 2. On récupère les choix de l'utilisateur
      const cible = interaction.options.getUser('cible');
      const zone = interaction.options.getString('zone') || 'le lit';

      // 3. Si le handler d'économie est là, on l'utilise pour la logique (argent, logs, etc.)
      if (global.handleEconomyAction) {
        return await global.handleEconomyAction(interaction, 'sixtynine');
      } 
      
      // 4. Message de secours (celui qui s'affichera si l'économie n'est pas encore liée)
      return await interaction.editReply({ 
        content: `🔥 **${interaction.user.username}** fait un 69 avec **${cible.username}** dans **${zone}** !` 
      });

    } catch (err) {
      console.error('[69 Execute Error]:', err);
      return await interaction.editReply({ content: '❌ Une erreur est survenue lors de l\'action.' });
    }
  }
};
