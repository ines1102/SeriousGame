import socket from './websocket.js';
import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';
import Deck from './deck.js'; // ✅ Importation corrigée du deck

// Variables globales
let gameInstance;
let currentRoomId;
let userData;

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');
    
    // Récupération des données utilisateur et room
    userData = JSON.parse(localStorage.getItem('userData'));
    currentRoomId = new URLSearchParams(window.location.search).get('roomId');

    if (!userData || !currentRoomId) {
        console.error('❌ Données utilisateur ou roomId manquants');
        window.location.href = '/';
        return;
    }

    console.log('📌 Données de session:', { userData, currentRoomId });

    try {
        // Initialisation de l'interface utilisateur
        initializeUI(userData);

        // Création de l'instance du jeu
        gameInstance = new Game(socket);
        window.gameInstance = gameInstance;

        // Initialiser le drag & drop
        const dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize();

        // Rejoindre la room
        socket.emit('joinRoom', { ...userData, roomCode: currentRoomId });

        // Configuration des écouteurs WebSocket
        setupSocketListeners(dragAndDrop);
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay("Erreur lors de l'initialisation du jeu");
    }
});

// 📌 Écouteurs WebSocket
function setupSocketListeners(dragAndDrop) {
    socket.on('updatePlayers', (players) => {
        console.log('🔄 Mise à jour des joueurs:', players);
        const opponent = players.find(player => player.clientId !== userData.clientId);
        if (opponent) {
            updateOpponentInfo(opponent);
        }
    });

    socket.on('gameStart', (data) => {
        console.log('🎮 Début de la partie:', data);
    
        if (!data.players || data.players.length < 2) {
            console.error("❌ Problème: pas assez de joueurs pour démarrer.");
            return;
        }
    
        const currentPlayer = data.players.find(player => player.clientId === userData.clientId);
        const opponent = data.players.find(player => player.clientId !== userData.clientId);
    
        if (!currentPlayer || !opponent) {
            console.error("❌ Erreur d'attribution des joueurs.");
            return;
        }

        updateOpponentInfo(opponent);
        displayHand(data.hands?.playerHand || [], true);
    });

    socket.on('cardPlayed', (data) => {
        console.log('🃏 Carte jouée reçue:', data);
        if (!data.cardId || !data.slot) {
            console.error("❌ Données de carte invalides reçues:", data);
            return;
        }

        const dropZone = document.querySelector(`[data-slot="${data.slot}"]`);
        if (dropZone) {
            dragAndDrop.processDrop({
                cardId: data.cardId,
                cardSrc: data.cardSrc || `url(${data.name})`,
                name: data.cardName || data.name
            }, dropZone);
        }
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

// 📌 Initialisation de l'interface utilisateur
function initializeUI(userData) {
    console.log('🖥️ Initialisation UI pour:', userData.name);

    const playerAvatar = document.getElementById('player-avatar');
    const playerName = document.getElementById('player-name');

    if (playerAvatar && playerName) {
        playerAvatar.src = userData.avatarSrc || "/Avatars/default-avatar.jpeg";
        playerName.textContent = userData.name;
    } else {
        console.error("❌ Éléments UI non trouvés pour le joueur.");
    }
}

// 📌 Mise à jour des informations de l'adversaire
function updateOpponentInfo(opponent) {
    console.log('🔄 Mise à jour infos adversaire:', opponent);

    const opponentAvatar = document.getElementById('opponent-avatar');
    const opponentName = document.getElementById('opponent-name');

    if (!opponentAvatar || !opponentName) {
        console.error("❌ Éléments UI adversaire non trouvés.");
        return;
    }

    opponentAvatar.src = opponent.avatarSrc || "/Avatars/default-avatar.jpeg";
    opponentName.textContent = opponent.name;
}

// 📌 Affichage des cartes en main
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) {
        console.error("❌ Problème avec le conteneur de la main ou les cartes:", { handContainer, cards });
        return;
    }

    handContainer.innerHTML = '';

    console.log(`📌 Affichage de la main du ${isPlayer ? 'joueur' : 'l\'adversaire'}:`, cards);

    cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        cardElement.dataset.cardId = card.id;
        cardElement.dataset.cardName = card.name;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.name})` : 'url(/Cartes/dos.png)';

        handContainer.appendChild(cardElement);
    });
}

// 📌 Affichage de l'overlay de déconnexion
function showDisconnectOverlay(message) {
    console.log('⚠️ Affichage overlay déconnexion:', message);
    
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

export { updateOpponentInfo, showDisconnectOverlay };