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

// Configuration de Socket.IO
const io = new Server(server, {
    cors: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Middleware pour CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://seriousgame-ds65.onrender.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Servir les fichiers statiques
app.use(express.static('public'));

// Structures de données pour la gestion du jeu
let waitingPlayersCount = 0;
const waitingPlayers = new Map();
const activeGames = new Map();
const playerGameMap = new Map();

// Classe de gestion des parties
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
        this.status = 'waiting';
        this.createdAt = Date.now();
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
            { name: "Soigneur", cost: 2, attack: 1, health: 3, effect: "heal", description: "Soigne les alliés" },
            { name: "Guerrier", cost: 3, attack: 3, health: 3, effect: "damage", description: "Inflige des dégâts" },
            { name: "Défenseur", cost: 1, attack: 1, health: 4, effect: "shield", description: "Protège les alliés" }
        ];
        
        const type = cardTypes[Math.floor(Math.random() * cardTypes.length)];
        return {
            id: Math.random().toString(36).substring(7),
            ...type,
            image: `Cartes/${type.name.toLowerCase()}.png`
        };
    }

    getGameState(forPlayer) {
        const opponent = Array.from(this.players.keys()).find(id => id !== forPlayer);
        
        return {
            id: this.id,
            currentTurn: this.currentTurn,
            status: this.status,
            playerInfo: {
                you: this.players.get(forPlayer),
                opponent: this.players.get(opponent)
            },
            state: {
                yourCards: this.state.cards[forPlayer],
                yourBoard: this.state.board[forPlayer],
                opponentBoard: this.state.board[opponent],
                health: this.state.health
            },
            isYourTurn: this.currentTurn === forPlayer
        };
    }

    playCard(playerId, cardId, position) {
        if (this.currentTurn !== playerId) return false;
        
        const playerCards = this.state.cards[playerId];
        const cardIndex = playerCards.findIndex(card => card.id === cardId);
        
        if (cardIndex === -1) return false;
        if (this.state.board[playerId][position] !== null) return false;
        
        const card = playerCards.splice(cardIndex, 1)[0];
        this.state.board[playerId][position] = card;
        
        // Changer le tour
        const players = Array.from(this.players.keys());
        this.currentTurn = players.find(id => id !== playerId);
        
        return true;
    }

    getOpponent(playerId) {
        return Array.from(this.players.keys()).find(id => id !== playerId);
    }
}

// Nettoyage périodique des parties inactives
setInterval(() => {
    const now = Date.now();
    activeGames.forEach((game, id) => {
        if (now - game.createdAt > 30 * 60 * 1000) { // 30 minutes
            game.players.forEach((player) => {
                playerGameMap.delete(player.socketId);
            });
            activeGames.delete(id);
        }
    });
}, 5 * 60 * 1000); // Vérifier toutes les 5 minutes

// Configuration des événements Socket.IO
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    socket.on('joinRandomGame', (playerData) => {
        const player = {
            socketId: socket.id,
            name: playerData.name,
            avatar: playerData.avatar
        };

        // Vérifier si le joueur est déjà dans une partie
        if (playerGameMap.has(socket.id)) {
            socket.emit('error', { message: 'Vous êtes déjà dans une partie' });
            return;
        }

        if (waitingPlayers.size > 0) {
            // Trouver un adversaire
            const [opponentId, opponentData] = Array.from(waitingPlayers.entries())[0];
            waitingPlayers.delete(opponentId);
            waitingPlayersCount--;
            io.emit('waitingPlayersUpdate', waitingPlayersCount);

            // Créer la partie
            const game = new Game(opponentData);
            game.addPlayer(player);
            activeGames.set(game.id, game);

            // Associer les joueurs à la partie
            playerGameMap.set(socket.id, game.id);
            playerGameMap.set(opponentId, game.id);

            // Notifier les joueurs
            io.to(socket.id).emit('gameStart', game.getGameState(socket.id));
            io.to(opponentId).emit('gameStart', game.getGameState(opponentId));
        } else {
            waitingPlayers.set(socket.id, player);
            waitingPlayersCount++;
            io.emit('waitingPlayersUpdate', waitingPlayersCount);
            socket.emit('waiting');
        }
    });

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

        game.players.forEach((_, playerId) => {
            io.to(playerId).emit('gameStart', game.getGameState(playerId));
        });
    });

    socket.on('playCard', ({ cardId, position }) => {
        const gameId = playerGameMap.get(socket.id);
        if (!gameId) return;

        const game = activeGames.get(gameId);
        if (!game || !game.playCard(socket.id, cardId, position)) return;

        // Notifier les joueurs
        game.players.forEach((_, playerId) => {
            io.to(playerId).emit('gameStateUpdate', game.getGameState(playerId));
        });
    });

    socket.on('disconnect', () => {
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
                game.players.forEach((player) => {
                    playerGameMap.delete(player.socketId);
                });
                activeGames.delete(gameId);
            }
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
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Serveur arrêté gracieusement');
        process.exit(0);
    });
});