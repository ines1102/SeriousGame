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
app.use(express.static(path.join(path.resolve(), "public"))); 

// Stockage des rooms et joueurs
const rooms = {}; 
const reconnectingPlayers = new Map(); 

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

    /** ✅ Gestion des déconnexions avec **vérification avant suppression** */
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);

        let roomId = null;
        for (const id in rooms) {
            const playerIndex = rooms[id].players.findIndex((player) => player.id === socket.id);

            if (playerIndex !== -1) {
                roomId = id;
                const disconnectedPlayer = rooms[id].players[playerIndex];

                console.log(`❌ Joueur ${disconnectedPlayer.name} marqué comme déconnecté dans Room ${roomId}`);

                // **Attendre 10 secondes et vérifier avec un ping**
                reconnectingPlayers.set(socket.id, { roomId, player: disconnectedPlayer });

                let stillConnected = false;

                const checkConnection = setInterval(() => {
                    if (io.sockets.sockets.get(socket.id)) {
                        stillConnected = true;
                        clearInterval(checkConnection);
                        console.log(`✅ ${disconnectedPlayer.name} est revenu, annulation de la suppression.`);
                        reconnectingPlayers.delete(socket.id);
                    }
                }, 2000);

                setTimeout(() => {
                    if (!stillConnected) {
                        console.log(`🛑 Suppression confirmée de ${disconnectedPlayer.name} (déconnexion réelle)`);
                        rooms[roomId].players.splice(playerIndex, 1);

                        if (rooms[roomId].players.length === 1) {
                            const remainingPlayer = rooms[roomId].players[0];
                            console.log(`⚠️ L'autre joueur ${remainingPlayer.name} est toujours connecté.`);
                            io.to(remainingPlayer.id).emit("opponent_disconnected");
                        } else if (rooms[roomId].players.length === 0) {
                            console.log(`🗑️ Suppression de Room ${roomId} car elle est vide.`);
                            delete rooms[roomId];
                        }
                    }
                }, 10000);
            }
        }
    });

    /** ✅ Gérer la reconnexion d'un joueur */
    socket.on("rejoin_game", ({ roomId, name, avatar }) => {
        if (rooms[roomId]) {
            console.log(`🔄 ${name} tente de rejoindre Room ${roomId} après reconnexion.`);
            rooms[roomId].players.push({ id: socket.id, name, avatar });

            io.to(roomId).emit("opponent_reconnected", { name, avatar });
        } else {
            console.log(`❌ Room ${roomId} n'existe plus, redirection vers l'accueil.`);
            io.to(socket.id).emit("force_leave_game");
        }
    });

    /** ✅ Quitter une Room proprement */
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
            player1: { name: player1.name, avatar: player1.avatar },
            player2: { name: player2.name, avatar: player2.avatar }
        });
    });
}

// Démarrer le serveur
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));