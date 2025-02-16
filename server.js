const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 10000;
let rooms = {}; // Stocke les rooms actives

// Middleware pour servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Routes principales
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/choose-mode', (req, res) => res.sendFile(path.join(__dirname, 'public/choose-mode.html')));
app.get('/room-choice', (req, res) => res.sendFile(path.join(__dirname, 'public/room-choice.html')));
app.get('/gameboard', (req, res) => res.sendFile(path.join(__dirname, 'public/gameboard.html')));

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
    console.log(`🔗 Connexion : ${socket.id}`);

    socket.on('join_game', (playerData) => {
        console.log(`👤 Joueur ${playerData.name} tente de rejoindre une room...`);

        let room = findOrCreateRoom(playerData);
        playerData.roomId = room.id;
        playerData.socketId = socket.id;
        room.players.push(playerData);

        socket.join(room.id);
        console.log(`✅ ${playerData.name} rejoint la Room ${room.id}`);

        io.to(socket.id).emit('room_joined', room.id);

        if (room.players.length === 2) {
            console.log(`✅ 2 joueurs trouvés dans Room ${room.id}, démarrage du jeu.`);

            let deck = shuffleDeck(); // Génération du deck

            io.to(room.id).emit('game_start', {
                players: room.players,
                deck: deck,
                turn: room.players[0].name, // Premier joueur commence
            });
        }
    });

    socket.on('play_card', ({ roomId, player, card, slot }) => {
        console.log(`🎴 Carte jouée par ${player}: ${card} sur ${slot}`);
        io.to(roomId).emit('card_played', { player, card, slot });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);
        let roomId = removePlayerFromRoom(socket.id);

        if (roomId) {
            io.to(roomId).emit('opponent_disconnected');

            if (rooms[roomId].players.length === 0) {
                console.log(`🗑️ Suppression de Room ${roomId} car elle est vide.`);
                delete rooms[roomId];
            }
        }
    });
});

// Lancement du serveur
server.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}/`);
});

/** 📌 Fonctions utilitaires */
function findOrCreateRoom(player) {
    let availableRoom = Object.values(rooms).find(room => room.players.length < 2);
    if (availableRoom) return availableRoom;

    let roomId = generateRoomId();
    rooms[roomId] = { id: roomId, players: [] };
    return rooms[roomId];
}

function generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
}

function removePlayerFromRoom(socketId) {
    for (let roomId in rooms) {
        let room = rooms[roomId];
        let playerIndex = room.players.findIndex(player => player.socketId === socketId);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            return roomId;
        }
    }
    return null;
}

// 📌 Simulation d'un deck
function shuffleDeck() {
    const deck = [
        "/cards/card1.png", "/cards/card2.png", "/cards/card3.png",
        "/cards/card4.png", "/cards/card5.png", "/cards/card6.png"
    ];
    return deck.sort(() => Math.random() - 0.5);
}