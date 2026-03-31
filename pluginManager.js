const fs = require('fs');
const path = require('path');

class PluginManager {
    constructor(client) {
        this.client = client;
        this.plugins = new Map();
    }

    // Charge tous les plugins du dossier /plugins
    loadAll() {
        const pluginsPath = path.join(__dirname, '../plugins');
        const pluginFolders = fs.readdirSync(pluginsPath);

        for (const folder of pluginFolders) {
            const configPath = path.join(pluginsPath, folder, 'config.json');
            
            if (fs.existsSync(configPath)) {
                const config = require(configPath);
                
                // On enregistre le plugin dans la mémoire du bot
                this.plugins.set(folder, {
                    id: folder,
                    name: config.name || folder,
                    enabled: config.enabled ?? true,
                    permissions: config.permissions || ["ManageGuild"],
                    data: config
                });

                console.log(`📦 Plugin chargé : ${folder}`);
            }
        }
    }

    // Vérifie si un membre Discord a accès à ce module (pour le Panel)
    hasAccess(member, pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        
        // Vérifie si le membre possède l'une des permissions Discord requises
        return member.permissions.has(plugin.permissions);
    }
}

module.exports = PluginManager;
