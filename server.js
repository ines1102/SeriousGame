import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 10000;
const CLIENT_URL = "https://seriousgame-ds65.onrender.com";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public")));

app.get("/", (req, res) => res.sendFile(path.join(path.resolve(), "public", "index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(path.resolve(), "public", "choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(path.resolve(), "public", "room-choice.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(path.resolve(), "public", "gameboard.html")));

// Stockage des rooms et des joueurs
const rooms = {};
const playerStatus = {};
const DISCONNECT_TIMEOUT = 10000; // Attente de 10s avant suppression

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    socket.on("find_random_room", (playerData) => {
        let roomId = Object.keys(rooms).find((id) => rooms[id].players.length === 1);
        if (!roomId) {
            roomId = Math.floor(1000 + Math.random() * 9000).toString();
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, ...playerData });
        playerStatus[socket.id] = { connected: true, roomId };

        console.log(`👥 Joueur ajouté : ${playerData.name} dans Room ${roomId}`);

        if (rooms[roomId].players.length === 2) {
            console.log(`✅ 2 joueurs trouvés dans Room ${roomId}, démarrage du jeu.`);
            io.to(roomId).emit("room_found", roomId);
            startGame(roomId);
        }
    });

    socket.on("rejoin_game", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            console.warn(`⚠️ Tentative de reconnexion à Room ${roomId}, mais elle n'existe plus.`);
            io.to(socket.id).emit("room_not_found");
            return;
        }

        // Trouver l'ancien socket ID du joueur
        let oldSocketId = Object.keys(playerStatus).find(id => playerStatus[id].roomId === roomId && !playerStatus[id].connected);

        if (oldSocketId) {
            console.log(`🔄 ${name} est revenu ! Assignation de ${socket.id} à la place de ${oldSocketId}`);

            // Associer le nouvel ID socket
            playerStatus[socket.id] = playerStatus[oldSocketId];
            playerStatus[socket.id].connected = true;

            // Mettre à jour la room
            rooms[roomId].players = rooms[roomId].players.map(player => 
                player.id === oldSocketId ? { ...player, id: socket.id } : player
            );

            // Supprimer l'ancien ID
            delete playerStatus[oldSocketId];
        }

        socket.join(roomId);
        io.to(socket.id).emit("rejoined", roomId);
    });

    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);
        const roomId = playerStatus[socket.id]?.roomId;

        if (roomId) {
            console.log(`⚠️ Joueur ${socket.id} marqué comme déconnecté, attente ${DISCONNECT_TIMEOUT / 1000}s pour reconnexion...`);

            playerStatus[socket.id].connected = false;

            setTimeout(() => {
                if (!playerStatus[socket.id]?.connected) {
                    console.warn(`❌ Joueur ${socket.id} réellement déconnecté.`);
                    removePlayerFromRoom(socket.id);
                } else {
                    console.log(`✅ Joueur ${socket.id} s'est reconnecté, suppression annulée.`);
                }
            }, DISCONNECT_TIMEOUT);
        }
    });

    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });
});

function startGame(roomId) {
    if (!rooms[roomId] || rooms[roomId].players.length !== 2) return;
    const [player1, player2] = rooms[roomId].players;

    import("./public/js/deck.js").then(({ default: Deck }) => {
        const deck = new Deck();
        const decks = deck.creerDecksJoueurs();

        io.to(roomId).emit("game_start", {
            player1,
            player2,
            decks,
        });
    });
}

function removePlayerFromRoom(socketId) {
    const roomId = playerStatus[socketId]?.roomId;
    if (!roomId || !rooms[roomId]) return;

    const playerIndex = rooms[roomId].players.findIndex((p) => p.id === socketId);
    if (playerIndex !== -1) {
        console.log(`🛑 Suppression confirmée de ${rooms[roomId].players[playerIndex].name} dans la Room ${roomId}`);
        rooms[roomId].players.splice(playerIndex, 1);
    }

    if (rooms[roomId].players.length === 0) {
        console.log(`🗑️ Suppression de la Room ${roomId} car elle est vide.`);
        delete rooms[roomId];
    }

    delete playerStatus[socketId];
}

server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));