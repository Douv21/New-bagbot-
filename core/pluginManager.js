const fs = require('fs');
const path = require('path');

class PluginManager {
    constructor(client) {
        this.client = client;
        this.plugins = new Map();
    }

    /**
     * Scanne le dossier /plugins et charge la configuration de chaque module.
     * Cette méthode est le "cœur" de la modularité style Home Assistant.
     */
    loadAll() {
        // Le "../" est crucial car ce fichier est dans src/core
        const pluginsPath = path.join(__dirname, '../plugins');

        // Vérification de sécurité si le dossier plugins n'existe pas encore
        if (!fs.existsSync(pluginsPath)) {
            console.log("⚠️ Dossier /plugins introuvable. Création en cours...");
            fs.mkdirSync(pluginsPath);
            return;
        }

        const pluginFolders = fs.readdirSync(pluginsPath);

        for (const folder of pluginFolders) {
            const pluginFolderPath = path.join(pluginsPath, folder);
            
            // On s'assure que c'est bien un dossier et pas un fichier (comme .DS_Store)
            if (!fs.statSync(pluginFolderPath).isDirectory()) continue;

            const configPath = path.join(pluginFolderPath, 'config.json');
            
            if (fs.existsSync(configPath)) {
                try {
                    // Chargement du fichier de configuration du plugin
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    
                    // Enregistrement dans la mémoire vive du bot (Map)
                    this.plugins.set(folder, {
                        id: folder,
                        name: config.name || folder,
                        enabled: config.enabled ?? true,
                        permissions: config.permissions || ["ManageGuild"],
                        visuals: config.visuals || {},
                        options: config.options || []
                    });

                    console.log(`✅ Plugin [${folder}] chargé avec succès.`);
                } catch (error) {
                    console.error(`❌ Erreur lors de la lecture du config.json de [${folder}]:`, error.message);
                }
            } else {
                console.log(`ℹ️ Dossier [${folder}] ignoré (pas de config.json trouvé).`);
            }
        }
    }

    /**
     * Vérifie si un membre a les permissions requises pour gérer un plugin spécifique.
     * Utile pour sécuriser le futur Panel Web.
     */
    hasAccess(member, pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return false;
        
        // Vérifie si le membre possède l'une des permissions Discord requises (ex: ManageRoles)
        return member.permissions.has(plugin.permissions);
    }
}

module.exports = PluginManager;
