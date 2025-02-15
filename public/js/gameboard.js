import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';
import socket from './websocket.js';

// Configuration des avatars et chemins
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

// Variables globales
let gameInstance;
let currentRoomId;
let userData;
let dragAndDrop;

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');

    try {
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }

        console.log('📌 Données utilisateur récupérées:', userData);

        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('Room ID manquant');
        }

        console.log('📌 Avatar attendu:', getAvatarPath(userData.sex, userData.avatarId));

        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        initializeUI();
        gameInstance = new Game(socket);
        window.gameInstance = gameInstance;

        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize();

        setupSocketListeners();

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

/**
 * ✅ Mise à jour du profil du joueur
 */
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';

    // ✅ Sélection des éléments du DOM
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    const nameElement = document.querySelector(`.${prefix}-name`);

    if (!avatarContainer || !nameElement) {
        console.error(`❌ Impossible de mettre à jour le profil de ${player.name}`);
        return;
    }

    // ✅ Mise à jour du nom du joueur
    nameElement.textContent = player.name || 'Joueur inconnu';

    // ✅ Vérifier que l'avatarId est bien défini
    if (!player.avatarId) {
        console.error(`❌ avatarId manquant pour ${player.name}`);
        return;
    }

    // ✅ Vérification des données reçues
    console.log(`📌 Mise à jour du profil ${prefix}:`, player);

    // ✅ Mise à jour de l'avatar avec gestion d'erreur
    const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
    avatarImg.className = 'avatar-img';

    // ✅ Vérification et correction de l'avatarId sous forme de chaîne
    const correctedAvatarId = String(player.avatarId);
    const avatarPath = getAvatarPath(player.sex, correctedAvatarId);

    avatarImg.src = avatarPath;
    avatarImg.alt = `Avatar de ${player.name}`;

    avatarImg.onerror = () => {
        console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}, fallback sur défaut`);
        avatarImg.src = '/Avatars/default.jpeg';
    };

    if (!avatarContainer.contains(avatarImg)) {
        avatarContainer.appendChild(avatarImg);
    }

    console.log(`📸 Avatar mis à jour pour ${player.name}: ${avatarPath}`);
}

/**
 * ✅ Obtenir le bon chemin de l'avatar
 */
function getAvatarPath(sex, avatarId) {
    const correctedAvatarId = String(avatarId);

    if (!AVATAR_CONFIG[sex]) {
        console.warn(`⚠️ Sexe non reconnu: ${sex}, utilisation de l'avatar par défaut.`);
        return AVATAR_CONFIG.default;
    }

    if (!AVATAR_CONFIG[sex][correctedAvatarId]) {
        console.warn(`⚠️ avatarId ${correctedAvatarId} non trouvé pour ${sex}, fallback sur avatar par défaut.`);
        return AVATAR_CONFIG.default;
    }

    return AVATAR_CONFIG[sex][correctedAvatarId];
}

// Initialisation des zones de jeu
function initializeGameAreas() {
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        gameBoard.innerHTML = '';

        const zones = ['player-hand', 'game-zones', 'opponent-hand'];
        zones.forEach(zone => {
            const div = document.createElement('div');
            div.id = zone;
            div.className = zone;
            gameBoard.appendChild(div);
        });
    }
}

// Configuration des écouteurs Socket
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

    socket.on('cardPlayed', (data) => {
        console.log('🃏 Carte jouée:', data);
        handleCardPlayed(data);
    });

    socket.on('turnUpdate', (playerId) => {
        console.log('🎲 Changement de tour:', playerId);
        handleTurnUpdate(playerId);
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

// Gestion du début de partie
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

// Gestion du changement de tour
function handleTurnUpdate(playerId) {
    if (!gameInstance) return;

    gameInstance.currentTurn = playerId;
    const isPlayerTurn = playerId === userData.clientId;

    console.log(`🎲 Tour mis à jour: ${isPlayerTurn ? 'Ton tour' : 'Tour de l’adversaire'}`);
}

export { updatePlayerProfile, showError, handleCardPlayed, handleTurnUpdate };