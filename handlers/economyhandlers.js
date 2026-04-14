const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() { }

    async getEconomyConfig(guildId) {
        try {
            const configPath = path.join(__dirname, '../config.json');
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (e) { console.error(e); }
        return {};
    }

    async handleEconomyAction(interaction, actionName) {
        // IMPORTANT : On ne fait PAS interaction.reply ici car la commande a déjà fait un deferReply
        try {
            const cible = interaction.options.getUser('cible');
            const zone = interaction.options.getString('zone') || 'le coin';
            
            const messages = {
                'sixtynine': `🔥 **${interaction.user.username}** fait un 69 avec **${cible.username}** dans **${zone}** !`,
            };

            const response = messages[actionName] || "Action effectuée !";

            // On utilise editReply car la commande a "réservé" la réponse avec deferReply
            return await interaction.editReply({ content: response });
        } catch (error) {
            console.error("Erreur Handler:", error);
            return await interaction.editReply({ content: "❌ Une erreur est survenue." });
        }
    }
}

const handlerInstance = new CommandHandler();
module.exports = {
    handleEconomyAction: (i, a) => handlerInstance.handleEconomyAction(i, a),
    getEconomyConfig: (g) => handlerInstance.getEconomyConfig(g)
};
