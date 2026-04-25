const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Affiche des informations sur le serveur'),
    
    async execute(interaction) {
        const guild = interaction.guild;
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`📊 Informations sur ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                {
                    name: '👥 Membres',
                    value: `Total: ${guild.memberCount}\nEn ligne: ${guild.members.cache.filter(m => m.presence?.status === 'online').size}`,
                    inline: true
                },
                {
                    name: '📅 Créé le',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                    inline: true
                },
                {
                    name: '👑 Propriétaire',
                    value: `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: '📝 Salons',
                    value: `Textuels: ${guild.channels.cache.filter(c => c.type === 0).size}\nVocaux: ${guild.channels.cache.filter(c => c.type === 2).size}`,
                    inline: true
                },
                {
                    name: '🎭 Rôles',
                    value: `${guild.roles.cache.size} rôles`,
                    inline: true
                },
                {
                    name: '🚀 Boosts',
                    value: `Niveau: ${guild.premiumTier}\nBoosts: ${guild.premiumSubscriptionCount || 0}`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `ID: ${guild.id}`,
                iconURL: guild.iconURL({ dynamic: true })
            });
        
        await interaction.reply({ embeds: [embed] });
    }
};
