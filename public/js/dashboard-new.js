// Dashboard JavaScript with Sidebar and Mobile Support
class DashboardManager {
    constructor() {
        this.currentSection = 'overview';
        this.sidebarOpen = false;
        this.isMobile = window.innerWidth < 1024;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.handleResize();
        this.loadInitialData();
        this.setupNavigation();
    }

    setupEventListeners() {
        // Sidebar toggles
        const sidebarToggle = document.getElementById('sidebarToggle');
        const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => this.openSidebar());
        }

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const target = item.getAttribute('href').substring(1);
                this.showSection(target);
                this.setActiveNavItem(item);
                
                if (this.isMobile) {
                    this.closeSidebar();
                }
            });
        });

        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Overlay click for mobile
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.addEventListener('click', () => this.closeSidebar());
        document.body.appendChild(overlay);

        // Form submissions
        this.setupFormHandlers();
    }

    setupNavigation() {
        // Set initial active nav item
        const overviewNav = document.querySelector('a[href="#overview"]');
        if (overviewNav) {
            this.setActiveNavItem(overviewNav);
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 1024;

        if (wasMobile !== this.isMobile) {
            this.adjustLayout();
        }
    }

    adjustLayout() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const overlay = document.querySelector('.overlay');

        if (this.isMobile) {
            // Mobile layout
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('active');
            mainContent.classList.remove('expanded');
            overlay.classList.remove('active');
        } else {
            // Desktop layout
            sidebar.classList.remove('active');
            mainContent.classList.remove('expanded');
            overlay.classList.remove('active');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        if (this.isMobile) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.overlay');
        
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.overlay');
        
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            this.currentSection = sectionId;
            
            // Load section-specific data
            this.loadSectionData(sectionId);
        }
    }

    setActiveNavItem(activeItem) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to clicked item
        activeItem.classList.add('active');
    }

    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'servers':
                this.loadServersData();
                break;
            case 'welcome':
                this.loadWelcomeData();
                break;
            case 'shop':
                this.loadShopData();
                break;
            case 'moderation':
                this.loadModerationData();
                break;
            case 'confessions':
                this.loadConfessionsData();
                break;
            case 'autothreads':
                this.loadAutoThreadsData();
                break;
            case 'settings':
                this.loadSettingsData();
                break;
        }
    }

    loadInitialData() {
        this.updateBotStats();
        this.loadServersData();
    }

    async updateBotStats() {
        try {
            const response = await fetch('/api/bot/stats');
            const stats = await response.json();
            
            this.updateStatElements(stats);
        } catch (error) {
            console.error('Error loading bot stats:', error);
        }
    }

    updateStatElements(stats) {
        // Update uptime
        const uptimeElement = document.querySelector('[data-stat="uptime"]');
        if (uptimeElement) {
            uptimeElement.textContent = this.formatUptime(stats.uptime || 0);
        }

        // Update ping
        const pingElement = document.querySelector('[data-stat="ping"]');
        if (pingElement) {
            pingElement.textContent = `${stats.ping || 0}ms`;
        }

        // Update server count
        const serverElement = document.querySelector('[data-stat="servers"]');
        if (serverElement) {
            serverElement.textContent = stats.guilds || 0;
        }
    }

    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}j ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m ${seconds % 60}s`;
        }
    }

    async loadServersData() {
        // Servers data would be loaded from the server
        console.log('Loading servers data...');
    }

    async loadWelcomeData() {
        try {
            // Load welcome/goodbye settings
            const response = await fetch('/api/guild/welcome-settings');
            const data = await response.json();
            
            this.populateWelcomeForm(data);
        } catch (error) {
            console.error('Error loading welcome data:', error);
        }
    }

    populateWelcomeForm(data) {
        // Populate welcome settings
        const welcomeEnabled = document.getElementById('welcomeEnabled');
        const welcomeChannel = document.getElementById('welcomeChannel');
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        if (welcomeEnabled) welcomeEnabled.checked = data.welcome?.enabled || false;
        if (welcomeChannel) welcomeChannel.value = data.welcome?.channelId || '';
        if (welcomeMessage) welcomeMessage.value = data.welcome?.message || 'Bienvenue {user} !';

        // Populate goodbye settings
        const goodbyeEnabled = document.getElementById('goodbyeEnabled');
        const goodbyeChannel = document.getElementById('goodbyeChannel');
        const goodbyeMessage = document.getElementById('goodbyeMessage');
        
        if (goodbyeEnabled) goodbyeEnabled.checked = data.goodbye?.enabled || false;
        if (goodbyeChannel) goodbyeChannel.value = data.goodbye?.channelId || '';
        if (goodbyeMessage) goodbyeMessage.value = data.goodbye?.message || 'Au revoir {user} !';
    }

    async loadShopData() {
        try {
            const response = await fetch('/api/shop/items');
            const items = await response.json();
            
            this.renderShopItems(items);
        } catch (error) {
            console.error('Error loading shop data:', error);
        }
    }

    renderShopItems(items) {
        const container = document.querySelector('#shop .grid');
        if (!container) return;

        container.innerHTML = items.map(item => `
            <div class="bg-gray-700 rounded-lg p-4">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-semibold">${item.name}</h4>
                    <span class="text-green-400 font-bold">${item.price}€</span>
                </div>
                <p class="text-sm text-gray-400 mb-3">${item.description}</p>
                <div class="flex justify-between">
                    <button class="text-blue-400 hover:text-blue-300 text-sm" onclick="dashboard.editShopItem('${item.id}')">
                        <i class="fas fa-edit mr-1"></i>Modifier
                    </button>
                    <button class="text-red-400 hover:text-red-300 text-sm" onclick="dashboard.deleteShopItem('${item.id}')">
                        <i class="fas fa-trash mr-1"></i>Supprimer
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadModerationData() {
        console.log('Loading moderation data...');
    }

    async loadConfessionsData() {
        console.log('Loading confessions data...');
    }

    async loadAutoThreadsData() {
        try {
            const response = await fetch('/api/autothreads');
            const threads = await response.json();
            
            this.renderAutoThreads(threads);
        } catch (error) {
            console.error('Error loading autothreads data:', error);
        }
    }

    renderAutoThreads(threads) {
        const container = document.querySelector('#autothreads .space-y-4');
        if (!container) return;

        container.innerHTML = threads.map(thread => `
            <div class="bg-gray-700 rounded-lg p-4">
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-semibold">${thread.channelName}</h4>
                        <p class="text-sm text-gray-400">${thread.description}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button class="text-blue-400 hover:text-blue-300" onclick="dashboard.editAutoThread('${thread.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-400 hover:text-red-300" onclick="dashboard.deleteAutoThread('${thread.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadSettingsData() {
        console.log('Loading settings data...');
    }

    setupFormHandlers() {
        // Welcome/Goodbye form
        const saveWelcomeBtn = document.querySelector('#welcome .bg-green-600');
        if (saveWelcomeBtn) {
            saveWelcomeBtn.addEventListener('click', () => this.saveWelcomeSettings());
        }

        // Shop form
        const addShopBtn = document.querySelector('#shop .bg-indigo-600');
        if (addShopBtn) {
            addShopBtn.addEventListener('click', () => this.showAddShopModal());
        }

        // Auto-thread form
        const addThreadBtn = document.querySelector('#autothreads .bg-indigo-600');
        if (addThreadBtn) {
            addThreadBtn.addEventListener('click', () => this.showAddThreadModal());
        }
    }

    async saveWelcomeSettings() {
        const data = {
            welcome: {
                enabled: document.getElementById('welcomeEnabled').checked,
                channelId: document.getElementById('welcomeChannel').value,
                message: document.getElementById('welcomeMessage').value
            },
            goodbye: {
                enabled: document.getElementById('goodbyeEnabled').checked,
                channelId: document.getElementById('goodbyeChannel').value,
                message: document.getElementById('goodbyeMessage').value
            }
        };

        try {
            const response = await fetch('/api/guild/welcome-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification('Paramètres sauvegardés avec succès', 'success');
            } else {
                throw new Error('Erreur lors de la sauvegarde');
            }
        } catch (error) {
            this.showNotification('Erreur lors de la sauvegarde des paramètres', 'error');
        }
    }

    showAddShopModal() {
        // Implementation for add shop item modal
        console.log('Show add shop modal');
    }

    showAddThreadModal() {
        // Implementation for add thread modal
        console.log('Show add thread modal');
    }

    editShopItem(itemId) {
        console.log('Edit shop item:', itemId);
    }

    deleteShopItem(itemId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
            console.log('Delete shop item:', itemId);
        }
    }

    editAutoThread(threadId) {
        console.log('Edit auto thread:', threadId);
    }

    deleteAutoThread(threadId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
            console.log('Delete auto thread:', threadId);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg z-50 fade-in ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 
            'bg-blue-600'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-triangle' : 
                    'fa-info-circle'
                } mr-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});

// Auto-refresh stats every 30 seconds
setInterval(() => {
    if (window.dashboard) {
        window.dashboard.updateBotStats();
    }
}, 30000);
