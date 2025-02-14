import Deck from './deck.js';
import { EventEmitter } from 'events';

// 📌 Configuration du jeu
const GAME_CONFIG = {
    MAX_PLAYERS: 2,
    MAX_CARDS_IN_HAND: 5,
    MAX_SLOTS: 9
};

// 📌 États du jeu
const GAME_STATES = {
    WAITING: 'waiting',
    INITIALIZED: 'initialized',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

// 📌 Types d'événements
const GAME_EVENTS = {
    CARD_PLAYED: 'cardPlayed',
    STATE_UPDATED: 'stateUpdated',
    TURN_CHANGED: 'turnChanged',
    ERROR: 'error'
};

class GameError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'GameError';
        this.code = code;
    }
}

class GameState {
    constructor() {
        this.playerCards = [];
        this.opponentCards = [];
        this.playedCards = new Map();
        this.currentTurn = null;
        this.status = GAME_STATES.WAITING;
        this.lastAction = null;
        this.turnNumber = 0;
    }

    clone() {
        const newState = new GameState();
        newState.playerCards = [...this.playerCards];
        newState.opponentCards = [...this.opponentCards];
        newState.playedCards = new Map(this.playedCards);
        newState.currentTurn = this.currentTurn;
        newState.status = this.status;
        newState.lastAction = this.lastAction;
        newState.turnNumber = this.turnNumber;
        return newState;
    }
}

class Game extends EventEmitter {
    constructor(socket) {
        super();
        this.validateSocket(socket);
        
        this.socket = socket;
        this.deck = new Deck();
        this.state = new GameState();
        this.setupSocketListeners();
    }

    validateSocket(socket) {
        if (!socket || typeof socket.emit !== 'function') {
            throw new GameError('Socket invalide ou manquant', 'INVALID_SOCKET');
        }
    }

    setupSocketListeners() {
        this.socket.on('gameStateUpdate', (newState) => {
            this.handleStateUpdate(newState);
        });

        this.socket.on('turnUpdate', (playerId) => {
            this.handleTurnUpdate(playerId);
        });
    }

    // 📌 Initialisation et gestion d'état
    async initializeGame() {
        try {
            console.log('🔄 Initialisation du jeu...');
            
            const initialState = await this.createInitialState();
            this.updateGameState(initialState);
            
            this.state.status = GAME_STATES.INITIALIZED;
            this.emit(GAME_EVENTS.STATE_UPDATED, this.getPublicGameState());
            
            return {
                playerCards: this.state.playerCards,
                opponentCards: this.state.opponentCards
            };
        } catch (error) {
            this.handleError('Échec de l\'initialisation', error);
            throw error;
        }
    }

    async createInitialState() {
        const { joueur1, joueur2 } = this.deck.creerDecksJoueurs();
        return {
            playerCards: joueur1.main,
            opponentCards: joueur2.main,
            currentTurn: this.socket.id,
            status: GAME_STATES.INITIALIZED
        };
    }

    // 📌 Gestion des cartes
    playCard(cardId, slot) {
        try {
            this.validatePlayAction(cardId, slot);

            const card = this.findCard(cardId);
            const newState = this.state.clone();
            
            newState.playedCards.set(slot, card);
            newState.playerCards = this.state.playerCards.filter(c => c.id !== cardId);
            newState.lastAction = { type: 'PLAY', cardId, slot };
            newState.turnNumber++;

            this.updateGameState(newState);
            this.emitCardPlayed(card, slot);

            return {
                success: true,
                card,
                slot,
                newPlayerCards: this.state.playerCards
            };
        } catch (error) {
            this.handleError('Erreur lors du jeu de la carte', error);
            return { success: false, error: error.message };
        }
    }

    validatePlayAction(cardId, slot) {
        if (!this.isPlayerTurn()) {
            throw new GameError('Ce n\'est pas votre tour', 'NOT_YOUR_TURN');
        }
        if (!this.isValidSlot(slot)) {
            throw new GameError('Slot invalide', 'INVALID_SLOT');
        }
        if (!this.isSlotAvailable(slot)) {
            throw new GameError('Slot déjà occupé', 'SLOT_OCCUPIED');
        }
        if (!this.findCard(cardId)) {
            throw new GameError('Carte non trouvée', 'CARD_NOT_FOUND');
        }
    }

    isValidSlot(slot) {
        return typeof slot === 'number' && 
               slot >= 0 && 
               slot < GAME_CONFIG.MAX_SLOTS;
    }

    // 📌 Helpers et utilitaires
    findCard(cardId) {
        return this.state.playerCards.find(card => card.id === cardId);
    }

    isSlotAvailable(slot) {
        return !this.state.playedCards.has(slot);
    }

    isPlayerTurn() {
        return this.state.currentTurn === this.socket.id;
    }

    // 📌 Communication réseau
    emitCardPlayed(card, slot) {
        this.socket.emit(GAME_EVENTS.CARD_PLAYED, {
            cardId: card.id,
            slot,
            cardData: card,
            turnNumber: this.state.turnNumber
        });
    }

    // 📌 Gestion d'état et mise à jour
    updateGameState(newState) {
        const oldState = this.state.clone();
        
        Object.entries(newState).forEach(([key, value]) => {
            if (this.state.hasOwnProperty(key)) {
                this.state[key] = value;
            }
        });

        this.emit(GAME_EVENTS.STATE_UPDATED, {
            oldState,
            newState: this.state.clone()
        });
    }

    handleStateUpdate(newState) {
        try {
            this.validateStateUpdate(newState);
            this.updateGameState(newState);
        } catch (error) {
            this.handleError('Erreur lors de la mise à jour de l\'état', error);
        }
    }

    validateStateUpdate(newState) {
        if (!newState || typeof newState !== 'object') {
            throw new GameError('État invalide', 'INVALID_STATE');
        }
    }

    handleTurnUpdate(playerId) {
        if (typeof playerId !== 'string') {
            this.handleError('ID de joueur invalide', new Error('Invalid player ID'));
            return;
        }
        
        this.state.currentTurn = playerId;
        this.emit(GAME_EVENTS.TURN_CHANGED, playerId);
    }

    // 📌 Gestion des erreurs
    handleError(context, error) {
        const gameError = error instanceof GameError ? error : new GameError(
            error.message,
            'INTERNAL_ERROR'
        );

        console.error(`❌ ${context}:`, gameError);
        this.emit(GAME_EVENTS.ERROR, {
            context,
            error: gameError
        });
    }

    // 📌 État public du jeu
    getPublicGameState() {
        return {
            playedCards: Object.fromEntries(this.state.playedCards),
            currentTurn: this.state.currentTurn,
            status: this.state.status,
            turnNumber: this.state.turnNumber,
            lastAction: this.state.lastAction
        };
    }

    // 📌 Réinitialisation
    reset() {
        console.log('🔄 Réinitialisation du jeu...');
        this.state = new GameState();
        this.emit(GAME_EVENTS.STATE_UPDATED, this.getPublicGameState());
    }
}

export { Game, GAME_STATES, GAME_EVENTS, GameError };