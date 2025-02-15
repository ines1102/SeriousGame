import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';
import socket from './websocket.js';

// 📌 Configuration des avatars et chemins
const AVATAR_CONFIG = {
    male: {
        '1': '/Avatars/male1.jpeg',
        '2': '/Avatars/male2.jpeg',
        '3': '/Avatars/male3.jpeg'
    },
    female: {
        '1': '/Avatars/female1.jpeg',
        '2': '/Avatars/female2.jpeg',
        '3': '/Avatars/female3.jpeg'
    },
    default: '/Avatars/default.jpeg'
};

// 🔹 Variables globales
let gameInstance;
let currentRoomId;
let userData;
let dragAndDrop;

// 📌 Fonction pour récupérer le bon avatar
function getAvatarPath(sex, avatarId) {
    try {
        const avatarKey = String(avatarId); // 🔄 Convertir en chaîne pour éviter les erreurs
        if (!sex || !avatarKey) {
            console.warn('⚠️ Données d\'avatar incomplètes, utilisation de l\'avatar par défaut');
            return AVATAR_CONFIG.default;
        }
        return AVATAR_CONFIG[sex]?.[avatarKey] || AVATAR_CONFIG.default;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'avatar:', error);
        return AVATAR_CONFIG.default;
    }
}

// 🎮 Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    try {
        // 🔹 Récupération des données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }

        // 🔹 Récupération et validation de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('Room ID manquant');
        }

        // 🔄 Attente de la connexion WebSocket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // 🔄 Initialisation de l'interface
        initializeUI();

        // 🎮 Initialisation du jeu
        gameInstance = new Game(socket);
        window.gameInstance = gameInstance; // Pour debugging

        // 🎯 Initialisation du Drag & Drop
        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize();

        // 🔄 Configuration des écouteurs Socket.io
        setupSocketListeners();

        // 🎲 Rejoindre la room
        socket.emit('joinRoom', { 
            ...userData, 
            roomCode: currentRoomId 
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay(error.message);
        setTimeout(() => {
            window.location.href = '/choose-mode';
        }, 2000);
    }
});

// 📌 Initialisation de l'interface utilisateur
function initializeUI() {
    try {
        updatePlayerProfile(userData, false);
        initializeOpponentContainer();
        initializeGameAreas();
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation de l'UI:", error);
    }
}

// 🎭 Mise à jour du profil d'un joueur
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';

    // 📌 Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';

        // 🎯 Attribution de l'avatar correct
        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        console.log(`📸 Avatar choisi pour ${player.name}: ${avatarPath}`);

        avatarImg.src = avatarPath;
        avatarImg.alt = `Avatar de ${player.name}`;

        // 🔄 Gestion des erreurs de chargement d'image
        avatarImg.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarImg.src = AVATAR_CONFIG.default;
        };

        if (!avatarContainer.contains(avatarImg)) {
            avatarContainer.appendChild(avatarImg);
        }
    }

    // 📌 Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name || 'Joueur inconnu';
    }
}

// 📌 Configuration des écouteurs WebSocket
function setupSocketListeners() {
    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);

        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) {
            updatePlayerProfile(opponent, true);
        }
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de la partie:', data);
        handleGameStart(data);
    });

    socket.on('opponentLeft', () => {
        console.log('👋 Adversaire déconnecté');
        showDisconnectOverlay("Votre adversaire a quitté la partie.");
    });

    socket.on('disconnect', () => {
        console.log('🔌 Déconnexion du serveur');
        showDisconnectOverlay("Déconnecté du serveur...");
    });

    socket.on('error', (error) => {
        console.error('❌ Erreur socket:', error);
        showError(`Erreur: ${error.message}`);
    });
}

// 🎮 Gestion du début de partie
function handleGameStart(data) {
    if (!data.players || data.players.length < 2) {
        console.error("❌ Pas assez de joueurs pour démarrer");
        return;
    }

    const currentPlayer = data.players.find(player => player.clientId === userData.clientId);
    const opponent = data.players.find(player => player.clientId !== userData.clientId);

    if (!currentPlayer || !opponent) {
        console.error("❌ Erreur d'attribution des joueurs");
        return;
    }

    updatePlayerProfile(currentPlayer, false);
    updatePlayerProfile(opponent, true);
}

// 🎯 Affichage de l'overlay de déconnexion
function showDisconnectOverlay(message) {
    const overlay = document.getElementById('disconnect-overlay');
    if (overlay) {
        const messageElement = overlay.querySelector('p');
        if (messageElement) messageElement.textContent = message;
        overlay.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = '/choose-mode';
        }, 3000);
    }
}

// 📌 Affichage des erreurs
function showError(message) {
    const errorToast = document.getElementById('error-toast');
    if (errorToast) {
        errorToast.textContent = message;
        errorToast.classList.add('show');
        setTimeout(() => {
            errorToast.classList.remove('show');
        }, 3000);
    }
}

export { 
    updatePlayerProfile, 
    showDisconnectOverlay, 
    showError
};