const express = require('express');
const fs = require('fs');
const path = require('path');

function startAPI(manager) {
    const app = express();
    const PORT = process.env.PORT || 49500;

    // Permet à l'API de lire le format JSON envoyé par le Dashboard
    app.use(express.json());
    app.use(express.static('public'));
    /**
     * ROUTE 1 : Récupérer la configuration actuelle
     * Le Dashboard appelle cette route pour afficher les réglages actuels
     */
    app.get('/api/plugins/:id', (req, res) => {
        const plugin = manager.plugins.get(req.params.id);
        if (!plugin) return res.status(404).json({ error: "Plugin non trouvé" });
        res.json(plugin.data);
    });

    /**
     * ROUTE 2 : Sauvegarder les modifications (ILLIMITÉ & PERSONNALISABLE)
     * C'est ici que la magie opère : le Dashboard envoie le nouveau footer, banner, boutons...
     */
    app.post('/api/plugins/:id/save', (req, res) => {
        const pluginId = req.params.id;
        const newData = req.body; // Les nouvelles infos envoyées par le site

        const pluginPath = path.join(__dirname, '../plugins', pluginId, 'config.json');

        if (fs.existsSync(pluginPath)) {
            try {
                // 1. On écrit physiquement dans le fichier config.json
                fs.writeFileSync(pluginPath, JSON.stringify(newData, null, 4));

                // 2. On met à jour la mémoire vive (le Map) du bot instantanément
                const plugin = manager.plugins.get(pluginId);
                if (plugin) {
                    plugin.data = newData;
                }

                console.log(`💾 Configuration de [${pluginId}] mise à jour via le Dashboard.`);
                res.json({ success: true, message: "Configuration enregistrée !" });
            } catch (error) {
                res.status(500).json({ error: "Erreur lors de l'écriture du fichier" });
            }
        } else {
            res.status(404).json({ error: "Fichier de config introuvable" });
        }
    });

    app.listen(PORT, () => {
        console.log(`🌐 API du Dashboard active sur le port ${PORT}`);
    });
}

module.exports = startAPI;
