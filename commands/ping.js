const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Vérifie la latence du bot'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Ping en cours...', 
            fetchReply: true 
        });
        
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
        
        await interaction.editReply(
            `🏓 Pong! Latence: ${timeDiff}ms\n` +
            `💓 Latence API: ${Math.round(interaction.client.ws.ping)}ms`
        );
    }
};
