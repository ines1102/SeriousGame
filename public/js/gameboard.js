import { updatePlayerProfile } from './uiManager.js';
import { enableDragAndDrop } from './dragAndDrop.js';

// 📌 Connexion au serveur WebSocket
const socket = io();

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
    // ✅ Connexion réussie
    socket.on('connect', () => {
        console.log("✅ Connecté au serveur");
    });

    // ✅ Mise à jour des informations de l'adversaire
    socket.on('updateOpponent', (opponent) => {
        opponentData = opponent;
        console.log("📌 Adversaire détecté:", opponentData);
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