import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;

// 📌 Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// 📌 Routes HTML
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(__dirname, "public/choose-mode.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(__dirname, "public/gameboard.html")));

let rooms = {};
let waitingPlayer = null;

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    // 📌 Mode Aléatoire
    socket.on("find_random_room", ({ name, sex, avatar }) => {
        if (waitingPlayer) {
            const roomId = generateRoomId();
            rooms[roomId] = { players: {} };

            rooms[roomId].players[waitingPlayer.id] = waitingPlayer;
            rooms[roomId].players[socket.id] = { id: socket.id, name, sex, avatar };

            io.to(waitingPlayer.id).emit("game_found", { roomId });
            io.to(socket.id).emit("game_found", { roomId });

            io.sockets.sockets.get(waitingPlayer.id)?.join(roomId);
            socket.join(roomId);

            console.log(`🎮 Match Aléatoire : ${waitingPlayer.name} (${waitingPlayer.sex}) vs ${name} (${sex}) dans Room ${roomId}`);
            console.log(`👤 Joueur 1 :`, waitingPlayer);
            console.log(`👤 Joueur 2 :`, { id: socket.id, name, sex, avatar });

            startGameIfReady(roomId);
            waitingPlayer = null;
        } else {
            waitingPlayer = { id: socket.id, name, sex, avatar };
            console.log(`⌛ Joueur ${name} (${sex}) en attente d'un adversaire...`);
        }
    });

    // 📌 Mode Avec un Ami
    socket.on("join_private_game", ({ roomId, name, sex, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {} };
        }

        rooms[roomId].players[socket.id] = { id: socket.id, name, sex, avatar };
        socket.join(roomId);

        console.log(`👥 Joueur ${name} (${sex}) a rejoint Room ${roomId}`);

        io.to(socket.id).emit("room_joined", { roomId });

        startGameIfReady(roomId);
    });

    // 📌 Gestion des déconnexions
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);

        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];

                if (Object.keys(rooms[roomId].players).length === 0) {
                    delete rooms[roomId];
                    console.log(`🗑️ Suppression de la Room ${roomId}`);
                } else {
                    io.to(roomId).emit("opponent_disconnected");
                }
            }
        }

        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

// 📌 Vérifier si la room a 2 joueurs et démarrer la partie
function startGameIfReady(roomId) {
    if (rooms[roomId]) {
        const players = Object.values(rooms[roomId].players);
        if (players.length === 2) {
            io.to(roomId).emit("game_start", {
                player1: players[0],
                player2: players[1]
            });

            console.log(`🎮 Début du jeu Room ${roomId} : ${players[0].name} (${players[0].sex}) vs ${players[1].name} (${players[1].sex})`);
            console.log(`📌 Profils des joueurs mis à jour :`);
            console.log(`👤 Joueur 1 :`, players[0]);
            console.log(`👤 Joueur 2 :`, players[1]);
        } else {
            console.log(`⚠️ Impossible de démarrer le jeu dans la Room ${roomId}, il manque un joueur.`);
        }
    }
}

// 📌 Générer un ID unique de 4 chiffres pour les rooms privées
function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 📌 Démarrer le serveur
httpServer.listen(PORT, () => console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`));