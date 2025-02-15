import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';
import socket from './websocket.js';

// ✅ Configuration des avatars et chemins
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

// ✅ Variables globales
let gameInstance;
let currentRoomId;
let userData;
let dragAndDrop;

// ✅ Récupération et validation des données utilisateur
function initializeGameData() {
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) throw new Error('Session expirée');
        
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) throw new Error('Room ID manquant');

        console.log('📌 Données de session:', { userData, currentRoomId });
        return true;
    } catch (error) {
        console.error("❌ Erreur lors du chargement des données:", error);
        showDisconnectOverlay(error.message);
        return false;
    }
}

// ✅ Obtenir le bon avatar
function getAvatarPath(sex, avatarId) {
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// ✅ Initialisation de l'interface
function initializeUI() {
    try {
        updatePlayerProfile(userData, false);
        initializeOpponentContainer();
        initializeGameAreas();
    } catch (error) {
        console.error("❌ Erreur UI:", error);
    }
}

// ✅ Initialisation des zones de jeu
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

// ✅ Met à jour le profil joueur/adversaire
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';

    // ✅ Avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        let avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';
        avatarImg.src = getAvatarPath(player.sex, player.avatarId);
        avatarImg.alt = `Avatar de ${player.name}`;
        avatarImg.onerror = () => {
            avatarImg.src = AVATAR_CONFIG.default;
        };
        if (!avatarContainer.contains(avatarImg)) avatarContainer.appendChild(avatarImg);
    }

    // ✅ Nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) nameElement.textContent = player.name || 'Joueur inconnu';

    // ✅ Indicateur de tour
    updateTurnIndicator(prefix, player.id === gameInstance?.currentTurn);
}

// ✅ Mise à jour de l’indicateur de tour
function updateTurnIndicator(prefix, isCurrentTurn) {
    const profile = document.querySelector(`.${prefix}-profile`);
    if (profile) profile.classList.toggle('active-turn', isCurrentTurn);
}

// ✅ Initialise le conteneur adversaire en "En attente..."
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

// ✅ Écouteurs WebSocket
function setupSocketListeners() {
    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) updatePlayerProfile(opponent, true);
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
}

// ✅ Gestion du début de partie
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

    if (data.hands?.playerHand) displayHand(data.hands.playerHand, true);
}

// ✅ Gestion d'une carte jouée
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

// ✅ Gestion du changement de tour
function handleTurnUpdate(playerId) {
    gameInstance.currentTurn = playerId;
    const isPlayerTurn = playerId === userData.clientId;
    updateTurnIndicator('player', isPlayerTurn);
    updateTurnIndicator('opponent', !isPlayerTurn);
}

// ✅ Affichage de la main du joueur
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) return;

    handContainer.innerHTML = '';
    console.log(`📌 Affichage de la main ${isPlayer ? 'du joueur' : 'de l\'adversaire'}:`, cards);

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.cardName = card.name;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';

        if (isPlayer && dragAndDrop) {
            cardElement.draggable = true;
            cardElement.addEventListener('dragstart', (e) => dragAndDrop.handleDragStart(e));
        }

        handContainer.appendChild(cardElement);
    });
}

// ✅ Affichage d'une alerte de déconnexion
function showDisconnectOverlay(message) {
    alert(message);
    setTimeout(() => {
        window.location.href = '/choose-mode';
    }, 2000);
}

// ✅ Initialisation globale
document.addEventListener('DOMContentLoaded', async () => {
    if (!initializeGameData()) return;
    await socket.waitForConnection();
    console.log('✅ Connecté au serveur');
    initializeUI();
    gameInstance = new Game(socket);
    dragAndDrop = new DragAndDropManager(gameInstance, socket);
    dragAndDrop.initialize();
    setupSocketListeners();
    socket.emit('joinRoom', { ...userData, roomCode: currentRoomId });
});