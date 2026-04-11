const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'refresh-panel',
        description: 'Affiche le panneau de gestion des rôles',
    }
];

// Vérification que le token est présent
if (!process.env.TOKEN) {
    console.error("❌ Erreur : Le TOKEN n'est pas défini dans le fichier .env");
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('⏳ Début de l\'enregistrement des commandes (/)');

        // On utilise l'ID du bot qui est dans l'URL de ta page Developer ou tu peux le mettre en dur ici
        // Remplace "ID_DE_TON_BOT" par les chiffres de l'ID de ton bot
        await rest.put(
            Routes.applicationCommands("ID_DE_TON_BOT"), 
            { body: commands },
        );

        console.log('✅ Commandes (/) enregistrées avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement :', error);
    }
})();

