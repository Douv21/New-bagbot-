const express = require('express');
const cors = require('cors');

function startAPI(manager) {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(cors()); // Autorise le Panel Web à parler au Bot
    app.use(express.json());

    // Route pour récupérer TOUS les plugins et leurs configs (GIFs, Titres...)
    app.get('/api/plugins', (req, res) => {
        const pluginList = Array.from(manager.plugins.values());
        res.json(pluginList);
    });

    // Route pour modifier un plugin depuis le Panel
    app.post('/api/plugins/:id/update', (req, res) => {
        const { id } = req.params;
        const newConfig = req.body;

        if (manager.plugins.has(id)) {
            // Ici, on mettrait à jour la base de données ou le fichier JSON
            console.log(`[API] Mise à jour du module ${id}`);
            res.json({ success: true, message: `Module ${id} mis à jour !` });
        } else {
            res.status(404).json({ error: "Plugin non trouvé" });
        }
    });

    app.listen(port, () => {
        console.log(`🌐 API du Panel Web lancée sur le port ${port}`);
    });
}

module.exports = startAPI;
