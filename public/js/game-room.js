// game-room.js
class GameRoom {
    constructor() {
        this.socket = io('https://seriousgame-ds65.onrender.com:1000', {
            withCredentials: true,
            transports: ['websocket']
        });
        
        this.playerData = JSON.parse(localStorage.getItem('playerData'));
        this.gameState = {
            currentTurn: null,
            playerHealth: 100,
            opponentHealth: 100,
            playerBoard: Array(5).fill(null),
            opponentBoard: Array(5).fill(null),
            selectedCard: null,
            isMyTurn: false
        };
        
        this.init();
    }

    init() {
        this.initializeSocketEvents();
        this.initializeUIElements();
        this.setupEventListeners();
        this.updatePlayerInfo();
    }

    initializeUIElements() {
        // Profil joueur
        this.playerAvatar = document.getElementById('player-avatar');
        this.playerName = document.getElementById('player-name');
        this.playerHealthBar = document.querySelector('.player-health-bar-fill');
        
        // Profil adversaire
        this.opponentAvatar = document.getElementById('opponent-avatar');
        this.opponentName = document.getElementById('opponent-name');
        this.opponentHealthBar = document.querySelector('.opponent-health-bar-fill');
        
        // Plateau de jeu
        this.playerHand = document.getElementById('player-hand');
        this.gameBoard = document.getElementById('game-board');
        this.turnIndicator = document.getElementById('turn-indicator');
        
        // Zones de jeu
        this.playerAreas = document.querySelectorAll('.player-areas .drop-area');
        this.opponentAreas = document.querySelectorAll('.opponent-areas .drop-area');
    }

    initializeSocketEvents() {
        // Connexion à la partie
        this.socket.on('connect', () => {
            console.log('Connecté au serveur');
            this.joinGame();
        });

        // Début de partie
        this.socket.on('gameStart', (data) => {
            this.handleGameStart(data);
        });

        // Mise à jour de l'état du jeu
        this.socket.on('gameStateUpdate', (state) => {
            this.updateGameState(state);
        });

        // Tour de jeu
        this.socket.on('turnUpdate', (data) => {
            this.handleTurnUpdate(data);
        });

        // Carte jouée par l'adversaire
        this.socket.on('cardPlayed', (data) => {
            this.handleOpponentCardPlayed(data);
        });

        // Mise à jour des points de vie
        this.socket.on('healthUpdate', (data) => {
            this.updateHealth(data);
        });

        // Fin de partie
        this.socket.on('gameOver', (data) => {
            this.handleGameOver(data);
        });

        // Déconnexion de l'adversaire
        this.socket.on('opponentDisconnected', () => {
            this.handleOpponentDisconnect();
        });
    }

    setupEventListeners() {
        // Gestion du drag & drop des cartes
        this.setupDragAndDrop();
        
        // Gestion des clics sur les cartes
        this.playerHand.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            if (card) this.handleCardClick(card);
        });
        
        // Gestion des zones de dépôt
        this.playerAreas.forEach(area => {
            area.addEventListener('click', () => {
                if (this.gameState.selectedCard) {
                    this.playCard(this.gameState.selectedCard, area.dataset.slot);
                }
            });
        });
    }

    setupDragAndDrop() {
        // Rendre les cartes déplaçables
        this.playerHand.addEventListener('dragstart', (e) => {
            if (!this.gameState.isMyTurn) {
                e.preventDefault();
                return;
            }
            const card = e.target.closest('.card');
            if (card) {
                this.gameState.selectedCard = card;
                card.classList.add('dragging');
            }
        });

        this.playerHand.addEventListener('dragend', (e) => {
            const card = e.target.closest('.card');
            if (card) card.classList.remove('dragging');
        });

        // Configurer les zones de dépôt
        this.playerAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                if (this.gameState.isMyTurn) {
                    e.preventDefault();
                    area.classList.add('drag-over');
                }
            });

            area.addEventListener('dragleave', () => {
                area.classList.remove('drag-over');
            });

            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                if (this.gameState.selectedCard && this.gameState.isMyTurn) {
                    this.playCard(this.gameState.selectedCard, area.dataset.slot);
                }
            });
        });
    }

    playCard(card, slot) {
        if (!this.gameState.isMyTurn) return;
        
        const cardData = {
            id: card.dataset.cardId,
            slot: slot
        };

        this.socket.emit('playCard', cardData);
        this.removeCardFromHand(card);
        this.addCardToBoard(card, slot);
        this.gameState.selectedCard = null;
    }

    removeCardFromHand(card) {
        card.remove();
    }

    addCardToBoard(card, slot) {
        const area = document.querySelector(`.player-areas .drop-area[data-slot="player-${slot}"]`);
        const cardClone = card.cloneNode(true);
        cardClone.classList.add('played');
        area.appendChild(cardClone);
    }

    handleGameStart(data) {
        const { opponent, initialHand } = data;
        
        // Mettre à jour les informations de l'adversaire
        this.opponentName.textContent = opponent.name;
        this.opponentAvatar.src = `/Avatars/${opponent.avatar}`;
        
        // Distribuer la main initiale
        initialHand.forEach(cardData => {
            this.addCardToHand(cardData);
        });
        
        // Afficher le message de début de partie
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
        const { playerHealth, opponentHealth } = data;
        
        // Mettre à jour les barres de vie avec animation
        this.animateHealthChange(this.playerHealthBar, playerHealth);
        this.animateHealthChange(this.opponentHealthBar, opponentHealth);
        
        // Mettre à jour l'état du jeu
        this.gameState.playerHealth = playerHealth;
        this.gameState.opponentHealth = opponentHealth;
    }

    animateHealthChange(healthBar, newValue) {
        healthBar.style.transition = 'width 0.5s ease-in-out';
        healthBar.style.width = `${newValue}%`;
        
        // Ajouter un effet visuel pour les dégâts
        if (parseInt(healthBar.style.width) > newValue) {
            healthBar.classList.add('damage');
            setTimeout(() => healthBar.classList.remove('damage'), 500);
        }
    }

    handleTurnUpdate(data) {
        this.gameState.isMyTurn = data.currentPlayer === this.socket.id;
        this.updateTurnIndicator();
    }

    updateTurnIndicator() {
        this.turnIndicator.textContent = this.gameState.isMyTurn ? "C'est votre tour" : "Tour de l'adversaire";
        this.turnIndicator.className = this.gameState.isMyTurn ? 'turn-indicator active' : 'turn-indicator';
    }

    handleGameOver(data) {
        const { winner, reason } = data;
        const isWinner = winner === this.socket.id;
        
        // Afficher le modal de fin de partie
        this.showGameOverModal(isWinner, reason);
    }

    showGameOverModal(isWinner, reason) {
        const modal = document.createElement('div');
        modal.className = 'game-over-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>${isWinner ? 'Victoire !' : 'Défaite...'}</h2>
                <p>${reason}</p>
                <button onclick="location.reload()">Rejouer</button>
                <button onclick="location.href='/'">Menu Principal</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    showGameMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'game-message';
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        setTimeout(() => messageElement.remove(), 3000);
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
        if (roomId) {
            this.socket.emit('joinRoom', {
                roomId,
                playerData: this.playerData
            });
        } else {
            this.socket.emit('joinRandomGame', this.playerData);
        }
    }
}

// Initialiser le jeu quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new GameRoom();
});