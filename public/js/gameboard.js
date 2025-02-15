import { initializeUI, updatePlayerProfile } from './uiManager.js';
import socket from './websocket.js';
import DragAndDropManager from './dragAndDrop.js';

// ✅ Variables globales
let gameInstance;
let currentRoomId;
let userData;
let dragAndDrop;

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
        if (!currentRoomId || currentRoomId === 'undefined') {
            throw new Error('Room ID manquant');
        }

        console.log("📌 Données utilisateur récupérées:", userData);
        console.log("📌 Avatar attendu:", userData.avatarSrc);

        // ✅ Attente de la connexion WebSocket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // ✅ Initialisation de l'UI
        initializeUI(userData);

        // ✅ Initialisation du Drag & Drop
        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize();

        // ✅ Rejoindre la room
        socket.emit('joinRoom', { 
            ...userData, 
            roomCode: currentRoomId 
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
    }
});

// 📌 Écoute des mises à jour des joueurs et de l'état du jeu
socket.on('updatePlayers', (players) => {
    console.log('🔄 Mise à jour des joueurs:', players);

    if (!players || players.length < 2) {
        console.warn("⚠️ Pas assez de joueurs pour une mise à jour.");
        return;
    }

    // Identifier le joueur actuel et l'adversaire
    const currentPlayer = players.find(p => p.clientId === userData.clientId);
    const opponent = players.find(p => p.clientId !== userData.clientId); // ✅ Correction

    if (opponent) {
        console.log(`📌 Adversaire trouvé: ${opponent.name}, Avatar: ${opponent.avatarSrc}`);
        updatePlayerProfile(opponent, true);
    }
    if (!currentPlayer || !opponent) {
        console.warn("⚠️ Impossible de récupérer les informations des joueurs.");
        return;
    }

    // ✅ Mise à jour du profil du joueur
    updatePlayerProfile(currentPlayer, false);

    // ✅ Mise à jour du profil de l'adversaire
    updatePlayerProfile(opponent, true);
});

socket.on('gameStart', (data) => {
    console.log('🎮 Début de la partie:', data);
    handleGameStart(data);
});

// ✅ Gestion de l'affichage des mains
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

    // ✅ Mise à jour des profils
    updatePlayerProfile(currentPlayer, false);
    updatePlayerProfile(opponent, true);

    // ✅ Affichage des mains initiales
    if (data.hands?.playerHand) {
        displayHand(data.hands.playerHand, true);
    }

    if (data.hands?.opponentHand) {
        displayHand(data.hands.opponentHand, false);
    }
}

// ✅ Fonction d'affichage des mains des joueurs
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