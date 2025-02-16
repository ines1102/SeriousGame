import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static("public")); // Sert les fichiers statiques

// Routes
app.get("/", (req, res) => res.sendFile(__dirname + "/public/index.html"));
app.get("/choose-mode", (req, res) => res.sendFile(__dirname + "/public/choose-mode.html"));
app.get("/room-choice", (req, res) => res.sendFile(__dirname + "/public/room-choice.html"));
app.get("/gameboard", (req, res) => res.sendFile(__dirname + "/public/gameboard.html"));

const rooms = {}; // Stockage des rooms

io.on("connection", (socket) => {
    console.log(`🔗 Connexion : ${socket.id}`);

    socket.on("find_random_room", (player) => {
        let roomId = Object.keys(rooms).find((id) => rooms[id].length === 1);
        if (!roomId) {
            roomId = Math.floor(1000 + Math.random() * 9000).toString();
            rooms[roomId] = [];
        }
        joinRoom(socket, roomId, player);
    });

    socket.on("create_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        joinRoom(socket, roomId, { name, avatar });
        io.to(socket.id).emit("room_created", roomId);
    });

    socket.on("join_room", ({ roomId, name, avatar }) => {
        if (!rooms[roomId] || rooms[roomId].length >= 2) {
            io.to(socket.id).emit("room_not_found");
            return;
        }
        joinRoom(socket, roomId, { name, avatar });
    });

    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion : ${socket.id}`);
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(player => player.id !== socket.id);
            if (rooms[roomId].length === 0) delete rooms[roomId];
        }
    });
});

function joinRoom(socket, roomId, player) {
    socket.join(roomId);
    rooms[roomId].push({ id: socket.id, ...player });

    if (rooms[roomId].length === 2) {
        const [player1, player2] = rooms[roomId];

        const decks = {
            [player1.name]: generateDeck(),
            [player2.name]: generateDeck()
        };

        io.to(roomId).emit("game_start", { player1, player2, decks });
        console.log(`🎮 Début du jeu Room ${roomId} : ${player1.name} vs ${player2.name}`);
    }
}

function generateDeck() {
    return Array.from({ length: 5 }, (_, i) => ({ image: `/cards/card${i + 1}.png` }));
}

server.listen(10000, () => console.log("🚀 Serveur sur port 10000"));