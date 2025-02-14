import express from 'express';
import { createServer } from 'http'; // Render gère HTTPS, pas besoin de HTTPS ici
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Deck from './public/js/deck.js'; // 🔥 Importation du deck

// 📌 Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📌 Création de l'application Express
const app = express();

// 📌 Activation de CORS pour éviter les erreurs de connexion entre domaines
app.use(cors({
    origin: "https://seriousgame-ds65.onrender.com", // 🔥 Accepter uniquement les requêtes de Render
    methods: ["GET", "POST"],
    credentials: true
}));

// 📌 Création du serveur HTTP (Render gère HTTPS automatiquement)
const server = createServer(app);

// 📌 Configuration de Socket.IO avec gestion stricte de CORS
const io = new Server(server, {
    cors: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// 📌 Stockage des rooms
const rooms = new Map();

// 📌 Configuration des routes statiques
app.use(express.static(path.join(__dirname, 'public')));

// 📌 Routes principales
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/choose-mode', (req, res) => res.sendFile(path.join(__dirname, 'public', 'choose-mode.html')));
app.get('/room-choice', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-choice.html')));
app.get('/gameboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gameboard.html')));

// 📌 Route pour récupérer l'IP du serveur WebSocket
app.get('/server-config', (req, res) => {
    res.json({ serverIp: 'seriousgame-ds65.onrender.com' });
});

// 📌 Gestion des rooms et joueurs
class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
        this.deck = new Deck();
        this.gameData = this.deck.initialiserPartie();
        this.gameState = {
            status: 'waiting',
            currentTurn: null,
            playedCards: new Map(),
            turnNumber: 0,
            lastAction: null
        };
        this.createdAt = Date.now();
    }

    addPlayer(playerData) {
        if (this.players.length >= 2) return false;
        this.players.push(playerData);
        return true;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
        return this.players.length;
    }

    getOpponent(playerId) {
        return this.players.find(player => player.id !== playerId);
    }

    isPlayerTurn(playerId) {
        return this.gameState.currentTurn === playerId;
    }

    getPlayerHand(clientId) {
        if (this.players.length < 2) return null;
        return this.players[0].clientId === clientId
            ? this.gameData.joueur1.main
            : this.gameData.joueur2.main;
    }
}

// 📌 Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    // 📌 Création d'une room
    socket.on('createRoom', (userData) => {
        if (!userData || !userData.name) {
            socket.emit('error', { message: 'Données utilisateur invalides' });
            return;
        }

        let roomCode;
        do {
            roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        } while (rooms.has(roomCode));

        const newRoom = new GameRoom(roomCode);
        newRoom.addPlayer({ id: socket.id, ...userData });
        rooms.set(roomCode, newRoom);

        socket.join(roomCode);
        console.log(`🏠 Room créée: ${roomCode} par ${userData.name}`);

        socket.emit('roomCreated', { roomCode });
    });

    // 📌 Rejoindre une room
    socket.on('joinRoom', (data) => {
        const room = rooms.get(data.roomCode);
        if (!room) {
            socket.emit('roomError', "La room n'existe pas.");
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('roomError', 'La room est pleine.');
            return;
        }

        const playerData = { id: socket.id, ...data };
        room.addPlayer(playerData);
        socket.join(data.roomCode);

        console.log(`🎮 ${data.name} a rejoint la room ${data.roomCode}`);

        if (room.players.length === 2) {
            room.gameState.status = 'playing';
            room.gameState.currentTurn = room.players[0].id;

            // Chaque joueur reçoit uniquement sa main
            room.players.forEach(player => {
                io.to(player.id).emit('gameStart', {
                    roomCode: room.roomCode,
                    players: room.players,
                    hands: { playerHand: room.getPlayerHand(player.clientId) },
                    firstTurn: room.gameState.currentTurn
                });
            });
        }

        io.to(data.roomCode).emit('updatePlayers', room.players);
    });

    // 📌 Gestion des déconnexions
    socket.on('disconnect', () => {
        console.log(`🔌 Déconnexion: ${socket.id}`);
    });
});

// 📌 Démarrage du serveur avec PORT de Render
const PORT = process.env.PORT || 10000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur WebSocket démarré sur https://seriousgame-ds65.onrender.com`);
});