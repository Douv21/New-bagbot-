# Discord Bot Dashboard

Un bot Discord complet avec dashboard web intégré pour la gestion et l'administration.

## 🚀 Fonctionnalités

### Bot Discord
- ✅ Commandes slash modernes
- ✅ Système de cooldown anti-spam
- ✅ Gestion des serveurs
- ✅ Messages embed riches
- ✅ Système d'événements complet

### Dashboard Web
- ✅ Authentification OAuth2 avec Discord
- ✅ Interface moderne et responsive
- ✅ Gestion des serveurs
- ✅ Statistiques en temps réel
- ✅ API REST complète
- ✅ Base de données MongoDB

## 📋 Prérequis

- Node.js 16.0 ou supérieur
- MongoDB (local ou cloud)
- Un compte Discord et une application Discord

## 🛠️ Installation

1. **Cloner le repository**
```bash
git clone <repository-url>
cd discord-bot-dashboard
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos informations:
```env
# Token du bot Discord
DISCORD_TOKEN=votre_token_discord_ici

# Client ID et Secret pour OAuth2
DISCORD_CLIENT_ID=votre_client_id_ici
DISCORD_CLIENT_SECRET=votre_client_secret_ici

# URL de redirection OAuth2
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# Secret de session
SESSION_SECRET=votre_secret_session_ici

# MongoDB URI
MONGO_URI=mongodb://localhost:27017/discord_bot

# Port du dashboard
PORT=3000

# ID du serveur (guild) pour les commandes slash (optionnel)
GUILD_ID=votre_id_serveur_ici
```

4. **Démarrer les services**

Pour le développement:
```bash
npm run dev
```

Pour la production:
```bash
npm start
```

Pour le dashboard uniquement:
```bash
npm run dashboard
```

## 🤖 Commandes du Bot

| Commande | Description |
|----------|-------------|
| `/help` | Affiche la liste des commandes disponibles |
| `/ping` | Vérifie la latence du bot |
| `/server` | Affiche des informations sur le serveur |

## 🌐 Dashboard

Le dashboard est accessible à l'adresse `http://localhost:3000`:

- **Page d'accueil**: Présentation du projet et connexion
- **Dashboard**: Gestion des serveurs et statistiques
- **API**: Endpoints REST pour les données du bot

### Routes de l'API

- `GET /api/bot/stats` - Statistiques du bot
- `GET /api/guild/:guildId` - Informations d'un serveur
- `GET /api/guild/:guildId/members` - Liste des membres
- `GET /api/guild/:guildId/channels` - Liste des salons
- `POST /api/guild/:guildId/message` - Envoyer un message

## 📁 Structure du Projet

```
discord-bot-dashboard/
├── commands/          # Commandes slash du bot
│   ├── help.js
│   ├── ping.js
│   └── server.js
├── events/            # Événements du bot
│   ├── ready.js
│   ├── interactionCreate.js
│   └── guildCreate.js
├── models/            # Modèles MongoDB
│   ├── User.js
│   └── Guild.js
├── routes/            # Routes Express
│   └── api.js
├── views/             # Templates EJS
│   ├── index.ejs
│   ├── login.ejs
│   └── dashboard.ejs
├── public/            # Fichiers statiques
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── dashboard.js
├── index.js           # Point d'entrée du bot
├── dashboard.js       # Serveur web dashboard
├── package.json
├── .env.example
└── README.md
```

## 🔧 Configuration Discord

1. **Créer une application Discord**:
   - Allez sur le [Portail Développeur Discord](https://discord.com/developers/applications)
   - Créez une nouvelle application
   - Récupérez le Client ID et Client Secret

2. **Créer le bot**:
   - Dans l'onglet "Bot", cliquez sur "Add Bot"
   - Activez les "Privileged Gateway Intents":
     - SERVER MEMBERS INTENT
     - MESSAGE CONTENT INTENT
   - Récupérez le token du bot

3. **Configurer OAuth2**:
   - Dans l'onglet "OAuth2", ajoutez un redirect URI:
     - `http://localhost:3000/auth/callback`
   - Cochez les scopes: `bot`, `applications.commands`, `identify`, `guilds`

4. **Inviter le bot**:
   - Générez une URL d'invitation avec les permissions nécessaires
   - Invitez le bot sur votre serveur de test

## 🚀 Déploiement

### Heroku
1. Créez une app Heroku
2. Configurez les variables d'environnement
3. Déployez avec Git

### Docker
```bash
docker build -t discord-bot-dashboard .
docker run -p 3000:3000 discord-bot-dashboard
```

## 🤝 Contribuer

1. Fork le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. Commitez vos changements (`git commit -m 'Add amazing feature'`)
4. Pushez vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

## 🆘 Support

Si vous rencontrez des problèmes:

1. Vérifiez que toutes les variables d'environnement sont correctement configurées
2. Assurez-vous que MongoDB est en cours d'exécution
3. Vérifiez que le bot a les permissions nécessaires sur Discord
4. Consultez les logs pour plus d'informations

## 🔄 Mises à jour

Pour mettre à jour le projet:

```bash
git pull origin main
npm install
```

---

Made with ❤️ for the Discord community
