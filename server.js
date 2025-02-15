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
        CLEANUP_INTERVAL: 3600000, // 1 heure
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
        this.waitingPlayers = [];
    }

    createRoom(roomCode, creator) {
        const room = {
            code: roomCode,
            players: [creator],
            gameState: {
                status: 'waiting',
                turn: creator.id,
                playedCards: new Map(),
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

io.on('connection', (socket) => {

    // Création d'une room privée
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
    
        // 📌 Envoi de la mise à jour des joueurs immédiatement
        io.to(roomCode).emit('updatePlayers', room.players);
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
    
        // 📌 Envoi immédiat des données de l’adversaire
        if (room.players.length === 2) {
            const [player1, player2] = room.players;
    
            io.to(player1.id).emit('updateOpponent', player2);
            io.to(player2.id).emit('updateOpponent', player1);
        }
    });

    // Matchmaking aléatoire
    socket.on('findRandomGame', (userData) => {
        if (!userData || !userData.name) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        console.log(`🎲 ${userData.name} cherche une partie aléatoire...`);

        if (roomManager.waitingPlayers.length > 0) {
            const opponent = roomManager.waitingPlayers.shift();
            let roomCode = randomInt(1000, 9999).toString();

            const room = roomManager.createRoom(roomCode, opponent);
            roomManager.joinRoom(roomCode, { id: socket.id, ...userData });

            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { roomCode, players: room.players });
            io.to(socket.id).emit('gameStart', { roomCode, players: room.players });

            console.log(`🎮 Match trouvé ! ${opponent.name} vs ${userData.name} dans la room ${roomCode}`);
        } else {
            roomManager.waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
            console.log(`⌛ ${userData.name} est en attente d'un adversaire...`);
        }
    });

    // Gestion des joueurs quittant une room
    socket.on('disconnect', () => {
        roomManager.waitingPlayers = roomManager.waitingPlayers.filter(player => player.id !== socket.id);
        roomManager.leaveRoom(socket.id);
    });

    // Gestion des cartes jouées
    socket.on('cardPlayed', (data) => {
        const roomCode = roomManager.playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = roomManager.rooms.get(roomCode);
        if (!room) return;

        room.gameState.playedCards.set(data.slot, data);
        io.to(roomCode).emit('cardPlayed', data);
    });

    // Gestion des tours
    socket.on('endTurn', () => {
        const roomCode = roomManager.playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = roomManager.rooms.get(roomCode);
        if (!room) return;

        room.gameState.turn = room.players.find(p => p.id !== socket.id)?.id;
        io.to(roomCode).emit('turnUpdate', room.gameState.turn);
    });
});

// Lancement du serveur
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${CONFIG.PORT}`);
});