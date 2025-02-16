import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Configuration du serveur
dotenv.config();
const PORT = process.env.PORT || 10000;
const CLIENT_URL = "https://seriousgame-ds65.onrender.com";

// Définition de `__dirname` pour ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: CLIENT_URL, methods: ["GET", "POST"] }
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Servir les fichiers statiques

// Routes pour servir les pages HTML
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(__dirname, "public", "choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(__dirname, "public", "room-choice.html")));
app.get("/gameboard", (req, res) => {
    console.log("📌 Accès à gameboard.html");
    res.sendFile(path.join(__dirname, "public", "gameboard.html"));
});

// Stockage des rooms et joueurs
const rooms = {}; // Stocke les rooms avec les joueurs

io.on("connection", (socket) => {
    console.log(`🔗 Connexion : ${socket.id}`);

    /** Mode Joueur Aléatoire */
    socket.on("find_random_room", (playerData) => {
        let roomId = Object.keys(rooms).find((id) => rooms[id].players.length === 1);

        if (!roomId) {
            roomId = Math.floor(1000 + Math.random() * 9000).toString();
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, ...playerData });

        console.log(`👥 Joueur ajouté : ${playerData.name} dans Room ${roomId}`);

        if (rooms[roomId].players.length === 2) {
            console.log(`✅ 2 joueurs trouvés dans Room ${roomId}, démarrage du jeu.`);
            io.to(roomId).emit("room_found", roomId);
            startGame(roomId);
        }
    });

    /** Mode Jouer entre amis (Création de Room) */
    socket.on("create_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        console.log(`🎲 Room ${roomId} créée par ${name}`);
        io.to(socket.id).emit("room_created", roomId);
    });

    /** Rejoindre une Room existante */
    socket.on("join_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId] || rooms[roomId].players.length >= 2) {
            console.log(`❌ Room ${roomId} introuvable ou pleine.`);
            io.to(socket.id).emit("room_not_found");
            return;
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        console.log(`👥 ${name} a rejoint Room ${roomId}, joueurs actuellement : ${rooms[roomId].players.length}`);

        if (rooms[roomId].players.length === 2) {
            console.log(`✅ 2 joueurs connectés à Room ${roomId}, lancement du jeu.`);
            io.to(roomId).emit("room_joined", roomId);
            startGame(roomId);
        }
    });

    /** Gestion des déconnexions */
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);
        removePlayerFromRoom(socket.id);
    });

    /** Quitter une Room */
    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });
});

/** Fonction pour démarrer la partie */
function startGame(roomId) {
    if (!rooms[roomId] || rooms[roomId].players.length !== 2) {
        console.warn(`⚠️ Tentative de démarrage de la room ${roomId} mais pas assez de joueurs.`);
        return;
    }

    const [player1, player2] = rooms[roomId].players;

    io.to(roomId).emit("game_start", {
        players: [
            { name: player1.name, avatar: player1.avatar },
            { name: player2.name, avatar: player2.avatar }
        ],
        turn: player1.name
    });

    console.log(`🎮 Début de la partie dans Room ${roomId}`);
    console.log(`👤 Joueur 1 : ${player1.name} - 👤 Joueur 2 : ${player2.name}`);
}

/** Fonction pour gérer la suppression d'un joueur de la room */
function removePlayerFromRoom(socketId) {
    for (const roomId in rooms) {
        const playerIndex = rooms[roomId].players.findIndex((player) => player.id === socketId);
        if (playerIndex !== -1) {
            console.log(`❌ Joueur ${rooms[roomId].players[playerIndex].name} supprimé de Room ${roomId}`);
            rooms[roomId].players.splice(playerIndex, 1);
        }

        if (rooms[roomId].players.length === 0) {
            console.log(`🗑️ Suppression de Room ${roomId} car elle est vide.`);
            delete rooms[roomId];
        } else {
            io.to(roomId).emit("player_disconnected");
        }
    }
}

// Démarrer le serveur
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));