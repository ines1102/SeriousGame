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
// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    try {
        // Récupération des données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }

        // Récupération et validation de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('Room ID manquant');
        }

        // Attente de la connexion socket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // Initialisation de l'interface
        initializeUI();

        // Initialisation du jeu
        gameInstance = new Game(socket);
        window.gameInstance = gameInstance; // Pour le debugging

        // Initialisation du drag & drop
        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize(); // ✅ Supprime `await` ici car `initialize()` n'est pas asynchrone.

        // Configuration des écouteurs Socket.io
        setupSocketListeners();

        // Rejoindre la room
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

// Initialisation des données de jeu
async function initializeGameData() {
    try {
        // Récupération des données utilisateur
        const storedData = localStorage.getItem('userData');
        if (!storedData) {
            throw new Error('Session expirée');
        }
        userData = JSON.parse(storedData);

        // Récupération et validation de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId || currentRoomId === 'undefined') {
            throw new Error('ID de room invalide');
        }

        console.log('📌 Données de session:', { userData, currentRoomId });
        return true;
    } catch (error) {
        console.error("❌ Erreur lors du chargement des données:", error);
        showDisconnectOverlay(error.message);
        return false;
    }
}

// Obtenir le chemin de l'avatar
function getAvatarPath(sex, avatarId) {
    try {
        if (!sex || !avatarId) {
            console.warn('⚠️ Données d\'avatar incomplètes, utilisation de l\'avatar par défaut');
            return AVATAR_CONFIG.default;
        }
        return AVATAR_CONFIG[sex]?.[avatarId] || AVATAR_CONFIG.default;
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'avatar:', error);
        return AVATAR_CONFIG.default;
    }
}

// Initialisation de l'interface utilisateur
function initializeUI() {
    try {
        // Mise à jour du profil du joueur
        updatePlayerProfile(userData, false);
        
        // Initialisation du conteneur adversaire
        initializeOpponentContainer();

        // Initialisation des zones de jeu
        initializeGameAreas();
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation de l'UI:", error);
    }
}

// Initialisation des zones de jeu
function initializeGameAreas() {
    const gameBoard = document.querySelector('.game-board');
    if (gameBoard) {
        // Nettoyage des zones existantes
        gameBoard.innerHTML = '';

        // Création des zones de jeu
        const zones = ['player-hand', 'game-zones', 'opponent-hand'];
        zones.forEach(zone => {
            const div = document.createElement('div');
            div.id = zone;
            div.className = zone;
            gameBoard.appendChild(div);
        });
    }
}

// Mise à jour du profil d'un joueur
function updatePlayerProfile(player, isOpponent = false) {
    const prefix = isOpponent ? 'opponent' : 'player';
    
    // Mise à jour de l'avatar
    const avatarContainer = document.querySelector(`.${prefix}-avatar`);
    if (avatarContainer) {
        const avatarImg = avatarContainer.querySelector('img') || document.createElement('img');
        avatarImg.className = 'avatar-img';
        
        // Utilisation du chemin d'avatar avec fallback
        const avatarPath = getAvatarPath(player.sex, player.avatarId);
        avatarImg.src = avatarPath;
        avatarImg.alt = `Avatar de ${player.name}`;
        
        // Gestion des erreurs de chargement d'image
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

    // Indication du tour
    updateTurnIndicator(prefix, player.id === gameInstance?.currentTurn);
}

// Mise à jour de l'indicateur de tour
function updateTurnIndicator(prefix, isCurrentTurn) {
    const profile = document.querySelector(`.${prefix}-profile`);
    if (profile) {
        profile.classList.toggle('active-turn', isCurrentTurn);
    }
}

// Initialisation du conteneur adversaire
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

    // Mise à jour des profils
    updatePlayerProfile(currentPlayer, false);
    updatePlayerProfile(opponent, true);

    // Affichage des mains initiales
    if (data.hands?.playerHand) {
        displayHand(data.hands.playerHand, true);
    }

    // Initialisation du drag & drop
    if (dragAndDrop) {
        dragAndDrop.enableDragDrop();
    }
}

// Gestion d'une carte jouée
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

// Gestion du changement de tour
function handleTurnUpdate(playerId) {
    if (!gameInstance) return;

    gameInstance.currentTurn = playerId;
    const isPlayerTurn = playerId === userData.clientId;

    // Mise à jour des indicateurs visuels
    updateTurnIndicator('player', isPlayerTurn);
    updateTurnIndicator('opponent', !isPlayerTurn);

    // Mise à jour du drag & drop
    if (dragAndDrop) {
        dragAndDrop.setDraggable(isPlayerTurn);
    }
}

// Affichage de la main
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) {
        console.error("❌ Problème avec le conteneur de la main ou les cartes");
        return;
    }

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

export { 
    updatePlayerProfile, 
    showDisconnectOverlay, 
    showError,
    handleCardPlayed,
    handleTurnUpdate 
};