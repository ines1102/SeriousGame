export default class Deck {
    constructor() {
        this.maladies = [
            { name: 'Cartes/Maladie/Allergies.png', rarity: 2 },
            { name: 'Cartes/Maladie/Asthme.png', rarity: 2 },
            { name: 'Cartes/Maladie/Cancer.png', rarity: 4 },
            { name: 'Cartes/Maladie/Gastro.png', rarity: 1 },
            { name: 'Cartes/Maladie/Grippe.png', rarity: 1 },
            { name: 'Cartes/Maladie/Immuno.png', rarity: 4 },
            { name: 'Cartes/Maladie/Rhume.png', rarity: 1 }
        ];

        this.remedes = new Map([
            ['Cartes/Maladie/Allergies.png', { name: 'Cartes/Remedes/Anti-inflammatoire.png', rarity: 1 }],
            ['Cartes/Maladie/Asthme.png', { name: 'Cartes/Remedes/Ventoline.png', rarity: 2 }],
            ['Cartes/Maladie/Cancer.png', { name: 'Cartes/Remedes/Chimio.png', rarity: 4 }],
            ['Cartes/Maladie/Gastro.png', { name: 'Cartes/Remedes/AntiHistamminiques.png', rarity: 2 }],
            ['Cartes/Maladie/Grippe.png', { name: 'Cartes/Remedes/Doliprane.png', rarity: 1 }],
            ['Cartes/Maladie/Immuno.png', { name: 'Cartes/Remedes/Greffe.png', rarity: 4 }],
            ['Cartes/Maladie/Rhume.png', { name: 'Cartes/Remedes/Antibiotique.png', rarity: 1 }]
        ]);

        this.bonus = [
            { name: 'Cartes/Bonus/Prise_de_sang.png', rarity: 4 },
            { name: 'Cartes/Bonus/Sieste.png', rarity: 2 },
            { name: 'Cartes/Bonus/Soupe.jpg', rarity: 1 },
            { name: 'Cartes/Bonus/Vaccin.png', rarity: 3 },
            { name: 'Cartes/Bonus/bisousmagique.png', rarity: 4 }
        ];

        this.malus = [
            { name: 'Cartes/Malus/Coin.png', rarity: 1 },
            { name: 'Cartes/Malus/Greve.png', rarity: 4 },
            { name: 'Cartes/Malus/PanneServeur.png', rarity: 3 },
            { name: 'Cartes/Malus/PerteDossier.png', rarity: 1 },
            { name: 'Cartes/Malus/Poulet.png', rarity: 3 }
        ];

        this.supporters = [
            { name: 'Cartes/Supporter/Maman.jpg', rarity: 4 },
            { name: 'Cartes/Supporter/chirurgien.png', rarity: 3 },
            { name: 'Cartes/Supporter/generaliste.jpg', rarity: 1 },
            { name: 'Cartes/Supporter/hackeur.png', rarity: 4 },
            { name: 'Cartes/Supporter/infirmiere.jpg', rarity: 1 },
            { name: 'Cartes/Supporter/ingecyber.jpg', rarity: 2 },
            { name: 'Cartes/Supporter/kine.png', rarity: 2 },
            { name: 'Cartes/Supporter/pneumologue.png', rarity: 2 }
        ];
    }

    /**
     * Mélange un tableau de cartes
     */
    melanger(deck) {
        return [...deck].sort(() => Math.random() - 0.5);
    }

    /**
     * Tire une carte en fonction de sa rareté
     */
    tirerCarteAvecRareté(cartes) {
        const totalPoids = cartes.reduce((acc, carte) => acc + carte.rarity, 0);
        let seuil = Math.random() * totalPoids;

        for (const carte of cartes) {
            seuil -= carte.rarity;
            if (seuil <= 0) {
                return { ...carte, id: crypto.randomUUID() };
            }
        }

        return { ...cartes[0], id: crypto.randomUUID() };
    }

    /**
     * Génère un deck de 25 cartes pour chaque joueur et affiche les decks dans le terminal.
     */
    creerDecksJoueurs() {
        const deckJoueur1 = [];
        const deckJoueur2 = [];
        const maladiesChoisies = [];

        console.log("\n🔵 Génération des decks des joueurs...\n");

        // Ajout de 7 maladies et leurs remèdes obligatoires
        for (let i = 0; i < 7; i++) {
            const maladie = this.tirerCarteAvecRareté(this.maladies);
            const remede = this.remedes.get(maladie.name);

            if (remede) {
                maladiesChoisies.push(maladie);
                deckJoueur1.push(maladie);
                deckJoueur2.push({ ...remede, id: crypto.randomUUID() });
            }
        }

        // Ajout de 3 bonus et 3 malus
        for (let i = 0; i < 3; i++) {
            deckJoueur1.push(this.tirerCarteAvecRareté(this.bonus));
            deckJoueur1.push(this.tirerCarteAvecRareté(this.malus));
        }

        // Ajout de 5 supporters
        for (let i = 0; i < 5; i++) {
            deckJoueur1.push(this.tirerCarteAvecRareté(this.supporters));
        }

        // Compléter le deck jusqu'à 25 cartes
        while (deckJoueur1.length < 25) {
            const maladie = this.tirerCarteAvecRareté(this.maladies);
            if (!maladiesChoisies.find(m => m.name === maladie.name)) {
                const remede = this.remedes.get(maladie.name);
                if (remede) {
                    deckJoueur1.push(maladie);
                    deckJoueur2.push({ ...remede, id: crypto.randomUUID() });
                }
            }
        }

        // Ajouter quelques bonus/malus/supporters dans le deck du joueur 2 pour équilibrer
        while (deckJoueur2.length < 25) {
            deckJoueur2.push(this.tirerCarteAvecRareté(this.bonus));
            deckJoueur2.push(this.tirerCarteAvecRareté(this.malus));
            deckJoueur2.push(this.tirerCarteAvecRareté(this.supporters));
        }

        // Mélanger les decks
        const finalDeck1 = this.melanger(deckJoueur1);
        const finalDeck2 = this.melanger(deckJoueur2);

        console.log("\n📜 Deck du Joueur 1 :\n", finalDeck1.map(c => c.name));
        console.log("\n📜 Deck du Joueur 2 :\n", finalDeck2.map(c => c.name));

        return {
            joueur1: {
                deck: finalDeck1,
                main: finalDeck1.slice(0, 5) // 5 cartes en main
            },
            joueur2: {
                deck: finalDeck2,
                main: finalDeck2.slice(0, 5) // 5 cartes en main
            }
        };
    }
}