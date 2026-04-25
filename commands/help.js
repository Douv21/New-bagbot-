const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste des commandes disponibles'),
    
    async execute(interaction) {
        const commands = Array.from(interaction.client.commands.values());
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📚 Liste des commandes')
            .setDescription('Voici toutes les commandes disponibles:')
            .setTimestamp()
            .setFooter({ 
                text: `Demandé par ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });
        
        commands.forEach(command => {
            embed.addFields({
                name: `/${command.data.name}`,
                value: command.data.description || 'Aucune description disponible',
                inline: true
            });
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
