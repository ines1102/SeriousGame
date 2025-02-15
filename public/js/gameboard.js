import { updatePlayerProfile, updateOpponentProfile, initializeUI, showDisconnectOverlay, showError } from './uiManager.js';
import socket from './websocket.js';

// Variables globales
let gameInstance;
let currentRoomId;
let userData;
let opponentData;

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');

    try {
        // Récupération des données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }
        console.log('📌 Données utilisateur récupérées:', userData);
        console.log('📌 Avatar attendu:', userData.avatarSrc);

        // Récupération et validation de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('Room ID manquant');
        }

        // Attente de la connexion socket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // Initialisation de l'interface utilisateur
        initializeUI();
        updatePlayerProfile(userData);

        // Rejoindre la room
        socket.emit('joinRoom', {
            ...userData,
            roomCode: currentRoomId
        });

        // Configuration des écouteurs Socket.io
        setupSocketListeners();

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay(error.message);
    }
});

// Configuration des écouteurs Socket.io
function setupSocketListeners() {
    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);

        opponentData = players.find(player => player.clientId !== userData.clientId);
        if (opponentData) {
            updateOpponentProfile(opponentData);
        } else {
            console.warn("⚠️ Aucun adversaire trouvé.");
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
    updatePlayerProfile(currentPlayer);
    updateOpponentProfile(opponent);

    // Affichage des mains initiales
    if (data.hands?.playerHand) {
        displayHand(data.hands.playerHand, true);
    }
}

// Gestion d'une carte jouée
function handleCardPlayed(data) {
    if (!data.cardId || !data.slot) {
        console.error("❌ Données de carte invalides:", data);
        return;
    }

    const dropZone = document.querySelector(`[data-slot="${data.slot}"]`);
    if (dropZone) {
        const playedCard = document.createElement('div');
        playedCard.className = 'played-card';
        playedCard.style.backgroundImage = `url(${data.cardSrc})`;

        dropZone.innerHTML = '';
        dropZone.appendChild(playedCard);
    }
}

// Gestion du changement de tour
function handleTurnUpdate(playerId) {
    console.log(`🎲 Tour du joueur: ${playerId}`);
    const isPlayerTurn = playerId === userData.clientId;

    const playerContainer = document.getElementById('player-container');
    const opponentContainer = document.getElementById('opponent-container');

    if (playerContainer) playerContainer.classList.toggle('active-turn', isPlayerTurn);
    if (opponentContainer) opponentContainer.classList.toggle('active-turn', !isPlayerTurn);
}

// Affichage de la main du joueur
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
        cardElement.className = 'hand-card';
        cardElement.dataset.cardId = card.id;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';

        handContainer.appendChild(cardElement);
    });
}