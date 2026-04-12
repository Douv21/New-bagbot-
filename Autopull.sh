#!/bin/bash

# Nom de l'application dans PM2
APP_NAME="bagbot"

echo "🚀 Démarrage du script autopull pour $APP_NAME..."

while true; do
    # 1. On se synchronise avec GitHub (écrase les modifs locales sur main.py)
    git fetch --all
    
    # On vérifie s'il y a des changements
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u})

    if [ $LOCAL != $REMOTE ]; then
        echo "🔄 Changement détecté sur GitHub. Mise à jour en cours..."
        
        # Force la mise à jour pour éviter les erreurs de fusion
        git reset --hard origin/main
        
        # 2. On redémarre le bot via PM2 pour charger le nouveau code/HTML
        pm2 restart $APP_NAME
        
        echo "✅ Mise à jour effectuée et bot redémarré."
    fi

    # 3. Attente de 60 secondes avant la prochaine vérification
    sleep 60
done
