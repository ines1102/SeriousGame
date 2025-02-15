import socketManager from './websocket.js';

class RoomManager {
    constructor() {
        this.elements = this.initializeElements();
        this.userData = null;
        this.currentRoom = null;
        this.isWaiting = false;
        this.init();
    }

    initializeElements() {
        return {
            userAvatar: document.getElementById('user-avatar'),
            userName: document.getElementById('user-name'),
            createRoomBtn: document.getElementById('create-room'),
            joinRoomBtn: document.getElementById('join-room'),
            roomCodeInput: document.getElementById('room-code'),
            loadingOverlay: document.getElementById('loading-overlay'),
            roomCodeDisplay: document.getElementById('room-code-display'),
            displayCode: document.getElementById('display-code'),
            copyCodeBtn: document.getElementById('copy-code'),
            cancelWaitBtn: document.getElementById('cancel-wait'),
            disconnectOverlay: document.getElementById('disconnect-overlay')
        };
    }

    async init() {
        try {
            await this.checkUserData();
            this.setupUIElements();
            this.setupEventListeners();
            this.setupSocketListeners();
            console.log('✅ Room Manager initialisé');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors de l\'initialisation. Veuillez rafraîchir la page.');
        }
    }

    async checkUserData() {
        this.userData = JSON.parse(localStorage.getItem('userData'));
        
        if (!this.userData || !this.userData.name) {
            console.warn('⚠️ Données utilisateur manquantes');
            window.location.href = '/choose-mode';
            return;
        }

        console.log('👤 Données utilisateur chargées:', this.userData.name);
        return this.userData;
    }

    setupUIElements() {
        if (!this.userData) return;

        // Configuration de l'avatar
        this.elements.userAvatar.src = this.userData.avatarSrc || '/Avatars/default.jpeg';
        this.elements.userAvatar.alt = `Avatar de ${this.userData.name}`;
        
        // Configuration du nom d'utilisateur
        this.elements.userName.textContent = this.userData.name;

        // Configuration initiale du bouton de rejoindre
        this.elements.joinRoomBtn.disabled = true;
    }

    setupEventListeners() {
        // Création de room
        this.elements.createRoomBtn.addEventListener('click', () => {
            this.handleCreateRoom();
        });

        // Rejoindre une room
        this.elements.joinRoomBtn.addEventListener('click', () => {
            this.handleJoinRoom();
        });

        // Validation en temps réel du code room
        this.elements.roomCodeInput.addEventListener('input', (e) => {
            this.handleRoomCodeInput(e);
        });

        // Copie du code
        this.elements.copyCodeBtn.addEventListener('click', () => {
            this.handleCopyCode();
        });

        // Annulation de l'attente
        this.elements.cancelWaitBtn.addEventListener('click', () => {
            this.handleCancelWait();
        });

        // Gestion des touches du clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && this.elements.roomCodeInput.value.length === 4) {
                this.handleJoinRoom();
            }
            if (e.key === 'Escape' && this.isWaiting) {
                this.handleCancelWait();
            }
        });
    }

    setupSocketListeners() {
        // Événements de room
        socketManager.on('roomCreated', (data) => this.handleRoomCreated(data));
        socketManager.on('roomJoined', (data) => this.handleRoomJoined(data));
        socketManager.on('roomError', (error) => this.handleRoomError(error));
        socketManager.on('waitingForOpponent', () => this.handleWaitingForOpponent());
        
        // Événements de connexion
        socketManager.on('connect', () => this.handleReconnection());
        socketManager.on('disconnect', () => this.handleDisconnection());
    }

    async handleCreateRoom() {
        try {
            this.showLoading();
            this.isWaiting = true;
            await socketManager.emit('createRoom', this.userData);
        } catch (error) {
            console.error('❌ Erreur lors de la création de la room:', error);
            this.showError('Impossible de créer la room');
            this.hideLoading();
        }
    }

    async handleJoinRoom() {
        const roomCode = this.elements.roomCodeInput.value.trim();
        
        if (roomCode.length !== 4) {
            this.showError('Le code doit contenir 4 chiffres');
            return;
        }

        try {
            this.showLoading();
            await socketManager.emit('joinRoom', {
                ...this.userData,
                roomCode
            });
        } catch (error) {
            console.error('❌ Erreur lors de la connexion à la room:', error);
            this.showError('Impossible de rejoindre la room');
            this.hideLoading();
        }
    }

    handleRoomCodeInput(event) {
        // Nettoyer l'input (seulement des chiffres)
        let value = event.target.value.replace(/[^0-9]/g, '');
        
        // Limiter à 4 caractères
        value = value.slice(0, 4);
        
        // Mettre à jour l'input
        this.elements.roomCodeInput.value = value;
        
        // Activer/désactiver le bouton de connexion
        this.elements.joinRoomBtn.disabled = value.length !== 4;
    }

    async handleCopyCode() {
        const code = this.elements.displayCode.textContent;
        
        try {
            await navigator.clipboard.writeText(code);
            this.showCopySuccess();
        } catch (error) {
            console.error('❌ Erreur lors de la copie:', error);
            this.showError('Impossible de copier le code');
        }
    }

    handleCancelWait() {
        this.isWaiting = false;
        this.hideLoading();
        socketManager.emit('cancelWait');
        this.elements.roomCodeDisplay.classList.add('hidden');
    }

    handleRoomCreated(data) {
        console.log('🏠 Room créée:', data);
        this.currentRoom = data.roomCode;
        this.updateRoomCodeDisplay(data.roomCode);
    }

    handleRoomJoined(data) {
        console.log('✅ Room rejointe:', data);
        window.location.href = `/gameboard?room=${data.roomCode}`;
    }

    handleRoomError(error) {
        console.error('❌ Erreur de room:', error);
        this.showError(error);
        this.hideLoading();
        this.isWaiting = false;
    }

    handleWaitingForOpponent() {
        this.isWaiting = true;
        this.elements.roomCodeDisplay.classList.remove('hidden');
    }

    handleReconnection() {
        this.elements.disconnectOverlay.classList.add('hidden');
        if (this.currentRoom) {
            socketManager.emit('joinRoom', {
                ...this.userData,
                roomCode: this.currentRoom
            });
        }
    }

    handleDisconnection() {
        this.elements.disconnectOverlay.classList.remove('hidden');
    }

    updateRoomCodeDisplay(code) {
        this.elements.displayCode.textContent = code;
        this.elements.roomCodeDisplay.classList.remove('hidden');
    }

    showCopySuccess() {
        this.elements.copyCodeBtn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            this.elements.copyCodeBtn.innerHTML = '<i class="fas fa-copy"></i>';
        }, 2000);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }

    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    cleanup() {
        // Nettoyage des événements
        socketManager.off('roomCreated');
        socketManager.off('roomJoined');
        socketManager.off('roomError');
        socketManager.off('waitingForOpponent');
        
        // Réinitialisation des états
        this.isWaiting = false;
        this.currentRoom = null;
    }
}

// Initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    const roomManager = new RoomManager();
    
    // Nettoyage lors de la fermeture de la page
    window.addEventListener('beforeunload', () => {
        roomManager.cleanup();
    });
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('❌ Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promesse rejetée non gérée:', event.reason);
});
