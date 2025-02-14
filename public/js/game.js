// ✅ Importation correcte du deck
import Deck from './deck.js'; 
import socket from './websocket.js'; // Assure-toi que `socket.js` est bien géré comme un module

// ✅ Création de l'instance du deck (évite les problèmes de référence)
const deckInstance = new Deck();

class Game {
    constructor(socket) {
        if (!socket) {
            throw new Error('⚠️ Socket est requis pour initialiser le jeu');
        }

        this.socket = socket;
        this.deck = deckInstance; // Utilisation directe de l'instance
        this.gameState = {
            playerCards: [],
            opponentCards: [],
            playedCards: new Map(),
            currentTurn: null,
            isInitialized: false
        };
    }

    /**
     * ✅ Initialise la partie et retourne les mains des joueurs.
     */
    initializeGame() {
        try {
            console.log('🔄 Initialisation du jeu...');
            const partieInitiale = this.deck.creerDecksJoueurs();

            this.gameState = {
                ...this.gameState,
                playerCards: partieInitiale.joueur1.main,
                opponentCards: partieInitiale.joueur2.main,
                isInitialized: true
            };

            console.log('🃏 Mains initialisées:', {
                player: this.gameState.playerCards,
                opponent: this.gameState.opponentCards
            });

            return {
                playerCards: this.gameState.playerCards,
                opponentCards: this.gameState.opponentCards
            };
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du jeu:', error);
            throw new Error('Échec de l\'initialisation du jeu');
        }
    }

    /**
     * ✅ Joue une carte et met à jour l'état du jeu.
     */
    playCard(cardId, slot) {
        try {
            if (!this.validateCardPlay(cardId, slot)) {
                return false;
            }

            const card = this.findCard(cardId);
            if (!card) return false;

            this.gameState.playedCards.set(slot, card);
            this.removeCardFromHand(cardId);

            // 🎯 Émet l'événement au serveur
            this.emitCardPlayed(card, slot);

            console.log(`🃏 Carte jouée: ${card.name} sur slot ${slot}`);

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

    /**
     * ✅ Vérifie si le jeu d'une carte est valide.
     */
    validateCardPlay(cardId, slot) {
        return cardId && 
               slot && 
               !this.gameState.playedCards.has(slot) &&
               this.findCard(cardId) !== undefined;
    }

    /**
     * ✅ Trouve une carte dans la main du joueur.
     */
    findCard(cardId) {
        return this.gameState.playerCards.find(card => card.id === cardId);
    }

    /**
     * ✅ Retire une carte de la main du joueur.
     */
    removeCardFromHand(cardId) {
        this.gameState.playerCards = this.gameState.playerCards.filter(
            card => card.id !== cardId
        );
    }

    /**
     * ✅ Envoie un événement au serveur lorsqu'une carte est jouée.
     */
    emitCardPlayed(card, slot) {
        this.socket.emit('cardPlayed', {
            cardId: card.id,
            slot: slot,
            cardData: card
        });
    }

    /**
     * ✅ Retourne les cartes jouées.
     */
    getPlayedCards() {
        return Object.fromEntries(this.gameState.playedCards);
    }

    /**
     * ✅ Retourne les cartes du joueur actuel.
     */
    getCurrentPlayerCards() {
        return this.gameState.playerCards;
    }

    /**
     * ✅ Retourne les cartes de l'adversaire.
     */
    getCurrentOpponentCards() {
        return this.gameState.opponentCards;
    }

    /**
     * ✅ Définit le tour en cours.
     */
    setCurrentTurn(socketId) {
        this.gameState.currentTurn = socketId;
    }

    /**
     * ✅ Vérifie si c'est le tour du joueur.
     */
    isPlayerTurn() {
        return this.gameState.currentTurn === this.socket.id;
    }

    /**
     * ✅ Met à jour l'état du jeu après un événement serveur.
     */
    updateGameState(newState) {
        try {
            if (!newState) return;

            Object.entries(newState).forEach(([key, value]) => {
                if (this.gameState.hasOwnProperty(key)) {
                    this.gameState[key] = value;
                }
            });

            console.log('🔄 État du jeu mis à jour:', this.gameState);
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de l\'état:', error);
            throw new Error('Échec de la mise à jour de l\'état du jeu');
        }
    }

    /**
     * ✅ Réinitialise le jeu.
     */
    reset() {
        console.log('🔄 Réinitialisation du jeu...');
        this.gameState = {
            playerCards: [],
            opponentCards: [],
            playedCards: new Map(),
            currentTurn: null,
            isInitialized: false
        };
    }

    /**
     * ✅ Vérifie si une carte peut être jouée.
     */
    isCardPlayable(cardId) {
        if (!this.isPlayerTurn()) return false;
        return this.findCard(cardId) !== undefined;
    }

    /**
     * ✅ Vérifie si un slot est disponible.
     */
    isSlotAvailable(slot) {
        return !this.gameState.playedCards.has(slot);
    }
}

// ✅ Exportation correcte de la classe Game
export default Game;