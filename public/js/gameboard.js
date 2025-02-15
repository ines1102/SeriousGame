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

// 📌 Variables globales
let gameInstance;
let currentRoomId;
let userData;
let dragAndDrop;

// 📌 Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    try {
        // ✅ Récupération des données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }

        // ✅ Récupération et validation de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('Room ID manquant');
        }

        // ✅ Attente de la connexion WebSocket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // ✅ Initialisation de l'interface
        initializeUI();

        // ✅ Initialisation du jeu
        gameInstance = new Game(socket);
        window.gameInstance = gameInstance; // Pour le debugging

        // ✅ Initialisation du drag & drop
        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize(); // Supprime `await` car non asynchrone

        // ✅ Configuration des écouteurs WebSocket
        setupSocketListeners();

        // ✅ Rejoindre la room
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

// 📌 Création des zones de jeu
function initializeGameAreas() {
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        gameBoard.innerHTML = '';
        ['player-hand', 'game-zones', 'opponent-hand'].forEach(zone => {
            const div = document.createElement('div');
            div.id = zone;
            div.className = zone;
            gameBoard.appendChild(div);
        });
    }
}

// 📌 Mise à jour du profil d'un joueur
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';
    
    // ✅ Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';
        avatarImg.src = getAvatarPath(player.sex, player.avatarId);
        avatarImg.alt = `Avatar de ${player.name}`;

        // ✅ Gestion des erreurs de chargement d'image
        avatarImg.onerror = () => {
            avatarImg.src = AVATAR_CONFIG.default;
        };

        if (!avatarContainer.contains(avatarImg)) {
            avatarContainer.appendChild(avatarImg);
        }
    }

    // ✅ Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name || 'Joueur inconnu';
    }

    // ✅ Indication du tour
    updateTurnIndicator(prefix, player.id === gameInstance?.currentTurn);
}

// 📌 Mise à jour de l'indicateur de tour
function updateTurnIndicator(prefix, isCurrentTurn) {
    const profile = document.querySelector(`.${prefix}-profile`);
    if (profile) {
        profile.classList.toggle('active-turn', isCurrentTurn);
    }
}

// 📌 Initialisation du conteneur adversaire
function initializeOpponentContainer() {
    const opponentContainer = document.querySelector('.opponent-profile');
    if (opponentContainer) {
        opponentContainer.innerHTML = `
            <div class="opponent-avatar">
                <img src="${AVATAR_CONFIG.default}" alt="En attente d'un adversaire" class="avatar-img placeholder">
            </div>
            <div class="opponent-name">En attente...</div>
            <div class="status-indicator"></div>
        `;
    }
}

// 📌 Configuration des écouteurs WebSocket
function setupSocketListeners() {
    socket.on('updatePlayers', (players) => {
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) {
            updatePlayerProfile(opponent, true);
        }
    });

    socket.on('gameStart', (data) => {
        handleGameStart(data);
    });

    socket.on('cardPlayed', (data) => {
        handleCardPlayed(data);
    });

    socket.on('turnUpdate', (playerId) => {
        handleTurnUpdate(playerId);
    });

    socket.on('opponentLeft', () => {
        showDisconnectOverlay("Votre adversaire a quitté la partie.");
    });

    socket.on('disconnect', () => {
        showDisconnectOverlay("Déconnecté du serveur...");
    });

    socket.on('error', (error) => {
        showError(`Erreur: ${error.message}`);
    });
}

// 📌 Gestion du début de partie
function handleGameStart(data) {
    const currentPlayer = data.players.find(player => player.clientId === userData.clientId);
    const opponent = data.players.find(player => player.clientId !== userData.clientId);

    if (!currentPlayer || !opponent) return;

    updatePlayerProfile(currentPlayer, false);
    updatePlayerProfile(opponent, true);

    if (data.hands?.playerHand) {
        displayHand(data.hands.playerHand, true);
    }

    if (dragAndDrop) {
        dragAndDrop.enableDragDrop();
    }
}

// 📌 Gestion d'une carte jouée
function handleCardPlayed(data) {
    const dropZone = document.querySelector(`[data-slot="${data.slot}"]`);
    if (dropZone && dragAndDrop) {
        dragAndDrop.processDrop({
            cardId: data.cardId,
            cardSrc: data.cardSrc || `url(${data.name})`,
            name: data.cardName || data.name
        }, dropZone);
    }
}

// 📌 Gestion du changement de tour
function handleTurnUpdate(playerId) {
    gameInstance.currentTurn = playerId;
    updateTurnIndicator('player', playerId === userData.clientId);
    updateTurnIndicator('opponent', playerId !== userData.clientId);
    dragAndDrop.setDraggable(playerId === userData.clientId);
}

// 📌 Affichage de la main
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) return;

    handContainer.innerHTML = '';
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = card.id;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';
        if (isPlayer) {
            cardElement.draggable = true;
            cardElement.addEventListener('dragstart', dragAndDrop.handleDragStart);
        }
        handContainer.appendChild(cardElement);
    });
}

// Affichage de l'overlay de déconnexion
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

// Affichage des erreurs
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

export { updatePlayerProfile, showDisconnectOverlay, showError, handleCardPlayed, handleTurnUpdate };
