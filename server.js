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
        origin: "https://seriousgame-ds65.onrender.com:1000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware pour CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://seriousgame-ds65.onrender.com:1000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Configuration pour servir les fichiers statiques
app.use(express.static(join(__dirname, 'public')));

// Routes spécifiques pour les ressources CSS et JS
app.get('/css/:file', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'css', req.params.file));
});

app.get('/js/:file', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'js', req.params.file));
});

// Routes pour les images
app.get('/Avatars/:file', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'Avatars', req.params.file));
});

app.get('/Cartes/:file', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'Cartes', req.params.file));
});

// Route pour le favicon
app.get('/favicon_io/:file', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'favicon_io', req.params.file));
});

// Reste du code serveur...

// Route pour toutes les autres requêtes HTML
app.get('/*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
const PORT = process.env.PORT || 1000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

// Servir les fichiers statiques
app.use(express.static(join(__dirname, 'public')));

// Structures de données pour la gestion du jeu
const waitingPlayers = new Map();
const games = new Map();
const playerSessions = new Map();

// Classe pour gérer une partie
class Game {
    constructor(id, player1) {
        this.id = id;
        this.players = new Map([[player1.id, player1]]);
        this.currentTurn = null;
        this.state = {
            board: {
                [player1.id]: Array(5).fill(null),
            },
            health: {
                [player1.id]: 100
            },
            hands: {
                [player1.id]: []
            }
        };
        this.started = false;
    }

    addPlayer(player) {
        if (this.players.size >= 2) return false;
        this.players.set(player.id, player);
        this.state.board[player.id] = Array(5).fill(null);
        this.state.health[player.id] = 100;
        this.state.hands[player.id] = [];
        return true;
    }

    startGame() {
        if (this.players.size !== 2 || this.started) return false;
        this.started = true;
        this.currentTurn = Array.from(this.players.keys())[Math.floor(Math.random() * 2)];
        for (const playerId of this.players.keys()) {
            this.dealInitialHand(playerId);
        }
        return true;
    }

    dealInitialHand(playerId) {
        const initialCards = this.generateInitialHand();
        this.state.hands[playerId] = initialCards;
        return initialCards;
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
            id: Math.random().toString(36).substr(2, 9),
            ...type,
            image: `/cards/${type.name.toLowerCase()}.jpg`
        };
    }

    playCard(playerId, cardId, position) {
        if (!this.isPlayerTurn(playerId)) return false;
        const hand = this.state.hands[playerId];
        const cardIndex = hand.findIndex(card => card.id === cardId);
        if (cardIndex === -1) return false;

        const card = hand[cardIndex];
        hand.splice(cardIndex, 1);
        this.state.board[playerId][position] = card;
        
        this.changeTurn();
        return true;
    }

    isPlayerTurn(playerId) {
        return this.currentTurn === playerId;
    }

    changeTurn() {
        const players = Array.from(this.players.keys());
        this.currentTurn = this.currentTurn === players[0] ? players[1] : players[0];
    }

    getOpponent(playerId) {
        const playerIds = Array.from(this.players.keys());
        return playerIds.find(id => id !== playerId);
    }

    toJSON() {
        return {
            id: this.id,
            players: Object.fromEntries(this.players),
            currentTurn: this.currentTurn,
            state: this.state,
            started: this.started
        };
    }
}

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    // Rejoindre une partie aléatoire
    socket.on('joinRandomGame', (playerData) => {
        const player = { id: socket.id, ...playerData };
        
        if (waitingPlayers.size > 0) {
            const [opponentId, opponentData] = Array.from(waitingPlayers.entries())[0];
            waitingPlayers.delete(opponentId);
            
            const gameId = Math.random().toString(36).substr(2, 9);
            const game = new Game(gameId, opponentData);
            game.addPlayer(player);
            
            game.startGame();
            games.set(gameId, game);
            
            playerSessions.set(socket.id, gameId);
            playerSessions.set(opponentId, gameId);
            
            io.to(socket.id).emit('gameStart', game.toJSON());
            io.to(opponentId).emit('gameStart', game.toJSON());
        } else {
            waitingPlayers.set(socket.id, player);
            socket.emit('waiting');
        }
    });

    // Créer une partie privée
    socket.on('createRoom', (playerData) => {
        const player = { id: socket.id, ...playerData };
        const gameId = Math.floor(1000 + Math.random() * 9000).toString();
        const game = new Game(gameId, player);
        games.set(gameId, game);
        playerSessions.set(socket.id, gameId);
        socket.emit('roomCreated', { gameId, game: game.toJSON() });
    });

    // Rejoindre une partie privée
    socket.on('joinRoom', ({ gameId, playerData }) => {
        const game = games.get(gameId);
        if (!game || game.players.size >= 2) {
            socket.emit('roomError', { message: 'Room invalide ou pleine' });
            return;
        }

        const player = { id: socket.id, ...playerData };
        if (game.addPlayer(player)) {
            playerSessions.set(socket.id, gameId);
            game.startGame();
            
            for (const playerId of game.players.keys()) {
                io.to(playerId).emit('gameStart', game.toJSON());
            }
        }
    });

    // Jouer une carte
    socket.on('playCard', ({ cardId, position }) => {
        const gameId = playerSessions.get(socket.id);
        if (!gameId) return;

        const game = games.get(gameId);
        if (!game || !game.isPlayerTurn(socket.id)) return;

        if (game.playCard(socket.id, cardId, position)) {
            for (const playerId of game.players.keys()) {
                io.to(playerId).emit('gameStateUpdate', game.toJSON());
            }
        }
    });

    // Déconnexion
    socket.on('disconnect', () => {
        waitingPlayers.delete(socket.id);
        
        const gameId = playerSessions.get(socket.id);
        if (gameId) {
            const game = games.get(gameId);
            if (game) {
                const opponent = game.getOpponent(socket.id);
                if (opponent) {
                    io.to(opponent).emit('opponentLeft');
                }
                games.delete(gameId);
            }
            playerSessions.delete(socket.id);
        }
    });
});

// Routes Express
app.get('/*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
const PORT = process.env.PORT || 1000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});