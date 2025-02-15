import { updatePlayerProfile } from './uiManager.js';
import { enableDragAndDrop } from './dragAndDrop.js';
import socketManager from './websocket.js';

class GameBoard {
    constructor() {
        this.init();
        this.socket = socketManager;
        this.userData = null;
        this.opponentData = null;
        this.currentRoomId = null;
        this.gameState = {
            playerHand: [],
            opponentHand: [],
            playerTurn: false,
            gameStarted: false
        };
    }

    async init() {
        try {
            console.log("🔄 Initialisation du jeu...");
            await this.loadUserData();
            this.setupUI();
            this.setupSocketListeners();
            enableDragAndDrop();
        } catch (error) {
            console.error("❌ Erreur d'initialisation:", error);
            this.handleError(error);
        }
    }

    async loadUserData() {
        this.userData = JSON.parse(localStorage.getItem('userData'));
        if (!this.userData || !this.userData.name) {
            throw new Error("Données utilisateur manquantes");
        }
        console.log("📌 Données utilisateur récupérées:", this.userData);

        // Vérifier le code de room dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        this.currentRoomId = urlParams.get('room');
        if (!this.currentRoomId) {
            throw new Error("Code room manquant");
        }
    }

    setupUI() {
        // Mise à jour du profil joueur
        updatePlayerProfile(this.userData, false);
        
        // Configuration des zones de jeu
        this.setupGameAreas();
        
        // Initialisation des messages de statut
        this.initializeStatusMessages();
    }

    setupGameAreas() {
        // Configuration des zones de drop pour les cartes
        const dropAreas = document.querySelectorAll('.drop-area');
        dropAreas.forEach(area => {
            area.addEventListener('dragover', this.handleDragOver.bind(this));
            area.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    setupSocketListeners() {
        // Connexion
        this.socket.on('connect', () => {
            console.log("✅ Connecté au serveur");
            if (this.currentRoomId && this.userData) {
                this.joinRoom();
            }
        });

        // Événements de jeu
        this.socket.on('gameStart', (data) => this.handleGameStart(data));
        this.socket.on('updateOpponent', (data) => this.handleOpponentUpdate(data));
        this.socket.on('cardPlayed', (data) => this.handleCardPlayed(data));
        this.socket.on('turnUpdate', (data) => this.handleTurnUpdate(data));
        this.socket.on('initializeHands', (data) => this.handleHandInitialization(data));
        this.socket.on('opponentDisconnected', () => this.handleOpponentDisconnect());
        this.socket.on('gameError', (error) => this.handleGameError(error));
    }

    joinRoom() {
        this.socket.emit('joinRoom', {
            roomCode: this.currentRoomId,
            ...this.userData
        });
    }

    handleGameStart(data) {
        console.log("🎮 Partie démarrée:", data);
        this.gameState.gameStarted = true;
        
        // Trouver et mettre à jour l'adversaire
        const opponent = data.players.find(p => p.id !== this.socket.socket.id);
        if (opponent) {
            this.handleOpponentUpdate(opponent);
        }

        // Initialiser l'interface de jeu
        this.initializeGameInterface();
    }

    handleOpponentUpdate(opponent) {
        if (!opponent) return;
        
        this.opponentData = opponent;
        console.log("📌 Adversaire mis à jour:", this.opponentData);
        updatePlayerProfile(this.opponentData, true);
    }

    handleCardPlayed(data) {
        console.log("🃏 Carte jouée:", data);
        this.placeCardOnBoard(data);
        this.updateGameState(data);
    }

    handleTurnUpdate(data) {
        this.gameState.playerTurn = data.playerId === this.socket.socket.id;
        this.updateTurnIndicator();
    }

    handleHandInitialization(data) {
        if (data.playerId === this.socket.socket.id) {
            this.gameState.playerHand = data.cards;
            this.renderPlayerHand();
        } else {
            this.gameState.opponentHand = new Array(data.cardCount).fill(null);
            this.renderOpponentHand();
        }
    }

    handleOpponentDisconnect() {
        console.warn("⚠️ Adversaire déconnecté");
        this.showDisconnectOverlay();
    }

    handleGameError(error) {
        console.error("❌ Erreur de jeu:", error);
        this.showError(error.message);
    }

    // Méthodes de rendu
    renderPlayerHand() {
        const handContainer = document.getElementById('player-hand');
        handContainer.innerHTML = '';

        this.gameState.playerHand.forEach(card => {
            const cardElement = this.createCardElement(card, true);
            handContainer.appendChild(cardElement);
        });
    }

    renderOpponentHand() {
        const handContainer = document.getElementById('opponent-hand');
        handContainer.innerHTML = '';

        this.gameState.opponentHand.forEach(() => {
            const cardBack = this.createCardElement(null, false);
            handContainer.appendChild(cardBack);
        });
    }

    createCardElement(card, isPlayer) {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        
        if (isPlayer && card) {
            cardElement.style.backgroundImage = `url('${card.image}')`;
            cardElement.dataset.cardId = card.id;
            cardElement.draggable = this.gameState.playerTurn;
        } else {
            cardElement.style.backgroundImage = "url('/Cartes/dos.png')";
        }

        return cardElement;
    }

    placeCardOnBoard(data) {
        const slot = document.querySelector(`.drop-area[data-slot="${data.slot}"]`);
        if (!slot) return;

        slot.innerHTML = '';
        const cardElement = document.createElement('div');
        cardElement.className = 'played-card';
        cardElement.style.backgroundImage = `url('${data.image}')`;
        slot.appendChild(cardElement);
    }

    updateTurnIndicator() {
        const indicator = document.getElementById('turn-indicator');
        indicator.textContent = this.gameState.playerTurn ? "🟢 Votre tour" : "🔴 Tour de l'adversaire";
        indicator.className = `turn-indicator ${this.gameState.playerTurn ? 'your-turn' : 'opponent-turn'}`;
    }

    // Gestionnaires d'événements
    handleDragOver(e) {
        if (this.gameState.playerTurn) {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');

        if (!this.gameState.playerTurn) return;

        const cardId = e.dataTransfer.getData('text/plain');
        const slot = e.currentTarget.dataset.slot;

        this.playCard(cardId, slot);
    }

    playCard(cardId, slot) {
        const card = this.gameState.playerHand.find(c => c.id === cardId);
        if (!card) return;

        this.socket.emit('cardPlayed', {
            cardId,
            slot,
            image: card.image
        });
    }

    // Utilitaires
    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 3000);
    }

    showDisconnectOverlay() {
        const overlay = document.getElementById('disconnect-overlay');
        overlay.classList.remove('hidden');
    }

    handleError(error) {
        console.error("❌ Erreur:", error);
        
        if (error.message === "Données utilisateur manquantes") {
            window.location.href = '/';
        } else if (error.message === "Code room manquant") {
            window.location.href = '/room-choice';
        } else {
            this.showError(error.message);
        }
    }

    cleanup() {
        // Nettoyage des événements socket
        ['gameStart', 'updateOpponent', 'cardPlayed', 'turnUpdate', 
         'initializeHands', 'opponentDisconnected', 'gameError'].forEach(event => {
            this.socket.off(event);
        });
    }
}

// Initialisation
const game = new GameBoard();

// Nettoyage à la fermeture
window.addEventListener('beforeunload', () => {
    game.cleanup();
});

// Export pour les tests
export default game;
