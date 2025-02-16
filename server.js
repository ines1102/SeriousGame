import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 10000;
const CLIENT_URL = "https://seriousgame-ds65.onrender.com"; // ⚠️ Adapte si nécessaire

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"]
    }
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public")));

// **📌 Routes pour servir les pages HTML**
app.get("/", (req, res) => res.sendFile(path.join(path.resolve(), "public", "index.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(path.resolve(), "public", "gameboard.html")));

// **📌 Gestion des rooms**
const rooms = {}; // Stocke les joueurs connectés dans chaque room

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    socket.on("join_game", ({ roomId, name, avatar }) => {
        if (!roomId || !name || !avatar) {
            console.error(`❌ Données invalides pour rejoindre une room :`, { roomId, name, avatar });
            return;
        }

        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }

        if (rooms[roomId].players.length >= 2) {
            console.warn(`⚠️ Room ${roomId} est pleine, impossible de rejoindre.`);
            socket.emit("room_full");
            return;
        }

        // **📌 Ajout du joueur à la room**
        socket.join(roomId);
        rooms[roomId].players.push({ id: socket.id, name, avatar });

        console.log(`👥 ${name} a rejoint la Room ${roomId}`);

        if (rooms[roomId].players.length === 2) {
            const [player1, player2] = rooms[roomId].players;
            console.log(`✅ Room ${roomId} complète : ${player1.name} vs ${player2.name}`);

            // **📌 Envoi des informations des joueurs aux clients**
            io.to(roomId).emit("players_ready", {
                player1,
                player2
            });
        }
    });

    // **📌 Déconnexion propre (gérée plus tard)**
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);
        removePlayerFromRoom(socket.id);
    });
});

/** 
 * **📌 Fonction pour retirer un joueur d'une room**
 */
function removePlayerFromRoom(socketId) {
    for (const roomId in rooms) {
        const playerIndex = rooms[roomId].players.findIndex((player) => player.id === socketId);

        if (playerIndex !== -1) {
            console.log(`❌ Joueur ${rooms[roomId].players[playerIndex].name} supprimé de Room ${roomId}`);
            rooms[roomId].players.splice(playerIndex, 1);
        }

        // **📌 Suppression de la room si elle est vide**
        if (rooms[roomId].players.length === 0) {
            console.log(`🗑️ Suppression de Room ${roomId} car elle est vide.`);
            delete rooms[roomId];
        }
    }
}

// **📌 Démarrer le serveur**
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));