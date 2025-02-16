import { time } from "console";

document.addEventListener('DOMContentLoaded', () => {
    new GameRoom();
});

class GameRoom {
    constructor() {
        this.socket = null;
        this.playerData = this.getPlayerData();
        this.gameState = this.initializeGameState();

        this.init();
    }

    getPlayerData() {
        try {
            const data = JSON.parse(localStorage.getItem('playerData'));
            if (!data || !data.name || !data.avatar) throw new Error("Données du joueur invalides");
            return data;
        } catch (error) {
            console.error(error.message);
            window.location.href = '/';
            return null;
        }
    }

    initializeGameState() {
        return {
            currentTurn: null,
            playerHealth: 100,
            opponentHealth: 100,
            playerBoard: Array(5).fill(null),
            opponentBoard: Array(5).fill(null),
            selectedCard: null,
            isMyTurn: false
        };
    }

    init() {
        this.setupSocket();
        this.initializeUIElements();
        this.setupEventListeners();
        this.updatePlayerInfo();
    }

    setupSocket() {
        if (this.socket) return;

        this.socket = io('https://seriousgame-ds65.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 50000
        });

        this.socket.on('connect', () => {
            console.log('Connecté au serveur');
            this.joinGame();
        });

        this.socket.on('gameStart', (data) => this.handleGameStart(data));
        this.socket.on('gameStateUpdate', (state) => this.updateGameState(state));
        this.socket.on('turnUpdate', (data) => this.handleTurnUpdate(data));
        this.socket.on('cardPlayed', (data) => this.handleOpponentCardPlayed(data));
        this.socket.on('healthUpdate', (data) => this.updateHealth(data));
        this.socket.on('gameOver', (data) => this.handleGameOver(data));
        this.socket.on('opponentDisconnected', () => this.handleOpponentDisconnect());

        window.addEventListener('beforeunload', () => {
            console.log("Déconnexion propre du socket");
            this.socket.disconnect();
        });
    }

    initializeUIElements() {
        this.playerAvatar = document.getElementById('player-avatar');
        this.playerName = document.getElementById('player-name');
        this.playerHealthBar = document.querySelector('.player-health-bar-fill');
        
        this.opponentAvatar = document.getElementById('opponent-avatar');
        this.opponentName = document.getElementById('opponent-name');
        this.opponentHealthBar = document.querySelector('.opponent-health-bar-fill');
        
        this.playerHand = document.getElementById('player-hand');
        this.turnIndicator = document.getElementById('turn-indicator');
        
        this.playerAreas = document.querySelectorAll('.player-areas .drop-area');
        this.opponentAreas = document.querySelectorAll('.opponent-areas .drop-area');
    }

    setupEventListeners() {
        this.setupDragAndDrop();

        this.playerHand?.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card) this.handleCardClick(card);
        });

        this.playerAreas.forEach(area => {
            area.addEventListener('click', () => {
                if (this.gameState.selectedCard) {
                    this.playCard(this.gameState.selectedCard, area.dataset.slot);
                }
            });
        });
    }

    setupDragAndDrop() {
        this.playerHand?.addEventListener('dragstart', (e) => {
            if (!this.gameState.isMyTurn) return e.preventDefault();

            const card = e.target.closest('.card');
            if (card) {
                this.gameState.selectedCard = card;
                card.classList.add('dragging');
            }
        });

        this.playerHand?.addEventListener('dragend', (e) => {
            e.target?.classList.remove('dragging');
        });

        this.playerAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                if (this.gameState.isMyTurn) e.preventDefault();
            });

            area.addEventListener('drop', (e) => {
                e.preventDefault();
                if (this.gameState.selectedCard && this.gameState.isMyTurn) {
                    this.playCard(this.gameState.selectedCard, area.dataset.slot);
                }
            });
        });
    }

    playCard(card, slot) {
        if (!this.gameState.isMyTurn) return;

        this.socket.emit('playCard', { id: card.dataset.cardId, slot });
        this.removeCardFromHand(card);
        this.addCardToBoard(card, slot);
        this.gameState.selectedCard = null;
    }

    removeCardFromHand(card) {
        card.remove();
    }

    addCardToBoard(card, slot) {
        const area = document.querySelector(`.player-areas .drop-area[data-slot="player-${slot}"]`);
        if (area) {
            const cardClone = card.cloneNode(true);
            cardClone.classList.add('played');
            area.appendChild(cardClone);
        }
    }

    handleGameStart(data) {
        const { opponent, initialHand } = data;
        
        this.opponentName.textContent = opponent.name;
        this.opponentAvatar.src = `/Avatars/${opponent.avatar}`;
        
        initialHand.forEach(cardData => this.addCardToHand(cardData));
        this.showGameMessage("La partie commence !");
    }

    addCardToHand(cardData) {
        const cardElement = this.createCardElement(cardData);
        this.playerHand.appendChild(cardElement);
    }

    createCardElement(cardData) {
        const card = document.createElement('div');
        card.className = 'card';
        card.draggable = true;
        card.dataset.cardId = cardData.id;

        card.innerHTML = `
            <div class="card-content">
                <div class="card-cost">${cardData.cost}</div>
                <img src="${cardData.image}" alt="${cardData.name}" class="card-image">
                <div class="card-name">${cardData.name}</div>
                <div class="card-stats">
                    <span class="attack">${cardData.attack}</span>
                    <span class="health">${cardData.health}</span>
                </div>
            </div>
        `;

        return card;
    }

    updateHealth(data) {
        requestAnimationFrame(() => {
            this.playerHealthBar.style.width = `${data.playerHealth}%`;
            this.opponentHealthBar.style.width = `${data.opponentHealth}%`;
        });

        this.gameState.playerHealth = data.playerHealth;
        this.gameState.opponentHealth = data.opponentHealth;
    }

    handleTurnUpdate(data) {
        this.gameState.isMyTurn = data.currentPlayer === this.socket.id;
        this.turnIndicator.textContent = this.gameState.isMyTurn ? "C'est votre tour" : "Tour de l'adversaire";
    }

    handleOpponentDisconnect() {
        this.showGameMessage("L'adversaire s'est déconnecté !");
        setTimeout(() => window.location.href = '/', 2000);
    }

    updatePlayerInfo() {
        this.playerName.textContent = this.playerData.name;
        this.playerAvatar.src = `/Avatars/${this.playerData.avatar}`;
    }

    joinGame() {
        const roomId = new URLSearchParams(window.location.search).get('room');
        this.socket.emit(roomId ? 'joinRoom' : 'joinRandomGame', { roomId, playerData: this.playerData });
    }

    showGameMessage(message) {
        alert(message);
    }
}