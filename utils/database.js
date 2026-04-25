const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.dataPath = path.join(__dirname, '../data');
        this.files = {
            users: 'users.json',
            guilds: 'guilds.json',
            shop: 'shop.json',
            confessions: 'confessions.json',
            moderation: 'moderation.json',
            autothreads: 'autothreads.json'
        };
    }

    async init() {
        // Créer le dossier data s'il n'existe pas
        try {
            await fs.access(this.dataPath);
        } catch {
            await fs.mkdir(this.dataPath, { recursive: true });
        }

        // Initialiser tous les fichiers de données
        for (const [key, filename] of Object.entries(this.files)) {
            await this.initFile(filename);
        }
    }

    async initFile(filename) {
        const filePath = path.join(this.dataPath, filename);
        try {
            await fs.access(filePath);
        } catch {
            await fs.writeFile(filePath, JSON.stringify({}));
        }
    }

    async readData(filename) {
        const filePath = path.join(this.dataPath, filename);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Erreur lecture ${filename}:`, error);
            return {};
        }
    }

    async writeData(filename, data) {
        const filePath = path.join(this.dataPath, filename);
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Erreur écriture ${filename}:`, error);
            return false;
        }
    }

    // Utilisateurs
    async getUser(userId) {
        const users = await this.readData(this.files.users);
        return users[userId] || null;
    }

    async setUser(userId, userData) {
        const users = await this.readData(this.files.users);
        users[userId] = { ...users[userId], ...userData, updatedAt: Date.now() };
        return await this.writeData(this.files.users, users);
    }

    async getAllUsers() {
        return await this.readData(this.files.users);
    }

    // Serveurs
    async getGuild(guildId) {
        const guilds = await this.readData(this.files.guilds);
        return guilds[guildId] || {
            id: guildId,
            welcome: { enabled: false, channelId: null, message: "Bienvenue {user} !" },
            goodbye: { enabled: false, channelId: null, message: "Au revoir {user} !" },
            shop: { enabled: false, items: [] },
            moderation: { enabled: false, logChannelId: null },
            confessions: { enabled: false, channelId: null },
            autothreads: { enabled: false, channels: [] },
            createdAt: Date.now()
        };
    }

    async setGuild(guildId, guildData) {
        const guilds = await this.readData(this.files.guilds);
        guilds[guildId] = { ...guilds[guildId], ...guildData, updatedAt: Date.now() };
        return await this.writeData(this.files.guilds, guilds);
    }

    // Boutique
    async getShopItems(guildId) {
        const shop = await this.readData(this.files.shop);
        return shop[guildId] || [];
    }

    async addShopItem(guildId, item) {
        const shop = await this.readData(this.files.shop);
        if (!shop[guildId]) shop[guildId] = [];
        shop[guildId].push({ ...item, id: Date.now().toString(), createdAt: Date.now() });
        return await this.writeData(this.files.shop, shop);
    }

    async removeShopItem(guildId, itemId) {
        const shop = await this.readData(this.files.shop);
        if (shop[guildId]) {
            shop[guildId] = shop[guildId].filter(item => item.id !== itemId);
        }
        return await this.writeData(this.files.shop, shop);
    }

    // Confessions
    async addConfession(guildId, confession) {
        const confessions = await this.readData(this.files.confessions);
        if (!confessions[guildId]) confessions[guildId] = [];
        confessions[guildId].push({ ...confession, id: Date.now().toString(), createdAt: Date.now() });
        return await this.writeData(this.files.confessions, confessions);
    }

    async getConfessions(guildId) {
        const confessions = await this.readData(this.files.confessions);
        return confessions[guildId] || [];
    }

    // Modération
    async addModLog(guildId, logEntry) {
        const moderation = await this.readData(this.files.moderation);
        if (!moderation[guildId]) moderation[guildId] = [];
        moderation[guildId].push({ ...logEntry, id: Date.now().toString(), timestamp: Date.now() });
        return await this.writeData(this.files.moderation, moderation);
    }

    async getModLogs(guildId) {
        const moderation = await this.readData(this.files.moderation);
        return moderation[guildId] || [];
    }

    // Auto-threads
    async getAutoThreads(guildId) {
        const autothreads = await this.readData(this.files.autothreads);
        return autothreads[guildId] || [];
    }

    async addAutoThread(guildId, threadConfig) {
        const autothreads = await this.readData(this.files.autothreads);
        if (!autothreads[guildId]) autothreads[guildId] = [];
        autothreads[guildId].push({ ...threadConfig, id: Date.now().toString() });
        return await this.writeData(this.files.autothreads, autothreads);
    }

    async removeAutoThread(guildId, threadId) {
        const autothreads = await this.readData(this.files.autothreads);
        if (autothreads[guildId]) {
            autothreads[guildId] = autothreads[guildId].filter(thread => thread.id !== threadId);
        }
        return await this.writeData(this.files.autothreads, autothreads);
    }
}

module.exports = new Database();
