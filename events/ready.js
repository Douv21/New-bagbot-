const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    
    execute(client) {
        console.log(`[BOT] ${client.user.tag} est en ligne!`);
        console.log(`[BOT] Servi sur ${client.guilds.cache.size} serveur(s)`);
        
        // Statut du bot
        client.user.setActivity('🤖 /help pour les commandes', { type: 'WATCHING' });
        
        // Log des serveurs
        client.guilds.cache.forEach(guild => {
            console.log(`[SERVEUR] ${guild.name} (ID: ${guild.id}) - ${guild.memberCount} membres`);
        });
    }
};
