import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';

// ✅ Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Configuration du serveur
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
        CLEANUP_INTERVAL: 3600000, // 1 heure
        MAX_INACTIVE_TIME: 3600000 // 1 heure
    }
};

// ✅ Gestionnaire des rooms
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map();
        this.waitingPlayers = [];
    }

    createRoom(roomCode, creator) {
        const room = {
            code: roomCode,
            players: [creator],
            gameState: {
                status: 'waiting',
                turn: creator.id,
                playedCards: [],
                createdAt: Date.now()
            }
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
            console.log(`🗑️ Room ${roomCode} supprimée`);
        }
    }

    cleanInactiveRooms() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [roomCode, room] of this.rooms) {
            if (now - room.gameState.createdAt > CONFIG.GAME.MAX_INACTIVE_TIME) {
                this.rooms.delete(roomCode);
                room.players.forEach(player => this.playerRooms.delete(player.id));
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) console.log(`🧹 ${cleanedCount} rooms inactives supprimées`);
    }
}

// ✅ Initialisation du serveur Express et WebSocket
const app = express();
app.use(cors(CONFIG.CORS_OPTIONS));
app.use(express.json());
app.use(express.static(CONFIG.STATIC_PATHS.PUBLIC));
app.use('/Avatars', express.static(CONFIG.STATIC_PATHS.AVATARS));

const server = createServer(app);
const io = new Server(server, { cors: CONFIG.CORS_OPTIONS });

const roomManager = new RoomManager();

// ✅ Routes statiques
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

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ✅ Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    // ✅ Création de room entre amis
    socket.on('createRoom', (userData) => {
        const roomCode = randomInt(1000, 9999).toString();
        const room = roomManager.createRoom(roomCode, { id: socket.id, ...userData });
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
        console.log(`🎉 Room créée : ${roomCode}`);
    });

    // ✅ Rejoindre une room
    socket.on('joinRoom', (data) => {
        const room = roomManager.joinRoom(data.roomCode, { id: socket.id, ...data });
        if (!room) {
            socket.emit('roomError', 'Room invalide ou pleine');
            return;
        }
        socket.join(data.roomCode);
        io.to(data.roomCode).emit('updatePlayers', room.players);
        if (room.players.length === CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
            io.to(room.code).emit('gameStart', { players: room.players });
        }
    });

    // ✅ Recherche de partie aléatoire
    socket.on('findRandomGame', (userData) => {
        console.log(`🎲 ${userData.name} cherche une partie...`);
        if (roomManager.waitingPlayers.length > 0) {
            const opponent = roomManager.waitingPlayers.shift();
            const roomCode = randomInt(1000, 9999).toString();
            const room = roomManager.createRoom(roomCode, opponent);
            roomManager.joinRoom(roomCode, { id: socket.id, ...userData });
            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { players: room.players });
            io.to(socket.id).emit('gameStart', { players: room.players });
            console.log(`🎮 Match trouvé: ${opponent.name} vs ${userData.name} (Room ${roomCode})`);
        } else {
            roomManager.waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
        }
    });

    // ✅ Gestion des cartes jouées
    socket.on('cardPlayed', (data) => {
        const roomCode = roomManager.playerRooms.get(socket.id);
        if (!roomCode) return;
        io.to(roomCode).emit('cardPlayed', data);
    });

    // ✅ Gestion de la déconnexion
    socket.on('disconnect', () => {
        roomManager.leaveRoom(socket.id);
        roomManager.waitingPlayers = roomManager.waitingPlayers.filter(p => p.id !== socket.id);
        console.log(`❌ Joueur déconnecté: ${socket.id}`);
    });
});

// ✅ Nettoyage des rooms inactives toutes les heures
setInterval(() => roomManager.cleanInactiveRooms(), CONFIG.GAME.CLEANUP_INTERVAL);

// ✅ Démarrage du serveur
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${CONFIG.PORT}`);
});