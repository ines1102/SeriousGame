import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// 📌 Configuration pour ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;

// 📌 Servir les fichiers statiques
app.use(express.static(path.join(__dirname, "public")));

// 📌 Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(__dirname, "public/choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(__dirname, "public/room-choice.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(__dirname, "public/gameboard.html")));

// 📌 Gestion des rooms et joueurs
let rooms = {};
let waitingPlayer = null; // Pour stocker un joueur en attente de partie aléatoire

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

    // 📌 Rejoindre une room spécifique (mode avec un ami)
    socket.on("join_private_game", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: {} };
        }

        rooms[roomId].players[socket.id] = { id: socket.id, name, avatar };
        socket.join(roomId);

        console.log(`👥 Joueur ${name} a rejoint Room ${roomId}`);

        // Vérifier si la room a 2 joueurs et lancer le jeu
        startGameIfReady(roomId);
    });

    // 📌 Mode Aléatoire : Rejoindre un adversaire aléatoire
    socket.on("join_random_game", ({ name, avatar }) => {
        if (waitingPlayer) {
            const roomId = generateRoomId();
            rooms[roomId] = { players: {} };

            // Associer les deux joueurs à la même room
            rooms[roomId].players[waitingPlayer.id] = waitingPlayer;
            rooms[roomId].players[socket.id] = { id: socket.id, name, avatar };

            io.to(waitingPlayer.id).emit("game_found", { roomId });
            io.to(socket.id).emit("game_found", { roomId });

            // Faire rejoindre la room
            io.sockets.sockets.get(waitingPlayer.id).join(roomId);
            socket.join(roomId);

            console.log(`🎮 Match Aléatoire : ${waitingPlayer.name} vs ${name} dans Room ${roomId}`);

            // Lancer la partie
            startGameIfReady(roomId);

            waitingPlayer = null; // Reset l'attente
        } else {
            // Stocker le joueur en attente
            waitingPlayer = { id: socket.id, name, avatar };
            console.log(`⌛ Joueur ${name} en attente d'un adversaire...`);
        }
    });

    // 📌 Jouer une carte
    socket.on("play_card", ({ roomId, player, card, slot }) => {
        io.to(roomId).emit("card_played", { player, card, slot });
    });

    // 📌 Gestion de la déconnexion
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);

        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];

                // Si l'autre joueur est toujours présent, il doit être informé
                const remainingPlayers = Object.keys(rooms[roomId].players);
                if (remainingPlayers.length === 0) {
                    delete rooms[roomId];
                    console.log(`🗑️ Suppression de la Room ${roomId}`);
                } else {
                    io.to(roomId).emit("opponent_disconnected");
                }
            }
        }

        // Si un joueur était en attente de match aléatoire, l'annuler
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
        }
    });
});

// 📌 Fonction pour démarrer une partie si 2 joueurs sont prêts
function startGameIfReady(roomId) {
    const players = Object.values(rooms[roomId].players);
    if (players.length === 2) {
        io.to(roomId).emit("game_start", {
            player1: players[0],
            player2: players[1],
        });
        console.log(`🎮 Début du jeu Room ${roomId} : ${players[0].name} vs ${players[1].name}`);
    }
}

// 📌 Générer un ID unique pour une room
function generateRoomId() {
    return Math.random().toString(36).substr(2, 6);
}

// 📌 Démarrer le serveur
httpServer.listen(PORT, () => console.log(`🚀 Serveur en ligne sur http://localhost:${PORT}`));