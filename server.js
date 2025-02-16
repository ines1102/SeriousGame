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

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public")));

// Routes
app.get("/", (req, res) => res.sendFile(path.join(path.resolve(), "public", "index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(path.resolve(), "public", "choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(path.resolve(), "public", "room-choice.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(path.resolve(), "public", "gameboard.html")));

// Stockage des rooms et joueurs
const rooms = {};
const playerStatus = {}; // Statut des joueurs
const PING_INTERVAL = 5000; // Ping toutes les 5 sec
const DISCONNECT_TIMEOUT = 15000; // Déconnexion après 15 sec

// ✅ Vérification périodique des connexions
setInterval(() => {
    Object.keys(playerStatus).forEach((socketId) => {
        if (Date.now() - playerStatus[socketId].lastPing > DISCONNECT_TIMEOUT) {
            console.warn(`🛑 Suppression de ${playerStatus[socketId].name} pour inactivité.`);
            removePlayerFromRoom(socketId);
        }
    });
}, PING_INTERVAL);

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    // ✅ Ajoute le joueur dans le suivi des connexions
    playerStatus[socket.id] = { lastPing: Date.now(), connected: true };

    /** 🎮 Mode Joueur Aléatoire */
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

    /** 🎮 Mode Jouer entre amis */
    socket.on("create_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) rooms[roomId] = { players: [] };
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
        if (rooms[roomId].players.length === 2) {
            io.to(roomId).emit("room_joined", roomId);
            startGame(roomId);
        }
    });

    /** 🔄 Vérification de l'activité des joueurs */
    socket.on("pong", () => {
        if (playerStatus[socket.id]) {
            playerStatus[socket.id].lastPing = Date.now();
        }
    });

    /** ✅ Gestion des déconnexions avec temporisation */
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);
        if (rooms[roomId]) {
            console.log(`⚠️ Joueur ${socket.id} pourrait être encore connecté, attente...`);
        }
        setTimeout(() => {
            if (playerStatus[socket.id] && Date.now() - playerStatus[socket.id].lastPing > DISCONNECT_TIMEOUT) {
                console.warn(`❌ Joueur ${socket.id} réellement déconnecté.`);
                removePlayerFromRoom(socket.id);
            } else {
                console.log(`✅ Reconnexion rapide détectée pour ${socket.id}, annulation de la suppression.`);
            }
        }, DISCONNECT_TIMEOUT);
    });

    /** 🎮 Gestion des reconnexions */
    socket.on("rejoin_game", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            console.warn(`⚠️ Tentative de reconnexion à Room ${roomId}, mais elle n'existe plus.`);
            io.to(socket.id).emit("room_not_found");
            return;
        }

        // Ajoute le joueur à la room si nécessaire
        if (!rooms[roomId].players.some((p) => p.id === socket.id)) {
            rooms[roomId].players.push({ id: socket.id, name, avatar });
            console.log(`🔄 ${name} tente de rejoindre Room ${roomId} après reconnexion.`);
        }

        socket.join(roomId);
        io.to(socket.id).emit("rejoined", roomId);
    });

    /** ✅ Quitter une Room */
    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });
});

/** 🎮 Fonction pour démarrer la partie */
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

/** ✅ Gestion des déconnexions */
function removePlayerFromRoom(socketId) {
    for (const roomId in rooms) {
        const playerIndex = rooms[roomId].players.findIndex((p) => p.id === socketId);
        if (playerIndex !== -1) {
            console.log(`🛑 Suppression confirmée de ${rooms[roomId].players[playerIndex].name} dans la Room ${roomId}`);
            rooms[roomId].players.splice(playerIndex, 1);
        }

        if (rooms[roomId].players.length === 0) {
            console.log(`🗑️ Suppression de la Room ${roomId} car elle est vide.`);
            delete rooms[roomId];
        }
    }
}

// Démarrer le serveur
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));