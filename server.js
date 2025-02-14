import express from 'express';
import { createServer } from 'https';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Deck from './public/js/deck.js';

// 📌 Détection de l'IP locale pour une connexion réseau
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const net of iface) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

const SERVER_IP = getLocalIP();

// 📌 Définition du chemin absolu du dossier du serveur
const __dirname = path.resolve();

// 📌 Configuration SSL (évite les erreurs Chrome/Safari)
const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// 📌 Initialisation du serveur Express et WebSocket
const app = express();
const server = createServer(options, app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['websocket', 'polling'],
    rejectUnauthorized: false
});

// 📌 Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 📌 Routes principales (avec `path.resolve()` pour éviter l'erreur)
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'index.html')));
app.get('/choose-mode', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'choose-mode.html')));
app.get('/room-choice', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'room-choice.html')));
app.get('/gameboard', (req, res) => res.sendFile(path.resolve(__dirname, 'public', 'gameboard.html')));

// 📌 Endpoint pour récupérer l'IP du serveur
app.get('/server-config', (req, res) => res.json({ serverIp: SERVER_IP }));

// 📌 Stockage des rooms et joueurs
const rooms = new Map();

// 📌 Gestion des connexions WebSocket
io.on('connection', (socket) => {
    console.log(`🔗 Connexion: ${socket.id}`);

    // 📌 Création d'une room
    socket.on('createRoom', (userData) => {
        if (!userData || !userData.name) {
            return socket.emit('error', 'Données utilisateur invalides');
        }

        let roomCode;
        do { roomCode = (1000 + Math.random() * 9000).toFixed(0); } while (rooms.has(roomCode));

        const newRoom = {
            roomCode,
            players: [{ id: socket.id, ...userData }],
            deck: new Deck().initialiserPartie(),
            gameState: { status: 'waiting', turn: null }
        };

        rooms.set(roomCode, newRoom);
        socket.join(roomCode);
        console.log(`🏠 Room ${roomCode} créée par ${userData.name}`);
        socket.emit('roomCreated', { roomCode });
    });

    // 📌 Rejoindre une room
    socket.on('joinRoom', (data) => {
        const room = rooms.get(data.roomCode);
        if (!room || room.players.length >= 2) {
            return socket.emit('error', 'Room introuvable ou pleine');
        }

        room.players.push({ id: socket.id, ...data });
        socket.join(data.roomCode);
        console.log(`🎮 ${data.name} a rejoint la room ${data.roomCode}`);

        if (room.players.length === 2) {
            room.gameState.status = 'playing';
            room.gameState.turn = room.players[0].id;

            // Chaque joueur reçoit uniquement **sa propre main**
            room.players.forEach(player => {
                const playerHand = player.id === room.players[0].id 
                    ? room.deck.joueur1.main 
                    : room.deck.joueur2.main;
                
                io.to(player.id).emit('gameStart', {
                    roomCode: data.roomCode,
                    players: room.players,
                    playerHand,
                    opponentName: room.players.find(p => p.id !== player.id).name,
                    firstTurn: room.gameState.turn
                });
            });
        }

        io.to(data.roomCode).emit('updatePlayers', room.players);
    });

    // 📌 Jouer une carte
    socket.on('playCard', (data) => {
        const room = rooms.get(data.roomCode);
        if (!room || room.gameState.status !== 'playing') return;

        if (room.gameState.turn !== socket.id) {
            return socket.emit('error', "Ce n'est pas ton tour !");
        }

        io.to(data.roomCode).emit('cardPlayed', { 
            playerId: socket.id, 
            card: data.card,
            slot: data.slot
        });

        room.gameState.turn = room.players.find(p => p.id !== socket.id).id;
        io.to(data.roomCode).emit('turnChanged', { turn: room.gameState.turn });
    });

    // 📌 Gestion des déconnexions
    socket.on('disconnect', () => {
        let roomToDelete = null;
        rooms.forEach((room, code) => {
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) roomToDelete = code;
            else io.to(code).emit('opponentLeft', { message: "Votre adversaire a quitté la partie." });
        });

        if (roomToDelete) rooms.delete(roomToDelete);
        console.log(`🔌 Déconnexion: ${socket.id}`);
    });
});

// 📌 Nettoyage automatique des rooms vides
setInterval(() => {
    for (const [roomCode, room] of rooms) {
        if (room.players.length === 0) {
            rooms.delete(roomCode);
            console.log(`🗑️ Room ${roomCode} supprimée`);
        }
    }
}, 3600000);

// 📌 Démarrage du serveur HTTPS
server.listen(3443, '0.0.0.0', () => {
    console.log(`✅ Serveur HTTPS disponible sur:`);
    console.log(`- Local: https://localhost:3443`);
    console.log(`- Réseau: https://${SERVER_IP}:3443`);
});