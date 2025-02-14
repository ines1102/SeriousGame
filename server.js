import express from 'express';
import { createServer } from 'https';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Deck from './public/js/deck.js'; // 🔥 Importation du deck

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Création de l'application Express
const app = express();

// Configuration HTTPS
const options = {
    key: fs.readFileSync('certs/key.pem'),
    cert: fs.readFileSync('certs/cert.pem')
};

// Création du serveur HTTPS et Socket.IO
const server = createServer(options, app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Stockage des rooms
const rooms = new Map();

// Configuration des routes statiques
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/choose-mode', (req, res) => res.sendFile(path.join(__dirname, 'public', 'choose-mode.html')));
app.get('/room-choice', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-choice.html')));
app.get('/gameboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gameboard.html')));

// Gestion des rooms et joueurs
class GameRoom {
    constructor(roomCode) {
        this.roomCode = roomCode;
        this.players = [];
        this.deck = new Deck(); // 🔥 Une seule instance du deck par room
        this.gameData = this.deck.initialiserPartie(); // 🎲 Génération des decks au début
        this.gameState = {
            status: 'waiting', // waiting, playing, finished
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

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log(`🔗 Nouvelle connexion: ${socket.id}`);

    // Création d'une room
    socket.on('createRoom', (userData) => {
        try {
            if (!userData || !userData.name) {
                throw new Error('Données utilisateur invalides');
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
        } catch (error) {
            console.error('❌ Erreur création room:', error);
            socket.emit('error', { message: 'Erreur lors de la création de la room' });
        }
    });

    // Rejoindre une room
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

    // Déconnexion
    socket.on('disconnect', () => {
        try {
            const room = findRoomBySocket(socket.id);
            if (!room) {
                console.log(`⚠️ Joueur ${socket.id} non trouvé dans une room`);
                return;
            }

            console.log(`🔌 Déconnexion: ${socket.id} (Room ${room.roomCode})`);

            const remainingPlayers = room.removePlayer(socket.id);

            if (remainingPlayers === 0) {
                console.log(`❌ Room ${room.roomCode} sera supprimée après 15 secondes`);
                setTimeout(() => {
                    if (rooms.has(room.roomCode) && rooms.get(room.roomCode).players.length === 0) {
                        rooms.delete(room.roomCode);
                        console.log(`✅ Room ${room.roomCode} supprimée`);
                    }
                }, 15000);
            } else {
                io.to(room.roomCode).emit('opponentLeft', { 
                    message: "Votre adversaire a quitté la partie." 
                });
                io.to(room.roomCode).emit('updatePlayers', room.players);
            }

        } catch (error) {
            console.error('❌ Erreur disconnect:', error);
        }
    });
});

// Fonction utilitaire pour trouver une room par socket ID
function findRoomBySocket(socketId) {
    for (const [roomCode, room] of rooms) {
        if (room.players.some(player => player.id === socketId)) {
            return room;
        }
    }
    return null;
}

// Nettoyage périodique des rooms inactives
setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms) {
        if (room.players.length === 0 && now - room.createdAt > 3600000) { // 1 heure
            rooms.delete(roomCode);
            console.log(`🧹 Room inactive ${roomCode} supprimée`);
        }
    }
}, 3600000);

// Démarrage du serveur
server.listen(3443, () => {
    console.log('✅ Serveur sécurisé démarré sur https://seriousgame-ds65.onrender.com');
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejetée non gérée:', reason);
});