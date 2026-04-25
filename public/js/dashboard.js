// Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation
    initializeDashboard();
    
    // Rafraîchissement automatique des stats
    setInterval(updateBotStats, 30000); // 30 secondes
});

function initializeDashboard() {
    console.log('Dashboard initialisé');
    
    // Animation des cartes
    animateCards();
    
    // Gestion des boutons
    setupButtonHandlers();
    
    // Chargement initial des stats
    updateBotStats();
}

function animateCards() {
    const cards = document.querySelectorAll('.card-hover');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in');
        }, index * 100);
    });
}

function setupButtonHandlers() {
    // Boutons de gestion de serveur
    document.querySelectorAll('[data-guild-id]').forEach(button => {
        button.addEventListener('click', function() {
            const guildId = this.dataset.guildId;
            const action = this.dataset.action;
            
            handleGuildAction(guildId, action);
        });
    });
    
    // Boutons d'invitation
    document.querySelectorAll('.invite-btn').forEach(button => {
        button.addEventListener('click', function() {
            const guildId = this.dataset.guildId;
            inviteBot(guildId);
        });
    });
}

async function updateBotStats() {
    try {
        const response = await fetch('/api/bot/stats');
        const stats = await response.json();
        
        // Mise à jour des éléments du DOM
        updateStatElement('bot-uptime', formatUptime(stats.uptime));
        updateStatElement('bot-ping', `${stats.ping}ms`);
        updateStatElement('bot-guilds', stats.guilds);
        
        // Mise à jour du status
        updateBotStatus(true);
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des stats:', error);
        updateBotStatus(false);
    }
}

function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        element.classList.add('fade-in');
    }
}

function updateBotStatus(isOnline) {
    const statusElements = document.querySelectorAll('.bot-status');
    statusElements.forEach(element => {
        if (isOnline) {
            element.innerHTML = '<span class="status-online"></span> En ligne';
            element.className = 'bot-status text-green-500';
        } else {
            element.innerHTML = '<span class="status-offline"></span> Hors ligne';
            element.className = 'bot-status text-red-500';
        }
    });
}

function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m ${seconds % 60}s`;
    }
}

async function handleGuildAction(guildId, action) {
    try {
        showLoading();
        
        switch (action) {
            case 'manage':
                window.location.href = `/guild/${guildId}`;
                break;
            case 'settings':
                window.location.href = `/guild/${guildId}/settings`;
                break;
            case 'stats':
                showGuildStats(guildId);
                break;
            default:
                console.error('Action non reconnue:', action);
        }
    } catch (error) {
        console.error('Erreur lors de l\'action:', error);
        showError('Une erreur est survenue');
    } finally {
        hideLoading();
    }
}

async function showGuildStats(guildId) {
    try {
        const response = await fetch(`/api/guild/${guildId}`);
        const guild = await response.json();
        
        // Afficher les stats dans une modal
        showGuildModal(guild);
        
    } catch (error) {
        console.error('Erreur lors de la récupération des stats du serveur:', error);
        showError('Impossible de charger les statistiques du serveur');
    }
}

function showGuildModal(guild) {
    // Création et affichage d'une modal avec les stats du serveur
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold">Statistiques de ${guild.name}</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-700 p-4 rounded">
                    <div class="text-2xl font-bold">${guild.memberCount}</div>
                    <div class="text-sm text-gray-400">Membres</div>
                </div>
                <div class="bg-gray-700 p-4 rounded">
                    <div class="text-2xl font-bold">${guild.channels.total}</div>
                    <div class="text-sm text-gray-400">Salons</div>
                </div>
                <div class="bg-gray-700 p-4 rounded">
                    <div class="text-2xl font-bold">${guild.roles}</div>
                    <div class="text-sm text-gray-400">Rôles</div>
                </div>
                <div class="bg-gray-700 p-4 rounded">
                    <div class="text-2xl font-bold">${guild.boosts}</div>
                    <div class="text-sm text-gray-400">Boosts</div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function inviteBot(guildId) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`;
    window.open(inviteUrl, '_blank');
}

function showLoading() {
    // Afficher un indicateur de chargement
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg z-50';
    loader.innerHTML = '<i class="fas fa-spinner loading mr-2"></i>Chargement...';
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.remove();
    }
}

function showError(message) {
    // Afficher une notification d'erreur
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg z-50 fade-in';
    notification.innerHTML = `<i class="fas fa-exclamation-triangle mr-2"></i>${message}`;
    
    document.body.appendChild(notification);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showSuccess(message) {
    // Afficher une notification de succès
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50 fade-in';
    notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    
    document.body.appendChild(notification);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Export des fonctions pour utilisation globale
window.dashboard = {
    updateBotStats,
    handleGuildAction,
    showGuildStats,
    inviteBot,
    showError,
    showSuccess
};
