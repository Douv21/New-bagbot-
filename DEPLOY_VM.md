# 🐧 Guide de déploiement sur VM Debian (Sans MongoDB/Nginx)

## 📋 Prérequis

- VM Debian 11+ (Bullseye) ou supérieur
- Accès root ou sudo
- 2GB RAM minimum
- 10GB d'espace disque

## 🚀 Installation rapide

### Étape 1: Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential python3 python3-pip
```

### Étape 2: Installation de Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### Étape 3: Installation des dépendances pour Canvas (images)
```bash
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### Étape 4: Cloner le projet
```bash
cd /opt
sudo git clone https://github.com/Douv21/New-bagbot-.git discord-bot
sudo chown -R $USER:$USER discord-bot
cd discord-bot
```

### Étape 5: Installation des dépendances Node.js
```bash
npm install
```

### Étape 6: Installation de PM2
```bash
sudo npm install -g pm2
```

## ⚙️ Configuration

### Étape 7: Configuration des variables d'environnement
```bash
cp .env.example .env
nano .env
```

**Contenu du fichier .env :**
```env
# Token du bot Discord (OBTENU DEPUIS LE PORTAIL DÉVELOPPEUR DISCORD)
DISCORD_TOKEN=VOTRE_TOKEN_DISCORD_ICI

# Client ID et Secret pour OAuth2 (OBTENU DEPUIS LE PORTAIL DÉVELOPPEUR DISCORD)
DISCORD_CLIENT_ID=VOTRE_CLIENT_ID_ICI
DISCORD_CLIENT_SECRET=VOTRE_CLIENT_SECRET_ICI

# URL de redirection OAuth2 (REMPLACEZ VOTRE_IP)
DISCORD_REDIRECT_URI=http://VOTRE_IP:3000/auth/callback

# Secret de session (GÉNÉREZ UNE CHAÎNE ALÉATOIRE)
SESSION_SECRET=VOTRE_SECRET_SESSION_ICI

# Port du dashboard
PORT=3000

# ID du serveur (OPTIONNEL, pour les commandes slash en développement)
GUILD_ID=VOTRE_ID_SERVEUR_ICI
```

### Étape 8: Créer les dossiers nécessaires
```bash
mkdir -p data logs
```

## 🔧 Démarrage du bot

### Étape 9: Créer le fichier de configuration PM2
```bash
nano ecosystem.config.js
```

**Contenu du fichier ecosystem.config.js :**
```javascript
module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'discord-dashboard',
      script: 'dashboard.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/dashboard-error.log',
      out_file: './logs/dashboard-out.log',
      log_file: './logs/dashboard-combined.log',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Étape 10: Démarrer les services
```bash
# Démarrer les applications
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Activer le démarrage automatique au boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 🔥 Configuration du Firewall

### Étape 11: Configurer UFW
```bash
# Autoriser SSH
sudo ufw allow ssh

# Autoriser le port du dashboard
sudo ufw allow 3000/tcp

# Activer le firewall
sudo ufw --force enable

# Vérifier le statut
sudo ufw status
```

## 📊 Vérification

### Étape 12: Vérifier que tout fonctionne
```bash
# Vérifier le statut des applications
pm2 status

# Voir les logs en temps réel
pm2 logs discord-bot
pm2 logs discord-dashboard

# Vérifier que les ports sont ouverts
sudo netstat -tlnp | grep :3000

# Redémarrer si nécessaire
pm2 restart all
```

## 🌐 Accès au Dashboard

Une fois tout configuré, accédez au dashboard via :
- **URL**: `http://VOTRE_IP:3000`
- **Login**: Connexion via Discord OAuth2

## 🤖 Configuration Discord

### Étape 13: Configurer l'application Discord
1. Allez sur le [Portail Développeur Discord](https://discord.com/developers/applications)
2. Sélectionnez votre application
3. **Bot** → Activez les "Privileged Gateway Intents":
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
4. **OAuth2** → Ajoutez le redirect URI:
   - `http://VOTRE_IP:3000/auth/callback`
5. **OAuth2** → Cochez les scopes:
   - `bot`
   - `applications.commands`
   - `identify`
   - `guilds`

### Étape 14: Inviter le bot
1. Générez une URL d'invitation avec les permissions:
   - Administrator (recommandé pour tester)
   - Ou permissions spécifiques:
     - Manage Channels
     - Manage Messages
     - Manage Roles
     - Manage Threads
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
     - Use External Emojis

## 📝 Commandes utiles

### Gestion PM2
```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs

# Redémarrer une application
pm2 restart discord-bot
pm2 restart discord-dashboard

# Arrêter une application
pm2 stop discord-bot
pm2 stop discord-dashboard

# Supprimer une application
pm2 delete discord-bot
pm2 delete discord-dashboard

# Monitorer en temps réel
pm2 monit
```

### Général
```bash
# Mettre à jour le bot
cd /opt/discord-bot
git pull origin main
npm install
pm2 restart all

# Voir les logs du système
tail -f /var/log/syslog

# Redémarrer le serveur (si nécessaire)
sudo reboot
```

## 🔍 Dépannage

### Problèmes courants

1. **Bot ne démarre pas**
   ```bash
   # Vérifier les logs
   pm2 logs discord-bot
   
   # Vérifier le token Discord
   node -e "console.log(process.env.DISCORD_TOKEN)"
   ```

2. **Dashboard inaccessible**
   ```bash
   # Vérifier si le port est ouvert
   sudo netstat -tlnp | grep :3000
   
   # Vérifier les logs du dashboard
   pm2 logs discord-dashboard
   ```

3. **Permissions Discord**
   - Assurez-vous que le bot a les permissions nécessaires sur le serveur
   - Vérifiez que les Gateway Intents sont activés

4. **Canvas/Image errors**
   ```bash
   # Réinstaller les dépendances Canvas
   npm rebuild canvas
   ```

## 🔄 Maintenance

### Mise à jour automatique
```bash
# Créer un script de mise à jour
nano /opt/discord-bot/update.sh
```

**Contenu du script update.sh :**
```bash
#!/bin/bash
cd /opt/discord-bot
git pull origin main
npm install
pm2 restart all
echo "Bot mis à jour le $(date)" >> /opt/discord-bot/update.log
```

```bash
# Rendre le script exécutable
chmod +x /opt/discord-bot/update.sh

# Créer un cron pour les mises à jour automatiques (tous les jours à 3h du matin)
crontab -e
# Ajouter: 0 3 * * * /opt/discord-bot/update.sh
```

## 📊 Monitoring

### Scripts de monitoring
```bash
# Créer un script de monitoring
nano /opt/discord-bot/monitor.sh
```

**Contenu du script monitor.sh :**
```bash
#!/bin/bash
# Vérifier si le bot est en ligne
if ! pm2 list | grep -q "discord-bot.*online"; then
    echo "$(date): Bot offline, restarting..." >> /opt/discord-bot/monitor.log
    pm2 restart discord-bot
fi

# Vérifier si le dashboard est en ligne
if ! pm2 list | grep -q "discord-dashboard.*online"; then
    echo "$(date): Dashboard offline, restarting..." >> /opt/discord-bot/monitor.log
    pm2 restart discord-dashboard
fi
```

## 🎯 Résumé des commandes de démarrage

```bash
# Commande complète pour démarrer le bot sur une VM Debian neuve
sudo apt update && sudo apt upgrade -y && \
sudo apt install -y curl wget git build-essential python3 python3-pip && \
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
sudo apt install -y nodejs && \
sudo apt install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && \
cd /opt && \
sudo git clone https://github.com/Douv21/New-bagbot-.git discord-bot && \
sudo chown -R $USER:$USER discord-bot && \
cd discord-bot && \
npm install && \
sudo npm install -g pm2 && \
cp .env.example .env && \
# Éditer .env avec vos configurations
nano .env && \
mkdir -p data logs && \
pm2 start ecosystem.config.js && \
pm2 save && \
pm2 startup && \
sudo ufw allow ssh && \
sudo ufw allow 3000/tcp && \
sudo ufw --force enable && \
pm2 status
```

Votre bot Discord complet avec dashboard est maintenant déployé et opérationnel ! 🎉
