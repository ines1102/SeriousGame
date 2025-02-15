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
// 🔴 Ajout pour servir les images des avatars
app.use("/Avatars", express.static(path.join(path.resolve(), "public", "Avatars")));

// Routes pour servir les pages HTML
app.get("/", (req, res) => res.sendFile(path.join(path.resolve(), "public", "index.html")));
app.get("/choose-mode", (req, res) => res.sendFile(path.join(path.resolve(), "public", "choose-mode.html")));
app.get("/room-choice", (req, res) => res.sendFile(path.join(path.resolve(), "public", "room-choice.html")));
app.get("/gameboard", (req, res) => res.sendFile(path.join(path.resolve(), "public", "gameboard.html")));

// Stockage des rooms et joueurs
const rooms = {};

io.on("connection", (socket) => {
    console.log(`🔗 Nouvelle connexion : ${socket.id}`);

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

    /** Mode Jouer entre amis */
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

    /** 🔌 Déconnexion d'un joueur */
    socket.on("disconnect", () => {
        console.log(`🔌 Déconnexion détectée : ${socket.id}`);
    
        let roomId = null;
        for (const id in rooms) {
            const playerIndex = rooms[id].players.findIndex((player) => player.id === socket.id);
    
            if (playerIndex !== -1) {
                roomId = id;
                const disconnectedPlayer = rooms[id].players[playerIndex];
    
                console.log(`❌ Joueur ${disconnectedPlayer.name} déconnecté de la room ${roomId}`);
    
                // ⏳ Attendre quelques secondes avant de supprimer le joueur
                setTimeout(() => {
                    if (!io.sockets.sockets.get(socket.id)) {
                        console.log(`🛑 Suppression confirmée de ${disconnectedPlayer.name} (déconnexion réelle)`);
                        rooms[id].players.splice(playerIndex, 1);
    
                        if (rooms[roomId].players.length === 1) {
                            const remainingPlayer = rooms[roomId].players[0];
                            console.log(`⚠️ L'autre joueur ${remainingPlayer.name} est toujours connecté.`);
                            io.to(remainingPlayer.id).emit("opponent_disconnected");
                        } else if (rooms[roomId].players.length === 0) {
                            console.log(`🗑️ Suppression de Room ${roomId} car elle est vide.`);
                            delete rooms[roomId];
                        }
                    } else {
                        console.log(`✅ ${disconnectedPlayer.name} est revenu, annulation de la suppression.`);
                    }
                }, 5000); // ⏳ Attente de 5s avant de confirmer la suppression
            }
        }
    });

    /** 🔴 Quitter une Room manuellement */
    socket.on("leave_room", () => {
        removePlayerFromRoom(socket.id);
    });

    socket.on("rejoin_game", ({ roomId, name, avatar }) => {
        if (rooms[roomId]) {
            console.log(`🔄 ${name} tente de rejoindre Room ${roomId} après reconnexion.`);
            rooms[roomId].players.push({ id: socket.id, name, avatar });
    
            // Informer l'adversaire que le joueur est revenu
            socket.to(roomId).emit("opponent_reconnected", { name, avatar });
        } else {
            console.log(`❌ Room ${roomId} n'existe plus, redirection vers l'accueil.`);
            socket.emit("force_leave_game");
        }
    });

    /** Déconnexion forcée (test) */
    socket.on("force_disconnect", () => {
        console.log(`🔌 Déconnexion forcée pour ${socket.id}`);
        socket.disconnect();
    });
});

/** 🔥 Fonction pour démarrer le jeu */
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

        // ✅ Notifier que les deux joueurs sont prêts
        io.to(roomId).emit("players_ready", {
            player1: { name: player1.name, avatar: player1.avatar },
            player2: { name: player2.name, avatar: player2.avatar }
        });
    });
}

/** 🔥 Fonction pour supprimer un joueur d'une Room */
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

// 🚀 Démarrer le serveur
server.listen(PORT, () => console.log(`🚀 Serveur lancé sur le port ${PORT}`));