const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
const foldersPath = path.join(__dirname, 'commands');

// Lecture récursive pour trouver tous les fichiers .js
function getFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            getFiles(fullPath); // On entre dans les sous-dossiers (ex: actions)
        } else if (file.endsWith('.js')) {
            const command = require(fullPath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`Loaded for deploy: ${command.data.name}`);
            }
        }
    }
}

getFiles(foldersPath);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`⏳ Début du déploiement de ${commands.length} commandes...`);

        // Envoi à Discord
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), // Assure-toi d'avoir CLIENT_ID dans ton .env
            { body: commands },
        );

        console.log(`✅ Succès ! ${data.length} commandes sont maintenant actives sur Discord.`);
    } catch (error) {
        console.error(error);
    }
})();
