const fs = require('fs');
const path = require('path');

class CommandHandler {
    constructor() {
        this.commands = new Map();
    }

    // Lit la config JSON pour les zones, prix, etc.
    async getEconomyConfig(guildId) {
        try {
            const configPath = path.join(__dirname, '../config.json');
            if (fs.existsSync(configPath)) {
                const data = fs.readFileSync(configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error("[Economy] Erreur lecture config:", e);
        }
        return {};
    }

    // Gère l'affichage des actions (69, kiss, hug, etc.)
    async handleEconomyAction(interaction, actionName) {
        try {
            const cible = interaction.options.getUser('cible');
            const zone = interaction.options.getString('zone') || 'le coin';
            const user = interaction.user;

            if (!cible) {
                return interaction.reply({ content: "❌ Tu dois cibler quelqu'un !", ephemeral: true });
            }

            // Ici tu pourras ajouter plus tard la déduction d'argent
            // const config = await this.getEconomyConfig(interaction.guildId);

            const messages = {
                'sixtynine': `🔥 **${user.username}** fait un 69 avec **${cible.username}** dans **${zone}** !`,
                'kiss': `💋 **${user.username}** fait un gros bisou à **${cible.username}** !`,
                'hug': `🫂 **${user.username}** fait un câlin tout doux à **${cible.username}** !`
            };

            const response = messages[actionName] || `✨ **${user.username}** interagit avec **${cible.username}** !`;

            return interaction.reply({ content: response });
        } catch (error) {
            console.error("[Economy] Erreur action:", error);
            if (!interaction.replied) {
                return interaction.reply({ content: "❌ Erreur lors de l'action.", ephemeral: true });
            }
        }
    }
}

const handlerInstance = new CommandHandler();

// Exportation pour l'index.js
module.exports = {
    handleEconomyAction: (i, a) => handlerInstance.handleEconomyAction(i, a),
    getEconomyConfig: (g) => handlerInstance.getEconomyConfig(g),
    handler: handlerInstance // Pour l'accès aux autres méthodes si besoin
};
