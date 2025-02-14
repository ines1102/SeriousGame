import socket from './websocket.js';

// Variables globales
let userData = null;
let isSearching = false;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Chargement des données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            showError('Session expirée, veuillez vous reconnecter');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        // Initialisation de l'interface
        initializeUI();
        
        // Connexion au serveur
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');
        
        // Configuration des événements
        setupEventListeners();
        setupSocketListeners();
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        showError('Erreur de connexion au serveur');
    }
});

// Initialisation de l'interface utilisateur
function initializeUI() {
    // Mise à jour des informations utilisateur
    const avatarElement = document.getElementById('user-avatar');
    const nameElement = document.getElementById('user-name');
    
    if (avatarElement && nameElement) {
        avatarElement.src = userData.avatarSrc || '/Avatars/default.jpeg';
        avatarElement.onerror = () => {
            avatarElement.src = '/Avatars/default.jpeg';
        };
        nameElement.textContent = userData.name;
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Mode joueur aléatoire
    const randomModeBtn = document.getElementById('random-mode');
    if (randomModeBtn) {
        randomModeBtn.addEventListener('click', handleRandomMode);
    }

    // Mode entre amis
    const friendModeBtn = document.getElementById('friend-mode');
    if (friendModeBtn) {
        friendModeBtn.addEventListener('click', handleFriendMode);
    }

    // Bouton d'annulation de recherche
    const cancelSearchBtn = document.getElementById('cancel-search');
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', handleCancelSearch);
    }
}

// Configuration des écouteurs socket
function setupSocketListeners() {
    socket.on('waitingForOpponent', () => {
        isSearching = true;
        showLoadingOverlay();
    });

    socket.on('gameStart', (data) => {
        isSearching = false;
        hideLoadingOverlay();
        window.location.href = `/gameboard?roomId=${data.roomCode}`;
    });

    socket.on('error', (error) => {
        isSearching = false;
        hideLoadingOverlay();
        showError(error.message || 'Une erreur est survenue');
    });

    socket.on('disconnect', () => {
        if (isSearching) {
            hideLoadingOverlay();
            showError('Déconnecté du serveur');
        }
    });
}

// Gestionnaires d'événements
async function handleRandomMode() {
    try {
        if (!socket.isConnected()) {
            showError('Non connecté au serveur');
            return;
        }

        isSearching = true;
        showLoadingOverlay();
        await socket.emit('findRandomGame', userData);
    } catch (error) {
        console.error('❌ Erreur lors de la recherche de partie:', error);
        hideLoadingOverlay();
        showError('Erreur lors de la recherche de partie');
    }
}

function handleFriendMode() {
    window.location.href = '/room-choice';
}

function handleCancelSearch() {
    if (isSearching) {
        socket.emit('cancelSearch');
        isSearching = false;
        hideLoadingOverlay();
    }
}

// Fonctions utilitaires UI
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showError(message) {
    const toast = document.getElementById('error-toast');
    const messageElement = document.getElementById('error-message');
    
    if (toast && messageElement) {
        messageElement.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

export { showLoadingOverlay, hideLoadingOverlay, showError };