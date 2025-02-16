import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
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

// Middleware de sécurité et de parsing
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://seriousgame-ds65.onrender.com"],
            connectSrc: ["'self'", "https://seriousgame-ds65.onrender.com", "wss://seriousgame-ds65.onrender.com"],
            imgSrc: ["'self'", "data:"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"]
        }
    }
}));app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
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
            board: { [player1.socketId]: Array(5).fill(null) },
            health: { [player1.socketId]: 100 },
            cards: { [player1.socketId]: this.generateInitialHand() }
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
        return { 
            id: Math.random().toString(36).substring(7), 
            ...cardTypes[Math.floor(Math.random() * cardTypes.length)], 
            image: `Cartes/${cardTypes.name.toLowerCase()}.png` 
        };
    }

    getOpponent(playerId) {
        return Array.from(this.players.keys()).find(id => id !== playerId);
    }
}

// Nettoyage périodique des parties inactives
setInterval(() => {
    const now = Date.now();
    const expiredGames = new Set();

    activeGames.forEach((game, id) => {
        if (now - game.createdAt > 30 * 60 * 1000) { // 30 minutes
            game.players.forEach((player) => playerGameMap.delete(player.socketId));
            expiredGames.add(id);
        }
    });

    expiredGames.forEach((id) => activeGames.delete(id));
}, 5 * 60 * 1000);

// Configuration des événements Socket.IO
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    socket.on('joinRandomGame', async (playerData) => {
        const player = { socketId: socket.id, name: playerData.name, avatar: playerData.avatar };

        if (playerGameMap.has(socket.id) || waitingPlayers.has(socket.id)) return;

        if (waitingPlayers.size > 0) {
            const [opponentId, opponentData] = waitingPlayers.entries().next().value;

            waitingPlayers.delete(opponentId);
            waitingPlayersCount--;

            const game = new Game(opponentData);
            game.addPlayer(player);
            activeGames.set(game.id, game);
            playerGameMap.set(socket.id, game.id);
            playerGameMap.set(opponentId, game.id);

            io.to(socket.id).emit('gameStart', game.getGameState(socket.id));
            io.to(opponentId).emit('gameStart', game.getGameState(opponentId));
            io.emit('waitingPlayersUpdate', waitingPlayersCount);
        } else {
            waitingPlayers.set(socket.id, player);
            waitingPlayersCount++;
            socket.emit('waiting');
            io.emit('waitingPlayersUpdate', waitingPlayersCount);
        }
    });

    socket.on('disconnect', () => {
        if (waitingPlayers.has(socket.id)) {
            waitingPlayers.delete(socket.id);
            waitingPlayersCount--;
            io.emit('waitingPlayersUpdate', waitingPlayersCount);
        }

        const gameId = playerGameMap.get(socket.id);
        if (gameId) {
            const game = activeGames.get(gameId);
            const opponent = game?.getOpponent(socket.id);

            if (opponent) {
                io.to(opponent).emit('playerDisconnected', { message: "Votre adversaire s'est déconnecté" });
            }

            game?.players.forEach((player) => playerGameMap.delete(player.socketId));
            activeGames.delete(gameId);
        }
    });
});

// Routes Express
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', waitingPlayers: waitingPlayersCount, activeGames: activeGames.size });
});

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur serveur' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Serveur arrêté gracieusement');
        process.exit(0);
    });
});