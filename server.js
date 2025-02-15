import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 10000;
const CLIENT_URL = "https://seriousgame-ds65.onrender.com";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

app.use(cors({ origin: CLIENT_URL }));

// Servir les fichiers statiques
app.use(express.static("public"));

// Gestion des rooms
const rooms = {}; // Stocke les rooms et les joueurs connectés

io.on("connection", (socket) => {
    console.log(`Nouvelle connexion : ${socket.id}`);

    socket.on("find_random_room", (playerData) => {
        let roomId = Object.keys(rooms).find((id) => rooms[id].players.length === 1);

        if (!roomId) {
            roomId = Math.floor(1000 + Math.random() * 9000).toString();
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, ...playerData });

        if (rooms[roomId].players.length === 2) {
            io.to(roomId).emit("room_found", roomId);
            startGame(roomId);
        }
    });

    socket.on("create_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        io.to(socket.id).emit("room_created", roomId);
    });

    socket.on("join_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId] || rooms[roomId].players.length >= 2) {
            io.to(socket.id).emit("room_not_found");
            return;
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        io.to(roomId).emit("room_joined", roomId);
        startGame(roomId);
    });

    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });

    socket.on("disconnect", () => {
        removePlayerFromRoom(socket.id);
    });
});

function startGame(roomId) {
    if (!rooms[roomId] || rooms[roomId].players.length !== 2) return;

    const [player1, player2] = rooms[roomId].players;
    const deckModule = import("./public/js/deck.js").then(({ default: Deck }) => {
        const deck = new Deck();
        const decks = deck.creerDecksJoueurs();

        io.to(roomId).emit("game_start", {
            decks,
            turn: player1.name,
            opponent: { name: player2.name, avatar: player2.avatar }
        });
    });
}

function removePlayerFromRoom(socketId) {
    for (const roomId in rooms) {
        rooms[roomId].players = rooms[roomId].players.filter((player) => player.id !== socketId);

        if (rooms[roomId].players.length === 0) {
            delete rooms[roomId];
        } else {
            io.to(roomId).emit("player_disconnected");
        }
    }
}

server.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));