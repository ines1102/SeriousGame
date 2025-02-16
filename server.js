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

// Stockage des rooms et joueurs
const rooms = {}; // Stocke les rooms avec les joueurs
const disconnectTimers = {}; // Stocke les timers de déconnexion temporaire

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    /** ✅ Mode Joueur Aléatoire */
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

    /** ✅ Mode Jouer entre amis */
    socket.on("create_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }

        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        console.log(`🎲 Room ${roomId} créée par ${name}`);
        io.to(socket.id).emit("room_created", roomId);
    });

    /** ✅ Rejoindre une Room */
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

    /** ✅ Gestion des déconnexions */
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);
        markPlayerAsDisconnected(socket.id);
    });

    /** ✅ Reconnexion d'un joueur */
    socket.on("rejoin_game", ({ roomId, name, avatar }) => {
        if (rooms[roomId]) {
            console.log(`🔄 ${name} tente de rejoindre Room ${roomId} après reconnexion.`);
            clearTimeout(disconnectTimers[socket.id]); // Annuler la suppression
            delete disconnectTimers[socket.id];

            socket.join(roomId);
            const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                rooms[roomId].players[playerIndex].id = socket.id; // Mise à jour de l'ID du joueur
            }

            io.to(roomId).emit("opponent_reconnected", { name, avatar });
        } else {
            console.warn(`⚠️ Room ${roomId} introuvable lors de la reconnexion de ${name}.`);
        }
    });

    /** ✅ Quitter une Room */
    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });
});

/** ✅ Fonction pour démarrer la partie */
function startGame(roomId) {
    if (!rooms[roomId] || rooms[roomId].players.length !== 2) {
        console.warn(`⚠️ Tentative de démarrage de la room ${roomId} mais pas assez de joueurs.`);
        return;
    }

    const [player1, player2] = rooms[roomId].players;

    import("./public/js/deck.js").then(({ default: Deck }) => {
        const deck = new Deck();
        const decks = deck.creerDecksJoueurs();

        console.log(`🎮 Début de la partie dans Room ${roomId}`);
        console.log(`👤 Joueur 1 : ${player1.name} - 👤 Joueur 2 : ${player2.name}`);

        io.to(roomId).emit("game_start", {
            decks,
            players: [player1, player2]
        });
    });
}

/** ✅ Fonction pour gérer une déconnexion temporaire */
function markPlayerAsDisconnected(socketId) {
    for (const roomId in rooms) {
        const player = rooms[roomId].players.find(p => p.id === socketId);
        if (player) {
            console.warn(`⚠️ Joueur ${player.name} marqué comme déconnecté, attente 10s pour reconnexion...`);
            io.to(roomId).emit("opponent_disconnected", { name: player.name });

            disconnectTimers[socketId] = setTimeout(() => {
                removePlayerFromRoom(socketId);
            }, 10000);
        }
    }
}

/** ✅ Fonction pour supprimer un joueur d'une room */
function removePlayerFromRoom(socketId) {
    for (const roomId in rooms) {
        const playerIndex = rooms[roomId].players.findIndex((player) => player.id === socketId);

        if (playerIndex !== -1) {
            console.log(`🛑 Suppression confirmée de ${rooms[roomId].players[playerIndex].name} dans la Room ${roomId}`);
            rooms[roomId].players.splice(playerIndex, 1);
        }

        if (rooms[roomId].players.length === 0) {
            console.log(`🗑️ Suppression de la Room ${roomId} car elle est vide.`);
            delete rooms[roomId];
        } else {
            io.to(roomId).emit("player_disconnected");
        }
    }
}

// ✅ Démarrer le serveur
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));