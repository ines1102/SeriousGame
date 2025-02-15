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

export function initializeGame() {
    console.log("🔄 Initialisation du jeu...");
    
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (!userData || !userData.name || !userData.sex || !userData.avatarId) {
        console.warn("⚠️ Données de session incomplètes !");
        // Rediriger vers la page d'accueil si les données sont incomplètes
        window.location.href = '/';
        return;
    }

    // Initialiser le jeu avec les données utilisateur valides
    return userData;
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