import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { randomInt } from 'crypto';
import Deck from './public/js/deck.js';

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
        FAVICON: path.join(__dirname, 'public', 'favicon_io'),
        CARTES: path.join(__dirname, 'public', 'Cartes')
    },
    CORS_OPTIONS: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    GAME: {
        MAX_PLAYERS_PER_ROOM: 2,
        INITIAL_HAND_SIZE: 5,
        CLEANUP_INTERVAL: 3600000, // 1 heure
        MAX_INACTIVE_TIME: 3600000 // 1 heure
    }
};

function validateUserData(userData) {
    return userData &&
        typeof userData.name === 'string' &&
        userData.name.length >= 2 &&
        userData.name.length <= 20 &&
        ['male', 'female'].includes(userData.sex) &&
        typeof userData.avatarId === 'string';
}

// Gestionnaire de Room
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.waitingPlayers = [];
        this.playerRooms = new Map();
    }

    createRoom(roomCode, creator) {
        const room = {
            code: roomCode,
            players: [creator],
            gameState: {
                status: 'waiting',
                turn: creator.id,
                playedCards: new Map(),
                playerDecks: new Map(),
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

    cleanInactiveRooms() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [roomCode, room] of this.rooms) {
            if (now - room.createdAt > CONFIG.GAME.MAX_INACTIVE_TIME) {
                this.rooms.delete(roomCode);
                room.players.forEach(player => this.playerRooms.delete(player.id));
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 ${cleanedCount} rooms inactives nettoyées`);
        }
    }
}

// Gestionnaire de Jeu
class GameManager {
    constructor(io, roomManager) {
        this.io = io;
        this.roomManager = roomManager;
        this.deck = new Deck();
    }

    initializeGame(room) {
        console.log(`🎮 Initialisation du jeu pour la room ${room.code}`);
        const decks = this.deck.creerDecksJoueurs();

        room.gameState = {
            ...room.gameState,
            status: 'playing',
            playerDecks: new Map([
                [room.players[0].id, decks.joueur1],
                [room.players[1].id, decks.joueur2]
            ]),
            turn: room.players[0].id
        };

        room.players.forEach((player, index) => {
            const playerDeck = index === 0 ? decks.joueur1 : decks.joueur2;
            this.io.to(player.id).emit('gameStart', {
                players: room.players,
                hands: {
                    playerHand: playerDeck.main,
                    deckSize: playerDeck.deck.length
                },
                turn: room.gameState.turn
            });
        });

        console.log(`✅ Jeu initialisé pour la room ${room.code}`);
    }
}

// Configuration du serveur
const app = express();
app.use(cors(CONFIG.CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(CONFIG.STATIC_PATHS.PUBLIC));

// 📌 Définition des routes dynamiques
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

// 🔍 Route de monitoring (statut serveur)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// 📌 Création du serveur HTTP et WebSocket
const server = createServer(app);
const io = new Server(server, {
    cors: CONFIG.CORS_OPTIONS,
    transports: ['websocket']
});

// 📌 Gestion des Rooms
const roomManager = new RoomManager();
const gameManager = new GameManager(io, roomManager);

io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    socket.on('createRoom', (userData) => {
        if (!validateUserData(userData)) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }
        let roomCode;
        do {
            roomCode = randomInt(1000, 9999).toString();
        } while (roomManager.getRoomByCode(roomCode));

        const room = roomManager.createRoom(roomCode, { id: socket.id, ...userData });
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });
    });

    socket.on('joinRoom', (data) => {
        if (!validateUserData(data)) {
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
            io.to(room.code).emit('gameStart', { roomCode });
        }
    });

    socket.on('disconnect', () => {
        roomManager.leaveRoom(socket.id);
    });

    // Nettoyage périodique des rooms inactives
    setInterval(() => roomManager.cleanInactiveRooms(), CONFIG.GAME.CLEANUP_INTERVAL);

    // Démarrage du serveur
    const PORT = process.env.PORT || 10000; // Render fournit un port
    server.listen(PORT, () => {
        console.log(`🚀 Serveur lancé sur le port ${PORT}`);
    });
});