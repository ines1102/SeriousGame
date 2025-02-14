import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 📌 Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📌 Création de l'application Express
const app = express();

// 📌 Activation de CORS (Correction Cross-Origin)
app.use(cors({
    origin: "https://seriousgame-ds65.onrender.com",
    methods: ["GET", "POST"],
    credentials: true
}));

// 📌 Création du serveur HTTP (Sans HTTPS car Render gère SSL)
const server = createServer(app);

// 📌 Configuration de WebSockets avec CORS
const io = new Server(server, {
    cors: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// 📌 Routes statiques (Pour servir HTML, CSS et JS)
app.use(express.static(path.join(__dirname, 'public')));

// 📌 Routes principales
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/choose-mode', (req, res) => res.sendFile(path.join(__dirname, 'public', 'choose-mode.html')));
app.get('/room-choice', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-choice.html')));
app.get('/gameboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gameboard.html')));

// 📌 Stockage des rooms et matchmaking
const rooms = new Map();
const waitingPlayers = [];

// 📌 Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log(`✅ Joueur connecté: ${socket.id}`);

    // 📌 Création d'une room privée
    socket.on('createRoom', (userData) => {
        if (!userData || !userData.name) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        let roomCode;
        do {
            roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        } while (rooms.has(roomCode));

        rooms.set(roomCode, { players: [{ id: socket.id, ...userData }], roomCode });

        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode });

        console.log(`🏠 Room ${roomCode} créée par ${userData.name}`);
    });

    // 📌 Rejoindre une room existante
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

        room.players.push({ id: socket.id, ...data });
        socket.join(data.roomCode);
        io.to(data.roomCode).emit('gameStart', { roomCode: data.roomCode });

        console.log(`🎮 ${data.name} a rejoint la room ${data.roomCode}`);
    });

    // 📌 Matchmaking automatique (Partie aléatoire)
    socket.on('findRandomGame', (userData) => {
        if (waitingPlayers.length > 0) {
            const opponent = waitingPlayers.pop();
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
            rooms.set(roomCode, { players: [opponent, { id: socket.id, ...userData }], roomCode });

            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { roomCode });
            io.to(socket.id).emit('gameStart', { roomCode });

            console.log(`🎮 Match trouvé ! Room ${roomCode} avec ${opponent.name} et ${userData.name}`);
        } else {
            waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
            console.log(`⌛ ${userData.name} attend un adversaire...`);
        }
    });

    // 📌 Annuler recherche de partie
    socket.on('cancelSearch', () => {
        const index = waitingPlayers.findIndex(p => p.id === socket.id);
        if (index !== -1) {
            waitingPlayers.splice(index, 1);
            console.log(`🛑 Joueur ${socket.id} a annulé la recherche.`);
        }
    });

    // 📌 Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`🔌 Joueur déconnecté: ${socket.id}`);

        // Suppression du joueur de la liste d'attente
        const index = waitingPlayers.findIndex(p => p.id === socket.id);
        if (index !== -1) waitingPlayers.splice(index, 1);

        // Suppression du joueur de sa room
        for (const [roomCode, room] of rooms) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomCode).emit('opponentLeft', "Votre adversaire a quitté la partie.");

                // Suppression de la room si vide
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                    console.log(`🗑️ Room ${roomCode} supprimée`);
                }
                break;
            }
        }
    });
});

// 📌 Nettoyage des rooms inactives toutes les heures
setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms) {
        if (room.players.length === 0) {
            rooms.delete(roomCode);
            console.log(`🧹 Room inactive ${roomCode} supprimée`);
        }
    }
}, 3600000);

// 📌 Démarrage du serveur
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur WebSocket sur https://seriousgame-ds65.onrender.com`);
});

// 📌 Gestion des erreurs globales
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejetée non gérée:', reason);
});