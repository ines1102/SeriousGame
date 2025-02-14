import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gestionnaire de Rooms
const RoomManager = {
    rooms: new Map(),
    
    createRoom(roomCode, playerData) {
        const room = {
            players: [playerData],
            roomCode,
            createdAt: Date.now(),
            status: 'waiting'
        };
        this.rooms.set(roomCode, room);
        return room;
    },

    joinRoom(roomCode, playerData) {
        const room = this.rooms.get(roomCode);
        if (!room) return null;
        if (room.players.length >= 2) return false;
        room.players.push(playerData);
        room.status = 'playing';
        return room;
    },
    
    removePlayer(roomCode, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) return false;
        room.players = room.players.filter(p => p.id !== playerId);
        if (room.players.length === 0) {
            this.rooms.delete(roomCode);
            return null;
        }
        return room;
    },
    
    cleanInactiveRooms(maxAge = 3600000) {
        const now = Date.now();
        for (const [roomCode, room] of this.rooms) {
            if (now - room.createdAt > maxAge || room.players.length === 0) {
                this.rooms.delete(roomCode);
                logGameEvent(gameEvents.ROOM_DELETED, { roomCode });
            }
        }
    }
};

// Création de l'application Express
const app = express();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});

app.use(limiter);

// Activation de CORS
app.use(cors({
    origin: "https://seriousgame-ds65.onrender.com",
    methods: ["GET", "POST"],
    credentials: true
}));

// Création du serveur HTTP
const server = createServer(app);

// Configuration de WebSockets
const io = new Server(server, {
    cors: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware statique
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(path.join(__dirname, 'public/js'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Routes principales
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/choose-mode', (req, res) => res.sendFile(path.join(__dirname, 'public', 'choose-mode.html')));
app.get('/room-choice', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-choice.html')));
app.get('/gameboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gameboard.html')));

// Route de monitoring
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        activeRooms: RoomManager.rooms.size,
        waitingPlayers: waitingPlayers.length,
        timestamp: new Date().toISOString()
    });
});

// Constantes pour les événements
const gameEvents = {
    ROOM_CREATED: 'ROOM_CREATED',
    PLAYER_JOINED: 'PLAYER_JOINED',
    GAME_STARTED: 'GAME_STARTED',
    PLAYER_LEFT: 'PLAYER_LEFT',
    ROOM_DELETED: 'ROOM_DELETED'
};

// Système de logging
const logGameEvent = (event, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${event}:`, JSON.stringify(data));
};

// Validation des données
const validateUserData = (userData) => {
    if (!userData?.name || typeof userData.name !== 'string') {
        return false;
    }
    return userData.name.length >= 2 && userData.name.length <= 20;
};

// File d'attente pour le matchmaking
const waitingPlayers = [];

// Gestionnaire d'événements Socket
const socketHandlers = {
    handleCreateRoom(socket, userData) {
        if (!validateUserData(userData)) {
            return socket.emit('roomError', 'Données utilisateur invalides');
        }

        let roomCode;
        do {
            roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        } while (RoomManager.rooms.has(roomCode));

        const room = RoomManager.createRoom(roomCode, { id: socket.id, ...userData });
        
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
        
        logGameEvent(gameEvents.ROOM_CREATED, { 
            roomCode, 
            playerName: userData.name 
        });
    },

    handleJoinRoom(socket, data) {
        if (!data?.roomCode || !validateUserData(data)) {
            return socket.emit('roomError', 'Données invalides');
        }

        const room = RoomManager.joinRoom(data.roomCode, { id: socket.id, ...data });
        
        if (!room) {
            return socket.emit('roomError', "La room n'existe pas.");
        }
        if (room === false) {
            return socket.emit('roomError', 'La room est pleine.');
        }

        socket.join(data.roomCode);
        io.to(data.roomCode).emit('gameStart', { roomCode: data.roomCode });
        
        logGameEvent(gameEvents.PLAYER_JOINED, {
            roomCode: data.roomCode,
            playerName: data.name
        });
    },

    handleFindRandomGame(socket, userData) {
        if (!validateUserData(userData)) {
            return socket.emit('roomError', 'Données utilisateur invalides');
        }

        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.pop();
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
            
            RoomManager.createRoom(roomCode, opponent);
            RoomManager.joinRoom(roomCode, { id: socket.id, ...userData });

            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { roomCode });
            io.to(socket.id).emit('gameStart', { roomCode });

            logGameEvent(gameEvents.GAME_STARTED, {
                roomCode,
                players: [opponent.name, userData.name]
            });
        } else {
            waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
        }
    },

    handleDisconnect(socket) {
        const playerIndex = waitingPlayers.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            waitingPlayers.splice(playerIndex, 1);
        }

        for (const [roomCode, room] of RoomManager.rooms) {
            const updatedRoom = RoomManager.removePlayer(roomCode, socket.id);
            if (updatedRoom === null) {
                logGameEvent(gameEvents.ROOM_DELETED, { roomCode });
            } else if (updatedRoom) {
                io.to(roomCode).emit('opponentLeft', "Votre adversaire a quitté la partie.");
                logGameEvent(gameEvents.PLAYER_LEFT, { roomCode, playerId: socket.id });
            }
        }
    }
};

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    socket.on('createRoom', (userData) => socketHandlers.handleCreateRoom(socket, userData));
    socket.on('joinRoom', (data) => socketHandlers.handleJoinRoom(socket, data));
    socket.on('findRandomGame', (userData) => socketHandlers.handleFindRandomGame(socket, userData));
    socket.on('disconnect', () => socketHandlers.handleDisconnect(socket));
    
    socket.on('cancelSearch', () => {
        const index = waitingPlayers.findIndex(p => p.id === socket.id);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
            logGameEvent('SEARCH_CANCELLED', { playerId: socket.id });
        }
    });

    socket.on('error', (error) => {
        console.error('Erreur Socket:', error);
        socket.emit('serverError', 'Une erreur est survenue');
    });
});

// Nettoyage périodique des rooms
setInterval(() => {
    RoomManager.cleanInactiveRooms();
}, 3600000);

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Une erreur est survenue',
        code: process.env.NODE_ENV === 'development' ? err.message : 'SERVER_ERROR'
    });
});

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejetée non gérée:', reason);
});

// Démarrage du serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur WebSocket démarré sur le port ${PORT}`);
    console.log(`📍 URL: https://seriousgame-ds65.onrender.com`);
});