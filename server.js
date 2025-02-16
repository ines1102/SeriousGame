import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// ✅ Configuration WebSocket (avec polling en fallback)
const io = new Server(server, {
    cors: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'], // ✅ Ajout de polling en cas d'échec WebSocket
    allowEIO3: true, // ✅ Compatibilité avec d'anciennes versions de WebSocket
    pingTimeout: 60000, // ✅ WebSocket reste connecté plus longtemps
    pingInterval: 25000 // ✅ Ping régulier pour maintenir la connexion
});

// ✅ Middleware de sécurité avec CSP assoupli
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://seriousgame-ds65.onrender.com", "'unsafe-inline'"], // ✅ Suppression de nonce
            connectSrc: ["'self'", "https://seriousgame-ds65.onrender.com", "wss://seriousgame-ds65.onrender.com"],
            imgSrc: ["'self'", "data:"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            frameAncestors: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrcAttr: ["'none'"]
        }
    }
}));

// ✅ Servir les fichiers statiques
app.use(express.static(join(__dirname, 'public')));

// ✅ Gestion des joueurs en attente et des parties
let waitingPlayers = new Map();
let activeGames = new Map();
let playerGameMap = new Map();

// ✅ Classe de gestion des parties
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
            { name: "Soigneur", cost: 2, attack: 1, health: 3, effect: "heal" },
            { name: "Guerrier", cost: 3, attack: 3, health: 3, effect: "damage" },
            { name: "Défenseur", cost: 1, attack: 1, health: 4, effect: "shield" }
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

// ✅ Gestion WebSocket
io.on("connection", (socket) => {
    console.log(`✅ WebSocket connecté : ${socket.id}`);

    // ✅ Gestion du matchmaking
    socket.on("joinRandomGame", (playerData) => {
        console.log(`🎯 Joueur en recherche : ${socket.id}`);

        if (playerGameMap.has(socket.id) || waitingPlayers.has(socket.id)) return;

        if (waitingPlayers.size > 0) {
            const [opponentId, opponentData] = waitingPlayers.entries().next().value;
            waitingPlayers.delete(opponentId);

            const game = new Game(opponentData);
            game.addPlayer({ socketId: socket.id, name: playerData.name, avatar: playerData.avatar });

            activeGames.set(game.id, game);
            playerGameMap.set(socket.id, game.id);
            playerGameMap.set(opponentId, game.id);

            io.to(socket.id).emit("gameStart", game.getGameState(socket.id));
            io.to(opponentId).emit("gameStart", game.getGameState(opponentId));
        } else {
            waitingPlayers.set(socket.id, { socketId: socket.id, name: playerData.name, avatar: playerData.avatar });
            socket.emit("waitingForPlayer");
        }
    });

    // ✅ Gestion de la déconnexion et reconnexion
    socket.on("disconnect", (reason) => {
        console.warn(`⚠️ WebSocket déconnecté : ${reason}`);

        if (waitingPlayers.has(socket.id)) {
            waitingPlayers.delete(socket.id);
        }

        const gameId = playerGameMap.get(socket.id);
        if (gameId) {
            const game = activeGames.get(gameId);
            const opponent = game?.getOpponent(socket.id);

            if (opponent) {
                io.to(opponent).emit("playerDisconnected", { message: "Votre adversaire s'est déconnecté" });
            }

            game?.players.forEach((player) => playerGameMap.delete(player.socketId));
            activeGames.delete(gameId);
        }

        // ✅ Tentative de reconnexion immédiate
        if (reason === "transport close" || reason === "ping timeout") {
            console.log("🔄 Tentative de reconnexion...");
            setTimeout(() => socket.connect(), 2000);
        }
    });
});

// ✅ Route de santé
app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", waitingPlayers: waitingPlayers.size, activeGames: activeGames.size });
});

// ✅ Route par défaut pour le front-end
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ✅ Gestion des erreurs
app.use((err, req, res, next) => {
    console.error("🚨 Erreur serveur :", err);
    res.status(500).json({ error: "Erreur serveur" });
});

// ✅ Démarrage du serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

// ✅ Gestion de l'arrêt du serveur
process.on("SIGTERM", () => {
    server.close(() => {
        console.log("🛑 Serveur arrêté proprement");
        process.exit(0);
    });
});