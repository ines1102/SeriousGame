// 📌 Types de cartes et configuration
const CARD_TYPES = {
    MALADIE: 'maladie',
    REMEDE: 'remede',
    BONUS: 'bonus',
    MALUS: 'malus',
    SUPPORTER: 'supporter'
};

const DECK_CONFIG = {
    INITIAL_HAND_SIZE: 5,
    TOTAL_DECK_SIZE: 25,
    DISTRIBUTION: {
        MALADIES: 7,
        BONUS: 3,
        MALUS: 3,
        SUPPORTERS: 5
    }
};

class Card {
    constructor(name, rarity, type) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.rarity = rarity;
        this.type = type;
    }

    static fromTemplate(template, type) {
        return new Card(template.name, template.rarity, type);
    }
}

class Deck {
    constructor() {
        this.cardCollections = this.initializeCardCollections();
        this.remedesMap = this.initializeRemedesMap();
    }

    initializeCardCollections() {
        return {
            [CARD_TYPES.MALADIE]: [
                { name: 'Cartes/Maladie/Allergies.png', rarity: 2 },
                { name: 'Cartes/Maladie/Asthme.png', rarity: 2 },
                { name: 'Cartes/Maladie/Cancer.png', rarity: 4 },
                { name: 'Cartes/Maladie/Gastro.png', rarity: 1 },
                { name: 'Cartes/Maladie/Grippe.png', rarity: 1 },
                { name: 'Cartes/Maladie/Immuno.png', rarity: 4 },
                { name: 'Cartes/Maladie/Rhume.png', rarity: 1 }
            ],
            [CARD_TYPES.BONUS]: [
                { name: 'Cartes/Bonus/Prise_de_sang.png', rarity: 4 },
                { name: 'Cartes/Bonus/Sieste.png', rarity: 2 },
                { name: 'Cartes/Bonus/Soupe.jpg', rarity: 1 },
                { name: 'Cartes/Bonus/Vaccin.png', rarity: 3 },
                { name: 'Cartes/Bonus/bisousmagique.png', rarity: 4 }
            ],
            [CARD_TYPES.MALUS]: [
                { name: 'Cartes/Malus/Coin.png', rarity: 1 },
                { name: 'Cartes/Malus/Greve.png', rarity: 4 },
                { name: 'Cartes/Malus/PanneServeur.png', rarity: 3 },
                { name: 'Cartes/Malus/PerteDossier.png', rarity: 1 },
                { name: 'Cartes/Malus/Poulet.png', rarity: 3 }
            ],
            [CARD_TYPES.SUPPORTER]: [
                { name: 'Cartes/Supporter/Maman.jpg', rarity: 4 },
                { name: 'Cartes/Supporter/chirurgien.png', rarity: 3 },
                { name: 'Cartes/Supporter/generaliste.jpg', rarity: 1 },
                { name: 'Cartes/Supporter/hackeur.png', rarity: 4 },
                { name: 'Cartes/Supporter/infirmiere.jpg', rarity: 1 },
                { name: 'Cartes/Supporter/ingecyber.jpg', rarity: 2 },
                { name: 'Cartes/Supporter/kine.png', rarity: 2 },
                { name: 'Cartes/Supporter/pneumologue.png', rarity: 2 }
            ]
        };
    }

    initializeRemedesMap() {
        return new Map([
            ['Cartes/Maladie/Allergies.png', { name: 'Cartes/Remedes/Anti-inflammatoire.png', rarity: 1 }],
            ['Cartes/Maladie/Asthme.png', { name: 'Cartes/Remedes/Ventoline.png', rarity: 2 }],
            ['Cartes/Maladie/Cancer.png', { name: 'Cartes/Remedes/Chimio.png', rarity: 4 }],
            ['Cartes/Maladie/Gastro.png', { name: 'Cartes/Remedes/AntiHistamminiques.png', rarity: 2 }],
            ['Cartes/Maladie/Grippe.png', { name: 'Cartes/Remedes/Doliprane.png', rarity: 1 }],
            ['Cartes/Maladie/Immuno.png', { name: 'Cartes/Remedes/Greffe.png', rarity: 4 }],
            ['Cartes/Maladie/Rhume.png', { name: 'Cartes/Remedes/Antibiotique.png', rarity: 1 }]
        ]);
    }

    shuffle(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    drawCardWithRarity(cards, type) {
        const totalWeight = cards.reduce((acc, card) => acc + card.rarity, 0);
        let threshold = Math.random() * totalWeight;

        for (const cardTemplate of cards) {
            threshold -= cardTemplate.rarity;
            if (threshold <= 0) {
                return Card.fromTemplate(cardTemplate, type);
            }
        }

        return Card.fromTemplate(cards[0], type);
    }

    createPlayerDecks() {
        try {
            const decks = this.initializeDecks();
            this.distributeMaladiesAndRemedes(decks);
            this.distributeRemainingCards(decks);
            return this.finalizeDecks(decks);
        } catch (error) {
            console.error('Erreur lors de la création des decks:', error);
            throw new Error('Impossible de créer les decks des joueurs');
        }
    }

    initializeDecks() {
        return {
            joueur1: {
                deck: [],
                main: [],
                usedMaladies: new Set()
            },
            joueur2: {
                deck: [],
                main: []
            }
        };
    }

    distributeMaladiesAndRemedes(decks) {
        for (let i = 0; i < DECK_CONFIG.DISTRIBUTION.MALADIES; i++) {
            const maladie = this.drawCardWithRarity(
                this.cardCollections[CARD_TYPES.MALADIE],
                CARD_TYPES.MALADIE
            );

            const remede = this.remedesMap.get(maladie.name);
            if (remede) {
                decks.joueur1.deck.push(maladie);
                decks.joueur1.usedMaladies.add(maladie.name);
                decks.joueur2.deck.push(new Card(remede.name, remede.rarity, CARD_TYPES.REMEDE));
            }
        }
    }

    distributeRemainingCards(decks) {
        // Distribution des cartes bonus, malus et supporters pour joueur 1
        this.distributeCardType(decks.joueur1.deck, CARD_TYPES.BONUS, DECK_CONFIG.DISTRIBUTION.BONUS);
        this.distributeCardType(decks.joueur1.deck, CARD_TYPES.MALUS, DECK_CONFIG.DISTRIBUTION.MALUS);
        this.distributeCardType(decks.joueur1.deck, CARD_TYPES.SUPPORTER, DECK_CONFIG.DISTRIBUTION.SUPPORTERS);

        // Compléter les decks jusqu'à la taille requise
        this.fillDeckToSize(decks.joueur1, decks.joueur2);
    }

    distributeCardType(deck, type, count) {
        for (let i = 0; i < count; i++) {
            deck.push(this.drawCardWithRarity(this.cardCollections[type], type));
        }
    }

    fillDeckToSize(joueur1, joueur2) {
        while (joueur1.deck.length < DECK_CONFIG.TOTAL_DECK_SIZE) {
            const maladie = this.drawCardWithRarity(
                this.cardCollections[CARD_TYPES.MALADIE],
                CARD_TYPES.MALADIE
            );

            if (!joueur1.usedMaladies.has(maladie.name)) {
                const remede = this.remedesMap.get(maladie.name);
                if (remede) {
                    joueur1.deck.push(maladie);
                    joueur2.deck.push(new Card(remede.name, remede.rarity, CARD_TYPES.REMEDE));
                }
            }
        }

        while (joueur2.deck.length < DECK_CONFIG.TOTAL_DECK_SIZE) {
            joueur2.deck.push(this.drawCardWithRarity(
                this.cardCollections[Math.random() < 0.4 ? CARD_TYPES.BONUS : CARD_TYPES.SUPPORTER],
                Math.random() < 0.4 ? CARD_TYPES.BONUS : CARD_TYPES.SUPPORTER
            ));
        }
    }

    finalizeDecks(decks) {
        return {
            joueur1: {
                deck: this.shuffle(decks.joueur1.deck),
                main: decks.joueur1.deck.slice(0, DECK_CONFIG.INITIAL_HAND_SIZE)
            },
            joueur2: {
                deck: this.shuffle(decks.joueur2.deck),
                main: decks.joueur2.deck.slice(0, DECK_CONFIG.INITIAL_HAND_SIZE)
            }
        };
    }
}

export { Deck, CARD_TYPES, DECK_CONFIG };