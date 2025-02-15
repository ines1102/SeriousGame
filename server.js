import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration globale
const CONFIG = {
    PORT: process.env.PORT || 10000,
    CLIENT_URL: "https://seriousgame-ds65.onrender.com",
    STATIC_PATHS: {
        PUBLIC: path.join(__dirname, 'public'),
        AVATARS: path.join(__dirname, 'public', 'Avatars'),
        JS: path.join(__dirname, 'public', 'js'),
        CSS: path.join(__dirname, 'public', 'css'),
        CARTES: path.join(__dirname, 'public', 'Cartes')
    },
    CORS_OPTIONS: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    GAME: {
        MAX_PLAYERS_PER_ROOM: 2,
        CLEANUP_INTERVAL: 600000, // 10 minutes
        MAX_INACTIVE_TIME: 3600000 // 1 heure
    }
};

// Serveur Express
const app = express();
app.use(cors(CONFIG.CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(CONFIG.STATIC_PATHS.PUBLIC));
app.use('/Avatars', express.static(CONFIG.STATIC_PATHS.AVATARS));

// Routes HTML
const routes = [
    { path: '/', file: 'index.html' },
    { path: '/choose-mode', file: 'choose-mode.html' },
    { path: '/room-choice', file: 'room-choice.html' },
    { path: '/gameboard', file: 'gameboard.html' }
];

routes.forEach(route => {
    app.get(route.path, (req, res) => {
        res.sendFile(path.join(CONFIG.STATIC_PATHS.PUBLIC, route.file));
    });
});

// Route de monitoring
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Création du serveur HTTP et WebSocket
const server = createServer(app);
const io = new Server(server, {
    cors: CONFIG.CORS_OPTIONS,
    transports: ['websocket']
});

// Gestionnaire des rooms
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map();
    }

    createRoom(roomCode, creator) {
        const room = {
            code: roomCode,
            players: [creator],
            gameState: {
                status: 'waiting',
                turn: creator.id,
                startTime: Date.now()
            },
            createdAt: Date.now()
        };

        this.rooms.set(roomCode, room);
        this.playerRooms.set(creator.id, roomCode);
        console.log(`🏠 Room ${roomCode} créée par ${creator.name}`);
        return room;
    }

    joinRoom(roomCode, player) {
        const room = this.rooms.get(roomCode);
        if (!room || room.players.length >= CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
            return null;
        }

        room.players.push(player);
        this.playerRooms.set(player.id, roomCode);
        console.log(`👋 ${player.name} a rejoint la room ${roomCode}`);
        return room;
    }

    leaveRoom(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);
        this.playerRooms.delete(playerId);

        if (room.players.length === 0) {
            this.rooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} supprimée (vide)`);
        }
    }
}

const roomManager = new RoomManager();
let waitingPlayers = []; // Liste des joueurs en attente

io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    socket.on('createRoom', (userData) => {
        if (!userData || !userData.name) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        let roomCode;
        do {
            roomCode = randomInt(1000, 9999).toString();
        } while (roomManager.rooms.has(roomCode));

        const room = roomManager.createRoom(roomCode, { id: socket.id, ...userData });
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
    });

    socket.on('joinRoom', (data) => {
        if (!data || !data.roomCode) {
            socket.emit('roomError', 'Données invalides');
            return;
        }

        const room = roomManager.joinRoom(data.roomCode, { id: socket.id, ...data });
        if (!room) {
            socket.emit('roomError', 'Room invalide ou pleine');
            return;
        }

        socket.join(data.roomCode);
        if (room.players.length === CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
            io.to(room.code).emit('gameStart', { roomCode, players: room.players });
        }
    });

    socket.on('findRandomGame', (userData) => {
        if (!userData || !userData.name) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        console.log(`🎲 ${userData.name} cherche une partie aléatoire...`);

        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.shift();
            let roomCode = randomInt(1000, 9999).toString();

            const room = roomManager.createRoom(roomCode, opponent);
            roomManager.joinRoom(roomCode, { id: socket.id, ...userData });

            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { roomCode, players: room.players });
            io.to(socket.id).emit('gameStart', { roomCode, players: room.players });

            console.log(`🎮 Match trouvé ! ${opponent.name} vs ${userData.name} dans la room ${roomCode}`);
        } else {
            waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
            console.log(`⌛ ${userData.name} est en attente d'un adversaire...`);
        }
    });

    socket.on('disconnect', () => {
        // ✅ Supprime le joueur de la liste d'attente
        waitingPlayers = waitingPlayers.filter(player => player.id !== socket.id);
        roomManager.leaveRoom(socket.id);
    });
});

// Nettoyage périodique des rooms inactives
setInterval(() => {
    const now = Date.now();
    let cleanedRooms = 0;
    for (const [roomCode, room] of roomManager.rooms) {
        if (now - room.createdAt > CONFIG.GAME.MAX_INACTIVE_TIME) {
            roomManager.rooms.delete(roomCode);
            cleanedRooms++;
        }
    }
    if (cleanedRooms > 0) {
        console.log(`🧹 ${cleanedRooms} rooms inactives supprimées`);
    }
}, CONFIG.GAME.CLEANUP_INTERVAL);

// Lancement du serveur
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${CONFIG.PORT}`);
});