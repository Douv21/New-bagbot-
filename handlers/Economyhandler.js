const fs = require('fs');
const path = require('path');

class CommandHandler {
  constructor() {
    this.commands = new Map();
  }

  /**
   * Charge toutes les commandes depuis le dossier commands
   */
  async loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');
    
    if (!fs.existsSync(commandsPath)) {
      console.log('[CommandHandler] Le dossier commands n\'existe pas encore');
      return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      try {
        const filePath = path.join(commandsPath, file);
        delete require.cache[require.resolve(filePath)]; // Clear cache pour hot reload
        const command = require(filePath);

        if (!command.name) {
          console.warn(`[CommandHandler] La commande ${file} n'a pas de propriété 'name'`);
          continue;
        }

        // Une commande peut avoir plusieurs noms (aliases)
        const names = Array.isArray(command.name) ? command.name : [command.name];
        
        for (const name of names) {
          this.commands.set(name, command);
          if (client && client.commands) {
            client.commands.set(name, command);
          }
        }

        console.log(`[CommandHandler] Commande chargée: ${names.join(', ')} (${file})`);
      } catch (error) {
        console.error(`[CommandHandler] Erreur lors du chargement de ${file}:`, error);
      }
    }

    console.log(`[CommandHandler] ${this.commands.size} commandes chargées`);
  }

  /**
   * Exécute une commande
   */
  async handleCommand(interaction, context) {
    const commandName = interaction.commandName;
    const command = this.commands.get(commandName);
    console.log('[Autocomplete] Commande trouvée:', !!command, 'hasAutocomplete:', !!(command?.autocomplete));

    if (!command) {
      return false; // Commande non trouvée
    }

    try {
      const result = await command.execute(interaction, context);
      
      // Si la commande retourne explicitement false, passer au fallback (bot.js)
      if (result === false) {
        console.log(`[CommandHandler] ${commandName} demande le fallback vers bot.js`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`[CommandHandler] Erreur lors de l'exécution de ${commandName}:`, error);
      
      try {
        const errorMessage = { content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true };
        
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(errorMessage);
        } else if (interaction.deferred) {
          await interaction.editReply(errorMessage);
        } else {
          await interaction.followUp(errorMessage);
        }
      } catch (replyError) {
        console.error('[CommandHandler] Impossible de répondre à l\'erreur:', replyError);
      }

      return true;
    }
  }

  /**
   * Gère les interactions des commandes (menus, boutons, etc.)
   */
  async handleInteraction(interaction) {
    // Parcourir toutes les commandes pour trouver celle qui peut gérer cette interaction
    for (const [name, command] of this.commands) {
      if (command.handleInteraction && typeof command.handleInteraction === 'function') {
        try {
          const handled = await command.handleInteraction(interaction);
          if (handled !== false) {
            return true; // L'interaction a été gérée
          }
        } catch (error) {
          console.error(`[CommandHandler] Erreur dans handleInteraction de ${name}:`, error);
        }
      }
    }
    return false; // Aucune commande n'a géré l'interaction
  }

  /**
   * Recharge toutes les commandes
   */
  async reloadCommands() {
    this.commands.clear();
    await this.loadCommands();
  }

  /**
   * Gère l'autocomplete des commandes
   */
  async handleAutocomplete(interaction) {
    console.log('[Autocomplete] Appelé pour commande:', interaction.commandName);
    const commandName = interaction.commandName;
    const command = this.commands.get(commandName);
    console.log('[Autocomplete] Commande trouvée:', !!command, 'hasAutocomplete:', !!(command?.autocomplete));

    if (!command) {
      return false;
    }

    if (!command.autocomplete || typeof command.autocomplete !== 'function') {
      return false;
    }

    try {
      await command.autocomplete(interaction);
      return true;
    } catch (error) {
      console.error(`[CommandHandler] Erreur autocomplete pour ${commandName}:`, error);
      try {
        await interaction.respond([]);
      } catch (e) {}
      return true;
    }
  }
}


module.exports = new CommandHandler();
