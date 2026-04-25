const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(`[ERREUR] Commande non trouvée: ${interaction.commandName}`);
                return;
            }
            
            // Système de cooldown
            const { cooldowns } = client;
            
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }
            
            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownAmount = 3 * 1000; // 3 secondes
            
            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
                
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('⏱️ Cooldown')
                        .setDescription(`Veuillez attendre ${timeLeft.toFixed(1)} secondes avant de réutiliser la commande \`${command.data.name}\`.`)
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
            
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
            
            try {
                await command.execute(interaction);
                console.log(`[COMMANDE] ${interaction.user.tag} a utilisé /${command.data.name} dans ${interaction.guild?.name || 'DM'}`);
            } catch (error) {
                console.error(`[ERREUR] Erreur lors de l'exécution de la commande ${command.data.name}:`, error);
                
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Une erreur est survenue lors de l\'exécution de cette commande.')
                    .setTimestamp();
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        } else if (interaction.isButton()) {
            // Gestion des clics sur les boutons
            console.log(`[BOUTON] ${interaction.user.tag} a cliqué sur ${interaction.customId}`);
        } else if (interaction.isModalSubmit()) {
            // Gestion des soumissions de modals
            console.log(`[MODAL] ${interaction.user.tag} a soumis ${interaction.customId}`);
        }
    }
};
