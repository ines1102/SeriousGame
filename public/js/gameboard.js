import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';
import socket from './websocket.js';

// 📌 Configuration des avatars
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

// 📌 Fonction pour obtenir le chemin de l'avatar
function getAvatarPath(sex, avatarId) {
    return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
}

// 📌 Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }

        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('Room ID manquant');
        }

        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        initializeUI();

        gameInstance = new Game(socket);
        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize(); 

        setupSocketListeners();

        socket.emit('joinRoom', { 
            ...userData, 
            roomCode: currentRoomId 
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
    }
});

// 📌 Mise à jour de l'UI
function initializeUI() {
    try {
        updatePlayerProfile(userData, false);
        initializeOpponentContainer();
        initializeGameAreas();
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation de l'UI:", error);
    }
}

// 📌 Mise à jour du profil du joueur/adversaire
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';
    
    console.log(`🔄 Mise à jour du profil ${prefix}:`, player); // ✅ Debug

    // Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';

        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        console.log(`📸 Avatar choisi pour ${player.name}: ${avatarPath}`); // ✅ Debug

        avatarImg.src = avatarPath;
        avatarImg.alt = `Avatar de ${player.name}`;
        
        avatarImg.onerror = () => {
            console.warn(`⚠️ Erreur de chargement de l'avatar pour ${player.name}`);
            avatarImg.src = AVATAR_CONFIG.default;
        };

        if (!avatarContainer.contains(avatarImg)) {
            avatarContainer.appendChild(avatarImg);
        }
    }

    // Mise à jour du nom
    const nameElement = document.querySelector(`.${prefix}-name`);
    if (nameElement) {
        nameElement.textContent = player.name || 'Joueur inconnu';
    }
}

// 📌 Mise à jour de l'indicateur de tour
function updateTurnIndicator(prefix, isCurrentTurn) {
    const profile = document.querySelector(`.${prefix}-profile`);
    if (profile) {
        profile.classList.toggle('active-turn', isCurrentTurn);
    }
}

// 📌 Initialisation des zones de jeu
function initializeGameAreas() {
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        gameBoard.innerHTML = ''; // Nettoyage

        const zones = ['player-hand', 'game-zones', 'opponent-hand'];
        zones.forEach(zone => {
            const div = document.createElement('div');
            div.id = zone;
            div.className = zone;
            gameBoard.appendChild(div);
        });
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

// 📌 Écouteurs Socket.io
function setupSocketListeners() {
    socket.on('updatePlayers', (players) => {
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) updatePlayerProfile(opponent, true);
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de la partie:', data);
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

    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players); // ✅ Debug
    
        const opponent = players.find(player => player.clientId !== userData.clientId);
        console.log('👀 Adversaire détecté:', opponent); // ✅ Vérifie si l’adversaire est bien trouvé
    
        if (opponent) {
            updatePlayerProfile(opponent, true);
        }
    });
}

// 📌 Gestion du début de partie
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

    if (data.hands?.playerHand) {
        displayHand(data.hands.playerHand, true);
    }

    dragAndDrop.enableDragDrop();
}

// 📌 Gestion d'une carte jouée
function handleCardPlayed(data) {
    if (!data.cardId || !data.slot) {
        console.error("❌ Données de carte invalides:", data);
        return;
    }

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
    if (!gameInstance) return;

    gameInstance.currentTurn = playerId;
    const isPlayerTurn = playerId === userData.clientId;

    updateTurnIndicator('player', isPlayerTurn);
    updateTurnIndicator('opponent', !isPlayerTurn);

    dragAndDrop.setDraggable(isPlayerTurn);
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
        cardElement.dataset.cardName = card.name;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';
        
        if (isPlayer) {
            cardElement.draggable = true;
            cardElement.addEventListener('dragstart', (e) => dragAndDrop.handleDragStart(e));
        }

        handContainer.appendChild(cardElement);
    });
}

// 📌 Affichage des erreurs
function showError(message) {
    console.error(message);
}

export { updatePlayerProfile, showError, handleCardPlayed, handleTurnUpdate };