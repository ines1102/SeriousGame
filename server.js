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
const rooms = {};

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

        console.log(`👥 Joueur ajouté : ${playerData.name} dans Room ${roomId}`);

        if (rooms[roomId].players.length === 2) {
            console.log(`✅ 2 joueurs trouvés dans Room ${roomId}, démarrage du jeu.`);
            io.to(roomId).emit("room_found", roomId);
            startGame(roomId);
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);

        let roomId = null;
        for (const id in rooms) {
            const playerIndex = rooms[id].players.findIndex((player) => player.id === socket.id);

            if (playerIndex !== -1) {
                roomId = id;
                console.log(`❌ Joueur ${rooms[id].players[playerIndex].name} déconnecté de la room ${roomId}`);
                rooms[id].players.splice(playerIndex, 1);
                break;
            }
        }

        if (roomId && rooms[roomId].players.length === 1) {
            console.log(`⚠️ Un seul joueur reste dans la room ${roomId}, mais le jeu continue.`);
            io.to(roomId).emit("player_left", { message: "Votre adversaire s'est déconnecté." });
        } else if (roomId && rooms[roomId].players.length === 0) {
            console.log(`🗑️ Suppression de Room ${roomId} car elle est vide.`);
            delete rooms[roomId];
        }
    });

    socket.on("force_disconnect", () => {
        console.log(`🔌 Déconnexion forcée pour ${socket.id}`);
        socket.disconnect();
    });
});

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

        io.to(player1.id).emit("game_start", {
            decks: decks.joueur1,
            turn: player1.name,
            opponent: { name: player2.name, avatar: player2.avatar }
        });

        io.to(player2.id).emit("game_start", {
            decks: decks.joueur2,
            turn: player1.name,
            opponent: { name: player1.name, avatar: player1.avatar }
        });

        // ✅ Correction : Ajout d'une confirmation aux joueurs qu'ils sont bien en jeu
        io.to(roomId).emit("players_ready", {
            player1: { name: player1.name, avatar: player1.avatar },
            player2: { name: player2.name, avatar: player2.avatar }
        });
    });
}

server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));