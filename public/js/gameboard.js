import { updatePlayerProfile } from './uiManager.js';
import { enableDragAndDrop } from './dragAndDrop.js';
import socket from './websocket.js';

// Variables globales
let userData;
let currentRoomId;
let opponentData = null;
let isPlayerTurn = false;

// 📌 Initialisation du jeu
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');

    try {
        // ✅ Récupération des données utilisateur
        const storedData = localStorage.getItem('userData');
        if (!storedData) {
            throw new Error('Session expirée');
        }
        userData = JSON.parse(storedData);
        console.log("📌 Données utilisateur récupérées:", userData);

        // ✅ Vérification de l'ID de la room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId) {
            throw new Error('ID de room manquant');
        }
        console.log(`📌 Room ID: ${currentRoomId}`);

        // ✅ Attente de la connexion socket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // ✅ Mise à jour de l'interface joueur
        updatePlayerProfile(userData, false);

        // ✅ Envoi de la demande pour rejoindre la partie
        socket.emit('joinRoom', { ...userData, roomCode: currentRoomId });

        // ✅ Initialisation du Drag & Drop
        enableDragAndDrop();

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay(error.message);
        setTimeout(() => {
            window.location.href = '/choose-mode';
        }, 2000);
    }
});

// ✅ Gestion des événements Socket.io
socket.on('gameStart', (data) => {
    console.log('🎮 Début de la partie:', data);

    if (!data.players || data.players.length < 2) {
        console.error("❌ Pas assez de joueurs pour commencer.");
        return;
    }

    // ✅ Identification du joueur et de l’adversaire
    opponentData = data.players.find(p => p.clientId !== userData.clientId);
    if (!opponentData) {
        console.error("❌ Aucun adversaire détecté !");
        return;
    }

    // ✅ Mise à jour des profils
    updatePlayerProfile(userData, false);
    updatePlayerProfile(opponentData, true);

    // ✅ Affichage des mains
    displayHand(data.hands[userData.clientId], true);  // Main du joueur
    displayHand(data.hands[opponentData.clientId], false);  // Main de l’adversaire

    // ✅ Définition du tour initial
    isPlayerTurn = data.turn === userData.clientId;
    updateTurnIndicator();
});

// ✅ Gestion d'une carte jouée
socket.on('cardPlayed', (data) => {
    console.log('🃏 Carte jouée:', data);
    handleCardPlayed(data);
});

// ✅ Gestion du changement de tour
socket.on('turnUpdate', (playerId) => {
    console.log('🎲 Changement de tour:', playerId);
    isPlayerTurn = playerId === userData.clientId;
    updateTurnIndicator();
});

// ✅ Détection du départ de l'adversaire
socket.on('opponentLeft', () => {
    console.log('👋 Adversaire déconnecté');
    showDisconnectOverlay("Votre adversaire a quitté la partie.");
});

// ✅ Gestion de la déconnexion
socket.on('disconnect', () => {
    console.log('🔌 Déconnexion du serveur');
    showDisconnectOverlay("Déconnecté du serveur...");
});

// ✅ Fonction d'affichage des mains
function displayHand(cards, isPlayer) {
    const handContainer = document.getElementById(isPlayer ? 'player-hand' : 'opponent-hand');
    if (!handContainer || !Array.isArray(cards)) {
        console.error("❌ Problème avec la main du joueur ou de l’adversaire");
        return;
    }

    handContainer.innerHTML = '';  // Nettoyage avant affichage
    console.log(`📌 Affichage de la main de ${isPlayer ? 'joueur' : 'adversaire'}`);

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        cardElement.dataset.cardId = card.id;
        cardElement.style.backgroundImage = isPlayer ? `url(${card.src})` : 'url(/Cartes/dos.png)';

        if (isPlayer) {
            cardElement.draggable = true;
            cardElement.addEventListener('dragstart', (e) => handleDragStart(e));
        }

        handContainer.appendChild(cardElement);
    });
}

// ✅ Mise à jour de l'indicateur de tour
function updateTurnIndicator() {
    const playerTurnIndicator = document.querySelector('.player-profile');
    const opponentTurnIndicator = document.querySelector('.opponent-profile');

    if (playerTurnIndicator) {
        playerTurnIndicator.classList.toggle('active-turn', isPlayerTurn);
    }
    if (opponentTurnIndicator) {
        opponentTurnIndicator.classList.toggle('active-turn', !isPlayerTurn);
    }
}

// ✅ Gestion d'une carte jouée
function handleCardPlayed(data) {
    if (!data.cardId || !data.slot) {
        console.error("❌ Données de carte invalides:", data);
        return;
    }

    const dropZone = document.querySelector(`[data-slot="${data.slot}"]`);
    if (dropZone) {
        const playedCard = document.createElement('img');
        playedCard.src = data.cardSrc;
        playedCard.classList.add('played-card');

        dropZone.appendChild(playedCard);
    }
}

// ✅ Affichage de l'overlay de déconnexion
function showDisconnectOverlay(message) {
    const overlay = document.getElementById('disconnect-overlay');
    if (overlay) {
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = '/choose-mode';
        }, 3000);
    }
}