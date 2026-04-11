#!/bin/bash

echo "Démarrage du système d'Auto-Pull..."

while true
do
    # Récupérer les infos depuis GitHub sans fusionner
    git fetch origin main

    # Comparer la version locale et la version GitHub
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse @{u})

    if [ $LOCAL != $REMOTE ]; then
        echo "Modification détectée sur GitHub ! Mise à jour en cours..."
        git pull origin main
        npm install
        pm2 restart bot-discord
        echo "Mise à jour effectuée avec succès."
    fi

    # Attendre 30 secondes avant la prochaine vérification
    sleep 30
done
