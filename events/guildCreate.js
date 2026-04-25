const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    
    async execute(guild, client) {
        console.log(`[SERVEUR] Ajouté à ${guild.name} (ID: ${guild.id})`);
        
        // Message de bienvenue dans le salon général si disponible
        const generalChannel = guild.channels.cache.find(
            channel => channel.name === 'general' || channel.name === 'général' || channel.name === 'accueil'
        ) || guild.systemChannel;
        
        if (generalChannel && generalChannel.permissionsFor(client.user).has('SendMessages')) {
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Merci de m\'avoir ajouté!')
                .setDescription(
                    'Je suis maintenant prêt à vous aider!\n\n' +
                    'Voici quelques commandes pour commencer:\n' +
                    '`/help` - Voir toutes les commandes\n' +
                    '`/ping` - Vérifier ma latence\n' +
                    '`/server` - Informations sur le serveur\n\n' +
                    'Accédez au dashboard web pour plus de fonctionnalités!'
                )
                .setTimestamp()
                .setFooter({ 
                    text: client.user.tag,
                    iconURL: client.user.displayAvatarURL()
                });
            
            await generalChannel.send({ embeds: [welcomeEmbed] });
        }
    }
};
