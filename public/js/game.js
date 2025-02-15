import Deck from './deck.js';
import DragAndDropManager from './dragAndDrop.js';

class Game {
    constructor(socket) {
        this.socket = socket;
        this.gameState = {
            playerCards: [],
            opponentCards: [],
            playedCards: new Map(),
            currentTurn: null,
            isInitialized: false
        };
        this.callbacks = new Map();
    }

    on(event, callback) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, new Set());
        }
        this.callbacks.get(event).emit(callback);
    }

    off(event, callback) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    emit(event, data) {
        const callbacks = this.callbacks.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    initializeGame() {
        this.gameState.isInitialized = true;
        this.emit('gameInitialized', this.gameState);
        return true;
    }

    playCard(cardId, slot) {
        if (!this.validateMove(cardId, slot)) {
            return false;
        }

        this.gameState.playedCards.set(slot, cardId);
        this.emit('cardPlayed', { cardId, slot });
        this.socket.emit('cardPlayed', { cardId, slot });
        return true;
    }

    validateMove(cardId, slot) {
        return !this.gameState.playedCards.has(slot);
    }

    updateGameState(newState) {
        this.gameState = { ...this.gameState, ...newState };
        this.emit('stateUpdated', this.gameState);
    }
}

export default Game;
