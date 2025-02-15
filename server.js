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
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public"))); // Servir les fichiers statiques

// Routes pour servir les pages HTML
app.get("/", (req, res) => res.sendFile(path.join(path.resolve(), "public", "index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(path.resolve(), "public", "choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(path.resolve(), "public", "room-choice.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(path.resolve(), "public", "gameboard.html")));

// Gestion des rooms et des joueurs
const rooms = {}; // Stocke les rooms et les joueurs connectés

io.on("connection", (socket) => {
    console.log(`Nouvelle connexion : ${socket.id}`);

    // Recherche d'un adversaire en mode aléatoire
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

    // Création d'une room privée
    socket.on("create_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        io.to(socket.id).emit("room_created", roomId);
    });

    // Rejoindre une room existante
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

    // Quitter une room
    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });

    // Déconnexion du joueur
    socket.on("disconnect", () => {
        removePlayerFromRoom(socket.id);
    });
});

// Fonction pour démarrer le jeu quand 2 joueurs sont présents
function startGame(roomId) {
    if (!rooms[roomId] || rooms[roomId].players.length !== 2) return;

    const [player1, player2] = rooms[roomId].players;
    import("./public/js/deck.js").then(({ default: Deck }) => {
        const deck = new Deck();
        const decks = deck.creerDecksJoueurs();

        io.to(roomId).emit("game_start", {
            decks,
            turn: player1.name,
            opponent: { name: player2.name, avatar: player2.avatar }
        });

        io.to(roomId).emit("game_start", {
            decks,
            turn: player1.name,
            opponent: { name: player1.name, avatar: player1.avatar }
        });
    });
}

// Fonction pour retirer un joueur d'une room
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

// Redirection après index vers choose-mode
app.post("/start-game", (req, res) => {
    res.redirect("/choose-mode");
});

// Lancer le serveur
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));