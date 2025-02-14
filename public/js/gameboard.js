// 📌 Importation des modules
import Game from './game.js';
import DragAndDropManager from './dragAndDrop.js';
import Deck from './deck.js';
import socket from './websocket.js';

// 📌 Configuration
const CONFIG = {
    RECONNECTION_DELAY: 3000,
    DEFAULT_AVATAR: "/Avatars/default-avatar.jpeg",
    CARD_BACK_IMAGE: "/Cartes/dos.png",
    ROUTES: {
        HOME: '/',
        CHOOSE_MODE: '/choose-mode'
    }
};

// 📌 Gestionnaire d'état du jeu
class GameState {
    constructor() {
        this.gameInstance = null;
        this.currentRoomId = null;
        this.userData = null;
        this.dragAndDrop = null;
    }

    initialize() {
        this.userData = this.loadUserData();
        this.currentRoomId = this.getRoomIdFromURL();
        
        if (!this.validateInitialState()) {
            throw new Error("État initial invalide");
        }
        
        return true;
    }

    loadUserData() {
        try {
            return JSON.parse(localStorage.getItem('userData'));
        } catch (error) {
            console.error("❌ Erreur lors du chargement des données utilisateur:", error);
            return null;
        }
    }

    getRoomIdFromURL() {
        return new URLSearchParams(window.location.search).get('roomId');
    }

    validateInitialState() {
        return this.userData && this.currentRoomId;
    }
}

// 📌 Gestionnaire de l'interface utilisateur
class UIManager {
    static updatePlayerInfo(userData, isOpponent = false) {
        const prefix = isOpponent ? 'opponent' : 'player';
        const avatar = document.getElementById(`${prefix}-avatar`);
        const name = document.getElementById(`${prefix}-name`);

        if (!avatar || !name) {
            throw new Error(`Éléments ${prefix} non trouvés`);
        }

        avatar.src = userData.avatarSrc || CONFIG.DEFAULT_AVATAR;
        name.textContent = userData.name;
    }

    static displayHand(cards, isPlayer) {
        if (!Array.isArray(cards)) {
            throw new Error("Format de cartes invalide");
        }

        const containerId = isPlayer ? 'player-hand' : 'opponent-hand';
        const container = document.getElementById(containerId);
        
        if (!container) {
            throw new Error(`Conteneur ${containerId} non trouvé`);
        }

        container.innerHTML = '';

        cards.forEach(card => {
            const cardElement = this.createCardElement(card, isPlayer);
            container.appendChild(cardElement);
        });
    }

    static createCardElement(card, isPlayer) {
        const element = document.createElement('div');
        element.className = 'hand-card';
        element.dataset.cardId = card.id;
        element.dataset.cardName = card.name;
        element.style.backgroundImage = isPlayer 
            ? `url(${card.name})` 
            : `url(${CONFIG.CARD_BACK_IMAGE})`;
        return element;
    }

    static showDisconnectOverlay(message) {
        const overlay = document.getElementById('disconnect-overlay');
        if (!overlay) {
            console.error("❌ Overlay de déconnexion non trouvé");
            return;
        }

        const messageElement = overlay.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }

        overlay.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = CONFIG.ROUTES.CHOOSE_MODE;
        }, CONFIG.RECONNECTION_DELAY);
    }
}

// 📌 Gestionnaire des événements Socket
class SocketEventHandler {
    constructor(gameState, dragAndDrop) {
        this.gameState = gameState;
        this.dragAndDrop = dragAndDrop;
    }

    setupListeners() {
        socket.on('updatePlayers', this.handleUpdatePlayers.bind(this));
        socket.on('gameStart', this.handleGameStart.bind(this));
        socket.on('cardPlayed', this.handleCardPlayed.bind(this));
        socket.on('opponentLeft', this.handleOpponentLeft.bind(this));
        socket.on('disconnect', this.handleDisconnect.bind(this));
        socket.on('error', this.handleError.bind(this));
    }

    handleUpdatePlayers(players) {
        try {
            const opponent = players.find(
                player => player.clientId !== this.gameState.userData.clientId
            );
            if (opponent) {
                UIManager.updatePlayerInfo(opponent, true);
            }
        } catch (error) {
            console.error("❌ Erreur lors de la mise à jour des joueurs:", error);
        }
    }

    handleGameStart(data) {
        if (!this.validateGameStartData(data)) {
            return;
        }

        const { currentPlayer, opponent } = this.identifyPlayers(data.players);
        
        console.log(`📌 Vous êtes: ${currentPlayer.name}`);
        console.log(`🎭 Votre adversaire est: ${opponent.name}`);

        if (data.hands?.playerHand) {
            UIManager.displayHand(data.hands.playerHand, true);
        }
    }

    validateGameStartData(data) {
        if (!data.players || data.players.length < 2) {
            console.error("❌ Données de démarrage invalides");
            return false;
        }
        return true;
    }

    identifyPlayers(players) {
        const currentPlayer = players.find(
            player => player.clientId === this.gameState.userData.clientId
        );
        const opponent = players.find(
            player => player.clientId !== this.gameState.userData.clientId
        );

        if (!currentPlayer || !opponent) {
            throw new Error("Impossible d'identifier les joueurs");
        }

        return { currentPlayer, opponent };
    }

    handleCardPlayed(data) {
        if (!this.validateCardPlayData(data)) {
            return;
        }

        const dropZone = document.querySelector(`[data-slot="${data.slot}"]`);
        if (dropZone) {
            this.dragAndDrop.processDrop({
                cardId: data.cardId,
                cardSrc: data.cardSrc || `url(${data.name})`,
                name: data.cardName || data.name
            }, dropZone);
        }
    }

    validateCardPlayData(data) {
        if (!data.cardId || !data.slot) {
            console.error("❌ Données de carte invalides:", data);
            return false;
        }
        return true;
    }

    handleOpponentLeft() {
        UIManager.showDisconnectOverlay("Votre adversaire a quitté la partie.");
    }

    handleDisconnect() {
        UIManager.showDisconnectOverlay("Déconnecté du serveur...");
    }

    handleError(error) {
        console.error("❌ Erreur socket:", error);
        UIManager.showDisconnectOverlay("Une erreur est survenue");
    }
}

// 📌 Initialisation principale
async function initializeGame() {
    console.log('🔄 Initialisation du jeu...');

    const gameState = new GameState();
    
    try {
        if (!gameState.initialize()) {
            window.location.href = CONFIG.ROUTES.HOME;
            return;
        }

        UIManager.updatePlayerInfo(gameState.userData);

        gameState.gameInstance = new Game(socket);
        window.gameInstance = gameState.gameInstance;

        const dragAndDrop = new DragAndDropManager(gameState.gameInstance, socket);
        dragAndDrop.initialize();

        const socketHandler = new SocketEventHandler(gameState, dragAndDrop);
        socketHandler.setupListeners();

        socket.emit('joinRoom', {
            ...gameState.userData,
            roomCode: gameState.currentRoomId
        });

    } catch (error) {
        console.error("❌ Erreur d'initialisation:", error);
        UIManager.showDisconnectOverlay("Erreur lors de l'initialisation du jeu");
    }
}

// 📌 Démarrage au chargement du DOM
document.addEventListener('DOMContentLoaded', initializeGame);

export { UIManager };