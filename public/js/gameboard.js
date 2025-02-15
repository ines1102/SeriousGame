import { updatePlayerProfile } from './uiManager.js';
import { enableDragAndDrop } from './dragAndDrop.js';

// 📌 Connexion au serveur WebSocket
const socket = io({
    transports: ['websocket'],
    upgrade: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
});

// 📌 Variables globales
let userData = JSON.parse(localStorage.getItem('userData')) || {};
let opponentData = null;
let currentRoomId = null;
let playerHand = [];
let opponentHand = [];

// 📌 Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    console.log("🔄 Initialisation du jeu...");

    if (!userData || !userData.name) {
        console.error("❌ Données utilisateur manquantes !");
        return;
    }

    console.log("📌 Données utilisateur récupérées:", userData);

    socket.emit('requestOpponent');

    // 📌 Mise à jour du profil joueur
    updatePlayerProfile(userData, false);

    // 📌 Écoute des événements WebSocket
    setupSocketListeners();
});

// 📌 Configuration des événements WebSocket
function setupSocketListeners() {
    socket.on('connect_error', (error) => {
        console.error("❌ Erreur de connexion socket:", error);
        showErrorMessage("Problème de connexion au serveur. Tentative de reconnexion...");
    });
    
    socket.on('connect', () => {
        console.log("✅ Connecté au serveur");
        hideErrorMessage();
    });
    
    // Fonction d'affichage des erreurs
    function showErrorMessage(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }
    
    function hideErrorMessage() {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    }

    socket.on('gameStart', (data) => {
        console.log("🎮 Partie démarrée:", data);
        currentRoomId = data.roomCode;
        
        // Trouver l'adversaire
        const opponent = data.players.find(p => p.id !== socket.id);
        if (opponent) {
            opponentData = opponent;
            updatePlayerProfile(opponent, true);
        }
    });
    
    // ✅ Mise à jour des informations de l'adversaire
    socket.on('updateOpponent', (opponent) => {
        if (!opponent) return;
        
        opponentData = opponent;
        console.log("📌 Adversaire mis à jour:", opponentData);
        updatePlayerProfile(opponentData, true);
    });

    // ✅ Initialisation de la main du joueur et de l'adversaire
    socket.on('initializeHands', (data) => {
        if (data.playerId === socket.id) {
            playerHand = data.cards;
            renderHand(playerHand, 'player-hand');
        } else {
            opponentHand = data.cards;
            renderOpponentHand(opponentHand);
        }
    });

    // ✅ Mise à jour des cartes jouées
    socket.on('cardPlayed', (data) => {
        console.log("🃏 Carte jouée:", data);
        placeCardOnBoard(data);
    });

    // ✅ Tour de jeu mis à jour
    socket.on('turnUpdate', (turnPlayerId) => {
        console.log(`🔄 Tour de jeu : ${turnPlayerId}`);
        updateTurnIndicator(turnPlayerId);
    });

    // ✅ Déconnexion de l'adversaire
    socket.on('opponentDisconnected', () => {
        console.warn("⚠️ Votre adversaire s'est déconnecté.");
        showDisconnectOverlay();
    });
}

// 📌 Affichage des cartes du joueur
function renderHand(cards, handId) {
    const handContainer = document.getElementById(handId);
    handContainer.innerHTML = '';

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('hand-card');
        cardElement.style.backgroundImage = `url('${card.image}')`;
        cardElement.dataset.cardId = card.id;
        handContainer.appendChild(cardElement);
    });

    enableDragAndDrop();
}

// 📌 Affichage des cartes adversaires (dos visible)
function renderOpponentHand(cards) {
    const opponentHandContainer = document.getElementById('opponent-hand');
    opponentHandContainer.innerHTML = '';

    cards.forEach(() => {
        const cardBack = document.createElement('div');
        cardBack.classList.add('hand-card');
        cardBack.style.backgroundImage = "url('/Cartes/dos.png')";
        opponentHandContainer.appendChild(cardBack);
    });
}

// 📌 Placement des cartes sur le plateau
function placeCardOnBoard(cardData) {
    const slot = document.querySelector(`.drop-area[data-slot="${cardData.slot}"]`);
    if (!slot) return;

    slot.innerHTML = '';
    const cardElement = document.createElement('div');
    cardElement.classList.add('played-card');
    cardElement.style.backgroundImage = `url('${cardData.image}')`;
    slot.appendChild(cardElement);
}

// 📌 Indicateur du tour de jeu
function updateTurnIndicator(turnPlayerId) {
    const turnIndicator = document.getElementById('turn-indicator');
    turnIndicator.textContent = turnPlayerId === socket.id ? "🟢 Votre tour" : "🔴 Tour de l'adversaire";
}

// 📌 Affichage de l'overlay de déconnexion
function showDisconnectOverlay() {
    const disconnectOverlay = document.getElementById('disconnect-overlay');
    disconnectOverlay.classList.remove('hidden');
}