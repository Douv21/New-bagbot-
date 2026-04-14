const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
// On va chercher toutes les commandes dans le dossier /commands
const foldersPath = path.join(__dirname, 'commands');

if (fs.existsSync(foldersPath)) {
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        
        // On s'assure que c'est un dossier (ex: actions, admin...)
        if (fs.lstatSync(commandsPath).isDirectory()) {
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                
                // On vérifie que la commande a la structure requise par Discord
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else if ('name' in command && 'description' in command) {
                    // Pour tes anciennes commandes qui n'utilisent pas SlashCommandBuilder
                    commands.push({
                        name: command.name,
                        description: command.description,
                        options: command.options || []
                    });
                }
            }
        }
    }
}

// Utilisation du token (vérifie bien que c'est DISCORD_TOKEN dans ton .env)
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`⏳ Début de l'enregistrement de ${commands.length} commandes (/).`);

        // Utilisation de l'ID de ton bot
        await rest.put(
            Routes.applicationCommands("1488496461535510608"), 
            { body: commands },
        );

        console.log('✅ Toutes les commandes (/) ont été enregistrées avec succès !');
    } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement :', error);
    }
})();
