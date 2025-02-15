import { enableDragAndDrop } from './dragAndDrop.js';
import { updatePlayerProfile } from './uiManager.js';
import { generateDeck } from './deck.js';

const socket = io();
window.gameSocket = socket; // Rendre la connexion accessible globalement

let gameState = {
    roomId: null,
    player: null,
    opponent: null,
    turn: null,
    hand: [],
    opponentHandSize: 0
};

// ✅ Initialisation du jeu après connexion
socket.on('connect', () => {
    console.log("✅ Connecté au serveur WebSocket");
    initializeGame();
});

function initializeGame() {
    console.log("🔄 Initialisation du jeu...");

    // Récupération des infos utilisateur et de la room
    gameState.player = JSON.parse(localStorage.getItem('userData'));
    gameState.roomId = localStorage.getItem('currentRoomId');

    if (!gameState.player || !gameState.roomId) {
        console.warn("⚠️ Données de session incomplètes !");
        return;
    }

    console.log("📌 Données utilisateur récupérées:", gameState.player);
    console.log("📌 Room ID:", gameState.roomId);

    // Demander au serveur l'état initial de la partie
    socket.emit('joinGame', { roomId: gameState.roomId, player: gameState.player });

    // Activation du Drag & Drop
    enableDragAndDrop();
}

// ✅ Réception des informations de jeu depuis le serveur
socket.on('gameStart', (data) => {
    console.log("🎮 Partie commencée !");
    gameState.opponent = data.players.find(p => p.clientId !== gameState.player.clientId);
    gameState.turn = data.turn;

    console.log("🆚 Adversaire détecté :", gameState.opponent);

    // Mise à jour des profils sur l'interface
    updatePlayerProfile(gameState.player, false);
    updatePlayerProfile(gameState.opponent, true);

    // Génération de la main de départ pour le joueur
    gameState.hand = generateDeck(5);
    renderPlayerHand();

    // Taille de la main de l'adversaire (cartes face cachée)
    gameState.opponentHandSize = 5;
    renderOpponentHand();
});

// ✅ Gestion du placement d'une carte
socket.on('cardPlayed', (data) => {
    if (!data || data.roomId !== gameState.roomId) return;

    console.log(`🎴 Carte jouée par ${data.player}:`, data);
    renderCardOnBoard(data);
});

// ✅ Gestion du changement de tour
socket.on('turnUpdate', (newTurn) => {
    gameState.turn = newTurn;
    console.log(`🔄 Nouveau tour : ${newTurn === gameState.player.clientId ? "VOTRE TOUR" : "Tour de l'adversaire"}`);
});

// ✅ Rendu de la main du joueur
function renderPlayerHand() {
    const playerHandElement = document.getElementById('player-hand');
    playerHandElement.innerHTML = ''; // Nettoyage de la main

    gameState.hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('hand-card');
        cardElement.id = `card-${index}`;
        cardElement.style.backgroundImage = `url(${card.image})`;
        cardElement.draggable = true;
        playerHandElement.appendChild(cardElement);
    });
}

// ✅ Rendu de la main de l'adversaire (dos des cartes)
function renderOpponentHand() {
    const opponentHandElement = document.getElementById('opponent-hand');
    opponentHandElement.innerHTML = ''; // Nettoyage de la main adverse

    for (let i = 0; i < gameState.opponentHandSize; i++) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('hand-card');
        cardElement.style.backgroundImage = `url('/Cartes/dos.png')`; // Dos des cartes
        opponentHandElement.appendChild(cardElement);
    }
}

// ✅ Affichage d'une carte jouée sur le plateau
function renderCardOnBoard(data) {
    const targetZone = document.querySelector(`.drop-area[data-slot="${data.slot}"]`);
    if (!targetZone) return;

    const cardElement = document.createElement('div');
    cardElement.classList.add('played-card');
    cardElement.style.backgroundImage = `url(${data.card.image})`;
    targetZone.appendChild(cardElement);
}

// ✅ Notifier le serveur lorsqu'un joueur termine son tour
function endTurn() {
    if (gameState.turn !== gameState.player.clientId) {
        console.warn("🚫 Ce n'est pas votre tour !");
        return;
    }

    socket.emit('endTurn', { roomId: gameState.roomId });
}

// ✅ Attente du DOM pour initialiser le jeu
document.addEventListener('DOMContentLoaded', initializeGame);