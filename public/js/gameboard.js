import { updatePlayerProfile } from './uiManager.js';
import { enableDragAndDrop } from './dragAndDrop.js';

// Variables globales
let socket;
let userData = null;
let opponentData = null;
let currentRoomId = null;

/// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    console.log("🔄 Initialisation du jeu...");
    
    // Récupérer les données utilisateur
    userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.name) {
        console.error("❌ Données utilisateur manquantes !");
        window.location.href = '/';
        return;
    }

    console.log("📌 Données utilisateur récupérées:", userData);

    // Initialiser le socket
    initializeSocket();
    
    // Mettre à jour le profil du joueur
    updatePlayerProfile(userData, false);
});

function initializeSocket() {
    socket = io({
        transports: ['websocket'],
        upgrade: false
    });

    setupSocketListeners();
}

function setupSocketListeners() {
    socket.on('connect', () => {
        console.log("✅ Connecté au serveur");
        // Envoyer immédiatement une demande de mise à jour de l'adversaire
        requestOpponentUpdate();
    });

    socket.on('gameStart', (data) => {
        console.log("🎮 Partie démarrée:", data);
        if (!data || !data.players) {
            console.error("❌ Données de partie invalides");
            return;
        }

        currentRoomId = data.roomCode;
        
        // Trouver et mettre à jour l'adversaire
        const opponent = data.players.find(p => p.id !== socket.id);
        if (opponent) {
            console.log("👥 Adversaire trouvé dans gameStart:", opponent);
            updateOpponentData(opponent);
        }
    });

    socket.on('updateOpponent', (opponent) => {
        console.log("📌 Réception updateOpponent:", opponent);
        if (!opponent) {
            console.warn("⚠️ Données adversaire invalides");
            return;
        }
        updateOpponentData(opponent);
    });

    // Gestion des cartes et du jeu
    socket.on('initializeHands', (data) => {
        if (data.playerId === socket.id) {
            playerHand = data.cards;
            renderHand(playerHand, 'player-hand');
        } else {
            opponentHand = data.cards;
            renderOpponentHand(opponentHand);
        }
    });

    socket.on('cardPlayed', (data) => {
        console.log("🃏 Carte jouée:", data);
        placeCardOnBoard(data);
    });

    socket.on('turnUpdate', (turnPlayerId) => {
        console.log(`🔄 Tour de jeu : ${turnPlayerId}`);
        updateTurnIndicator(turnPlayerId);
    });

    socket.on('opponentDisconnected', () => {
        console.warn("⚠️ Votre adversaire s'est déconnecté.");
        showDisconnectOverlay();
    });
}

// Fonctions utilitaires pour la gestion des messages d'erreur
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

function updateOpponentData(opponent) {
    opponentData = opponent;
    console.log("🔄 Mise à jour des données adversaire:", opponentData);
    
    // Formater les données pour updatePlayerProfile
    const formattedOpponent = {
        name: opponent.name,
        sex: opponent.sex,
        avatarId: opponent.avatarId
    };
    
    updatePlayerProfile(formattedOpponent, true);
}

function requestOpponentUpdate() {
    console.log("📤 Demande de mise à jour de l'adversaire");
    socket.emit('requestOpponent');
}