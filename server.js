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
}

// Configuration du serveur
const app = express();
app.use(cors(CONFIG.CORS_OPTIONS));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(CONFIG.STATIC_PATHS.PUBLIC));

// Servir correctement les fichiers statiques
app.use('/Avatars', express.static(path.join(__dirname, 'public', 'Avatars')));
app.use('/Cartes', express.static(CONFIG.STATIC_PATHS.CARTES));

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

let waitingPlayers = []; // ✅ Liste des joueurs en attente
io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    socket.on('findRandomGame', (userData) => {
        if (!userData || !userData.name) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }
    
        console.log(`🎲 ${userData.name} cherche une partie aléatoire...`);
    
        if (waitingPlayers.length > 0) {
            // Associer avec le premier joueur en attente
            const opponent = waitingPlayers.shift();
            let roomCode = randomInt(1000, 9999).toString();
    
            // Créer une nouvelle room
            const room = roomManager.createRoom(roomCode, opponent);
            roomManager.joinRoom(roomCode, { id: socket.id, ...userData });
    
            // Ajouter les deux joueurs dans la même room
            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { roomCode });
            io.to(socket.id).emit('gameStart', { roomCode });
    
            console.log(`🎮 Match trouvé ! ${opponent.name} vs ${userData.name} dans la room ${roomCode}`);
        } else {
            // Aucun joueur en attente, ajouter le joueur à la liste d'attente
            waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
            console.log(`⌛ ${userData.name} est en attente d'un adversaire...`);
        }
    });

    socket.on('joinRoom', (data) => {
        if (!validateUserData(data)) {
            socket.emit('roomError', 'Données invalides');
            return;
        }
    
        const room = roomManager.joinRoom(data.roomCode, { id: socket.id, ...data });
    
        console.log(`📌 Joueurs dans la room ${data.roomCode}:`, room ? room.players : '❌ Room introuvable'); // ✅ Debug
    
        if (!room) {
            socket.emit('roomError', 'Room invalide ou pleine');
            return;
        }
    
        socket.join(data.roomCode);
    
        // 🔄 Mise à jour des joueurs
        io.to(data.roomCode).emit('updatePlayers', room.players);
    });
    
    // Gérer la déconnexion d'un joueur en attente
    socket.on('disconnect', () => {
        waitingPlayers = waitingPlayers.filter(player => player.id !== socket.id);
    });
});

// Nettoyage périodique des rooms inactives
setInterval(() => roomManager.cleanInactiveRooms(), CONFIG.GAME.CLEANUP_INTERVAL);

// Forcer Render à écouter sur `0.0.0.0`
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur lancé sur le port ${CONFIG.PORT}`);
});