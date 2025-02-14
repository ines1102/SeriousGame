// Imports
import deckInstance, { Deck } from './deck.js';

class Game {
    constructor(socket) {
        if (!socket) {
            throw new Error('Socket est requis pour initialiser le jeu');
        }

        this.socket = socket;
        this.deck = deckInstance; // Utilisation de l'instance exportée
        this.gameState = {
            playerCards: [],
            opponentCards: [],
            playedCards: new Map(),
            currentTurn: null,
            isInitialized: false
        };
    }

    initializeGame() {
        try {
            const partieInitiale = this.deck.initialiserPartie();
            
            this.gameState = {
                ...this.gameState,
                playerCards: partieInitiale.joueur1.main,
                opponentCards: partieInitiale.joueur2.main,
                isInitialized: true
            };

            return {
                playerCards: this.gameState.playerCards,
                opponentCards: this.gameState.opponentCards
            };
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du jeu:', error);
            throw new Error('Échec de l\'initialisation du jeu');
        }
    }

    playCard(cardId, slot) {
        try {
            if (!this.validateCardPlay(cardId, slot)) {
                return false;
            }

            const card = this.findCard(cardId);
            if (!card) return false;

            this.gameState.playedCards.set(slot, card);
            this.removeCardFromHand(cardId);

            // Émettre l'événement au serveur
            this.emitCardPlayed(card, slot);

            return {
                success: true,
                card,
                slot,
                newPlayerCards: this.gameState.playerCards
            };
        } catch (error) {
            console.error('❌ Erreur lors du jeu de la carte:', error);
            return false;
        }
    }

    validateCardPlay(cardId, slot) {
        return cardId && 
               slot && 
               !this.gameState.playedCards.has(slot) &&
               this.findCard(cardId) !== undefined;
    }

    findCard(cardId) {
        return this.gameState.playerCards.find(card => card.id === cardId);
    }

    removeCardFromHand(cardId) {
        this.gameState.playerCards = this.gameState.playerCards.filter(
            card => card.id !== cardId
        );
    }

    emitCardPlayed(card, slot) {
        this.socket.emit('cardPlayed', {
            cardId: card.id,
            slot: slot,
            cardData: card
        });
    }

    // Getters
    getPlayedCards() {
        return Object.fromEntries(this.gameState.playedCards);
    }

    getCurrentPlayerCards() {
        return this.gameState.playerCards;
    }

    getCurrentOpponentCards() {
        return this.gameState.opponentCards;
    }

    // Méthodes pour la gestion du tour
    setCurrentTurn(socketId) {
        this.gameState.currentTurn = socketId;
    }

    isPlayerTurn() {
        return this.gameState.currentTurn === this.socket.id;
    }

    // Méthode pour mettre à jour l'état après un événement serveur
    updateGameState(newState) {
        try {
            if (!newState) return;

            // Mise à jour sélective des propriétés
            Object.entries(newState).forEach(([key, value]) => {
                if (this.gameState.hasOwnProperty(key)) {
                    this.gameState[key] = value;
                }
            });
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de l\'état:', error);
            throw new Error('Échec de la mise à jour de l\'état du jeu');
        }
    }

    // Méthode pour réinitialiser le jeu
    reset() {
        this.gameState = {
            playerCards: [],
            opponentCards: [],
            playedCards: new Map(),
            currentTurn: null,
            isInitialized: false
        };
    }

    // Méthodes de validation
    isCardPlayable(cardId) {
        if (!this.isPlayerTurn()) return false;
        return this.findCard(cardId) !== undefined;
    }

    isSlotAvailable(slot) {
        return !this.gameState.playedCards.has(slot);
    }
}

// Export de la classe Game
export default Game;