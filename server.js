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

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(__dirname, "public/choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(__dirname, "public/room-choice.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(__dirname, "public/gameboard.html")));

let rooms = {};
let waitingPlayer = null;

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    socket.on("find_random_room", ({ name, avatar }) => {
        if (waitingPlayer) {
            const roomId = generateRoomId();
            rooms[roomId] = { players: {} };

            rooms[roomId].players[waitingPlayer.id] = waitingPlayer;
            rooms[roomId].players[socket.id] = { id: socket.id, name, avatar };

            io.to(waitingPlayer.id).emit("game_found", { roomId });
            io.to(socket.id).emit("game_found", { roomId });

            io.sockets.sockets.get(waitingPlayer.id)?.join(roomId);
            socket.join(roomId);

            console.log(`🎮 Match Aléatoire : ${waitingPlayer.name} vs ${name} dans Room ${roomId}`);

            startGameIfReady(roomId);

            waitingPlayer = null;
        } else {
            waitingPlayer = { id: socket.id, name, avatar };
            console.log(`⌛ Joueur ${name} en attente d'un adversaire...`);
        }
    });

    socket.on("join_private_game", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {} };
        }

        rooms[roomId].players[socket.id] = { id: socket.id, name, avatar };
        socket.join(roomId);

        console.log(`👥 Joueur ${name} a rejoint Room ${roomId}`);

        io.to(socket.id).emit("room_joined", { roomId });

        startGameIfReady(roomId);
    });

    function startGameIfReady(roomId) {
        const players = Object.values(rooms[roomId]?.players || {});

        if (players.length === 2) {
            console.log(`🎮 Début du jeu Room ${roomId} : ${players[0].name} vs ${players[1].name}`);

            io.to(roomId).emit("game_start", {
                player1: players[0],
                player2: players[1],
            });

            console.log("📌 Profils des joueurs envoyés aux clients :", players);
        }
    }

    socket.on("check_game_start", ({ roomId }) => {
        if (!rooms[roomId]) return;
        
        const players = Object.values(rooms[roomId].players);
        
        if (players.length === 2) {
            console.log(`🔄 Réémission de \`game_start\` pour Room ${roomId} : ${players[0].name} vs ${players[1].name}`);
            io.to(roomId).emit("game_start", { player1: players[0], player2: players[1] });
        } else {
            console.log(`⚠️ Impossible d'envoyer \`game_start\` : il manque un joueur dans Room ${roomId}`);
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);

        for (const roomId in rooms) {
            if (rooms[roomId]?.players[socket.id]) {
                delete rooms[roomId].players[socket.id];

                const remainingPlayers = Object.keys(rooms[roomId].players);

                if (remainingPlayers.length === 0) {
                    delete rooms[roomId];
                    console.log(`🗑️ Suppression de la Room ${roomId}`);
                } else {
                    console.log(`⚠️ Joueur déconnecté, mais l'autre joueur est toujours présent.`);
                    io.to(roomId).emit("opponent_disconnected");

                    // ✅ Réémission de `game_start` si un joueur revient dans les 10s
                    setTimeout(() => {
                        if (rooms[roomId] && Object.keys(rooms[roomId].players).length === 1) {
                            console.log(`🔄 Tentative de récupération de la room ${roomId}`);
                            io.to(roomId).emit("wait_for_reconnect", { message: "Attente de votre adversaire..." });
                        }
                    }, 10000);
                }
            }
        }

        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

function generateRoomId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

httpServer.listen(PORT, () => console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`));