import Deck from './deck.js';
import { enableDragAndDrop } from './dragAndDrop.js';
import { updatePlayerProfile } from './uiManager.js';

const socket = io();
window.gameSocket = socket;

let gameState = {
    roomId: null,
    player: null,
    opponent: null,
    turn: null,
    hand: [],
    opponentHandSize: 0
};

const deckManager = new Deck(); // Création d'une instance de Deck

socket.on('connect', () => {
    console.log("✅ Connecté au serveur WebSocket");
    initializeGame();
});

function initializeGame() {
    console.log("🔄 Initialisation du jeu...");
    gameState.player = JSON.parse(localStorage.getItem('userData'));
    gameState.roomId = localStorage.getItem('currentRoomId');

    if (!gameState.player || !gameState.roomId) {
        console.warn("⚠️ Données de session incomplètes !");
        return;
    }

    console.log("📌 Données utilisateur récupérées:", gameState.player);
    console.log("📌 Room ID:", gameState.roomId);

    socket.emit('joinGame', { roomId: gameState.roomId, player: gameState.player });
    enableDragAndDrop();
}

socket.on('gameStart', (data) => {
    console.log("🎮 Partie commencée !");
    gameState.opponent = data.players.find(p => p.clientId !== gameState.player.clientId);
    gameState.turn = data.turn;

    console.log("🆚 Adversaire détecté :", gameState.opponent);
    updatePlayerProfile(gameState.player, false);
    updatePlayerProfile(gameState.opponent, true);

    const decks = deckManager.creerDecksJoueurs();
    gameState.hand = decks.joueur1.main;
    renderPlayerHand();

    gameState.opponentHandSize = 5;
    renderOpponentHand();
});

function renderPlayerHand() {
    const playerHandElement = document.getElementById('player-hand');
    playerHandElement.innerHTML = '';

    gameState.hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('hand-card');
        cardElement.id = `card-${index}`;
        cardElement.style.backgroundImage = `url(${card.name})`;
        cardElement.draggable = true;
        playerHandElement.appendChild(cardElement);
    });
}

function renderOpponentHand() {
    const opponentHandElement = document.getElementById('opponent-hand');
    opponentHandElement.innerHTML = '';

    for (let i = 0; i < gameState.opponentHandSize; i++) {
        const cardElement = document.createElement('div');
        cardElement.classList.add('hand-card');
        cardElement.style.backgroundImage = `url('/Cartes/dos.png')`;
        opponentHandElement.appendChild(cardElement);
    }
}

document.addEventListener('DOMContentLoaded', initializeGame);