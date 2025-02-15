import socketManager from './websocket.js';

class GameModeSelector {
    constructor() {
        this.init();
        this.socket = socketManager;
        this.isSearching = false;
    }

    async init() {
        try {
            this.loadUserData();
            this.initializeElements();
            this.setupEventListeners();
            this.setupSocketListeners();
            this.displayUserInfo();
            console.log('✅ Mode selector initialisé');
        } catch (error) {
            console.error('❌ Erreur d\'initialisation:', error);
            this.showError('Erreur lors de l\'initialisation');
        }
    }

    loadUserData() {
        this.userData = JSON.parse(localStorage.getItem('userData'));
        if (!this.userData) {
            console.error('❌ Données utilisateur manquantes');
            window.location.href = '/';
            return;
        }
        console.log('👤 Données utilisateur chargées:', this.userData.name);
    }

    initializeElements() {
        this.elements = {
            userAvatar: document.getElementById('user-avatar'),
            userName: document.getElementById('user-name'),
            randomModeBtn: document.getElementById('random-mode'),
            friendModeBtn: document.getElementById('friend-mode'),
            loadingOverlay: document.getElementById('loading-overlay'),
            cancelSearchBtn: document.getElementById('cancel-search'),
            errorToast: document.getElementById('error-toast'),
            errorMessage: document.getElementById('error-message')
        };

        // Vérification des éléments
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                throw new Error(`Élément ${key} non trouvé`);
            }
        }
    }

    setupEventListeners() {
        // Mode aléatoire
        this.elements.randomModeBtn.addEventListener('click', () => {
            if (!this.isSearching) {
                this.startRandomSearch();
            }
        });

        // Mode entre amis
        this.elements.friendModeBtn.addEventListener('click', () => {
            window.location.href = '/room-choice';
        });

        // Annulation de la recherche
        this.elements.cancelSearchBtn.addEventListener('click', () => {
            this.cancelSearch();
        });

        // Gestion des touches clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSearching) {
                this.cancelSearch();
            }
        });
    }

    setupSocketListeners() {
        // Connexion établie
        this.socket.on('connect', () => {
            console.log('✅ Connecté au serveur');
            this.enableButtons();
        });

        // Déconnexion
        this.socket.on('disconnect', () => {
            console.log('❌ Déconnecté du serveur');
            this.disableButtons();
            this.showError('Connexion perdue');
        });

        // Partie trouvée
        this.socket.on('gameStart', (data) => {
            console.log('🎮 Partie trouvée:', data);
            window.location.href = `/gameboard?room=${data.roomCode}`;
        });

        // En attente d'adversaire
        this.socket.on('waitingForOpponent', () => {
            console.log('⏳ En attente d\'un adversaire...');
        });

        // Erreur de room
        this.socket.on('roomError', (error) => {
            console.error('❌ Erreur:', error);
            this.hideLoadingOverlay();
            this.showError(error);
        });
    }

    displayUserInfo() {
        this.elements.userAvatar.src = this.userData.avatarSrc || '/Avatars/default.jpeg';
        this.elements.userAvatar.alt = `Avatar de ${this.userData.name}`;
        this.elements.userName.textContent = this.userData.name;
    }

    startRandomSearch() {
        this.isSearching = true;
        this.showLoadingOverlay();
        this.elements.randomModeBtn.disabled = true;
        this.elements.friendModeBtn.disabled = true;

        console.log('🎲 Recherche d\'une partie aléatoire...');
        this.socket.emit('findRandomGame', this.userData);
    }

    cancelSearch() {
        if (!this.isSearching) return;

        this.socket.emit('cancelSearch');
        this.hideLoadingOverlay();
        this.isSearching = false;
        this.elements.randomModeBtn.disabled = false;
        this.elements.friendModeBtn.disabled = false;
        
        console.log('🚫 Recherche annulée');
    }

    showLoadingOverlay() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoadingOverlay() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorToast.classList.add('show');
        
        setTimeout(() => {
            this.elements.errorToast.classList.remove('show');
        }, 3000);
    }

    enableButtons() {
        this.elements.randomModeBtn.disabled = false;
        this.elements.friendModeBtn.disabled = false;
    }

    disableButtons() {
        this.elements.randomModeBtn.disabled = true;
        this.elements.friendModeBtn.disabled = true;
    }

    handleConnectionError() {
        this.hideLoadingOverlay();
        this.isSearching = false;
        this.enableButtons();
        this.showError('Erreur de connexion au serveur');
    }
}

// Initialisation une fois le DOM chargé
document.addEventListener('DOMContentLoaded', () => {
    try {
        const gameModeSelector = new GameModeSelector();
    } catch (error) {
        console.error('❌ Erreur fatale:', error);
        // Afficher une erreur générique à l'utilisateur
        const errorToast = document.getElementById('error-toast');
        if (errorToast) {
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Une erreur inattendue est survenue';
            errorToast.classList.add('show');
        }
    }
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('❌ Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesse rejetée non gérée:', event.reason);
});
​​​​​​​​​​​​​​​​