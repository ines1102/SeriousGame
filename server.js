// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Configuration de Socket.IO avec CORS
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware pour CORS et JSON
app.use(express.json());
app.use(express.static('public'));

// Structures de données pour la gestion du jeu
let waitingPlayersCount = 0;
const waitingPlayers = new Map(); // Joueurs en attente
const activeGames = new Map();    // Parties en cours
const playerGameMap = new Map();  // Association joueur -> partie

// Classe pour gérer l'état d'une partie
class Game {
    constructor(player1) {
        this.id = Math.random().toString(36).substring(7);
        this.players = new Map([[player1.socketId, player1]]);
        this.state = {
            board: {
                [player1.socketId]: Array(5).fill(null)
            },
            health: {
                [player1.socketId]: 100
            },
            cards: {
                [player1.socketId]: this.generateInitialHand()
            }
        };
        this.currentTurn = null;
        this.status = 'waiting'; // waiting, playing, finished
    }

    addPlayer(player) {
        if (this.players.size >= 2) return false;
        
        this.players.set(player.socketId, player);
        this.state.board[player.socketId] = Array(5).fill(null);
        this.state.health[player.socketId] = 100;
        this.state.cards[player.socketId] = this.generateInitialHand();
        
        if (this.players.size === 2) {
            this.status = 'playing';
            this.currentTurn = Array.from(this.players.keys())[Math.floor(Math.random() * 2)];
        }
        
        return true;
    }

    generateInitialHand() {
        return Array(5).fill(null).map(() => this.generateCard());
    }

    generateCard() {
        const cardTypes = [
            { name: "Soigneur", cost: 2, attack: 1, health: 3, effect: "heal" },
            { name: "Guerrier", cost: 3, attack: 3, health: 3, effect: "damage" },
            { name: "Défenseur", cost: 1, attack: 1, health: 4, effect: "shield" }
        ];
        
        const type = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        return {
            id: Math.random().toString(36).substring(7),
            ...type,
            image: `Cartes/${type.name.toLowerCase()}.png`
        };
    }

    getGameState(forPlayer) {
        return {
            id: this.id,
            currentTurn: this.currentTurn,
            status: this.status,
            players: Array.from(this.players.values()).map(p => ({
                id: p.socketId,
                name: p.name,
                avatar: p.avatar
            })),
            yourCards: this.state.cards[forPlayer],
            board: this.state.board,
            health: this.state.health
        };
    }

    getOpponent(playerId) {
        return Array.from(this.players.keys()).find(id => id !== playerId);
    }
}

// Configuration des événements Socket.IO
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    // Gestion du matchmaking aléatoire
    socket.on('joinRandomGame', (playerData) => {
        const player = {
            socketId: socket.id,
            name: playerData.name,
            avatar: playerData.avatar
        };

        if (waitingPlayers.size > 0) {
            // Trouver un adversaire
            const [opponentId, opponentData] = Array.from(waitingPlayers.entries())[0];
            waitingPlayers.delete(opponentId);
            waitingPlayersCount--;
            io.emit('waitingPlayersUpdate', waitingPlayersCount);

            // Créer une nouvelle partie
            const game = new Game(opponentData);
            game.addPlayer(player);
            activeGames.set(game.id, game);

            // Associer les joueurs à la partie
            playerGameMap.set(socket.id, game.id);
            playerGameMap.set(opponentId, game.id);

            // Notifier les deux joueurs
            io.to(socket.id).emit('gameStart', game.getGameState(socket.id));
            io.to(opponentId).emit('gameStart', game.getGameState(opponentId));
        } else {
            // Mettre le joueur en attente
            waitingPlayers.set(socket.id, player);
            waitingPlayersCount++;
            io.emit('waitingPlayersUpdate', waitingPlayersCount);
            socket.emit('waiting');
        }
    });

    // Création d'une room privée
    socket.on('createRoom', (playerData) => {
        const player = {
            socketId: socket.id,
            name: playerData.name,
            avatar: playerData.avatar
        };

        const game = new Game(player);
        activeGames.set(game.id, game);
        playerGameMap.set(socket.id, game.id);

        socket.emit('roomCreated', {
            roomId: game.id,
            gameState: game.getGameState(socket.id)
        });
    });

    // Rejoindre une room privée
    socket.on('joinRoom', ({ roomId, playerData }) => {
        const game = activeGames.get(roomId);
        
        if (!game) {
            socket.emit('roomError', { message: 'Room introuvable' });
            return;
        }

        if (game.players.size >= 2) {
            socket.emit('roomError', { message: 'Room pleine' });
            return;
        }

        const player = {
            socketId: socket.id,
            name: playerData.name,
            avatar: playerData.avatar
        };

        game.addPlayer(player);
        playerGameMap.set(socket.id, game.id);

        // Notifier les deux joueurs
        game.players.forEach((_, playerId) => {
            io.to(playerId).emit('gameStart', game.getGameState(playerId));
        });
    });

    // Jouer une carte
    socket.on('playCard', ({ cardId, position }) => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId) return;

        const game = activeGames.get(gameId);
        if (!game || game.currentTurn !== socket.id) return;

        const playerCards = game.state.cards[socket.id];
        const cardIndex = playerCards.findIndex(card => card.id === cardId);
        
        if (cardIndex === -1) return;

        // Placer la carte sur le plateau
        const card = playerCards.splice(cardIndex, 1)[0];
        game.state.board[socket.id][position] = card;

        // Changer le tour
        game.currentTurn = game.getOpponent(socket.id);

        // Notifier les joueurs
        game.players.forEach((_, playerId) => {
            io.to(playerId).emit('gameStateUpdate', game.getGameState(playerId));
        });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        console.log('Joueur déconnecté:', socket.id);

        // Nettoyer le matchmaking
        if (waitingPlayers.has(socket.id)) {
            waitingPlayers.delete(socket.id);
            waitingPlayersCount--;
            io.emit('waitingPlayersUpdate', waitingPlayersCount);
        }

        // Nettoyer les parties en cours
        const gameId = playerGameMap.get(socket.id);
        if (gameId) {
            const game = activeGames.get(gameId);
            if (game) {
                const opponent = game.getOpponent(socket.id);
                if (opponent) {
                    io.to(opponent).emit('opponentLeft', {
                        message: 'Votre adversaire s\'est déconnecté'
                    });
                }
                activeGames.delete(gameId);
            }
            playerGameMap.delete(socket.id);
        }
    });
});

// Routes Express
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        waitingPlayers: waitingPlayersCount,
        activeGames: activeGames.size
    });
});

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 1000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Serveur arrêté');
        process.exit(0);
    });
});