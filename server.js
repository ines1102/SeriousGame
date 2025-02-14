import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 📌 Configuration
const CONFIG = {
    PORT: process.env.PORT || 10000,
    CLIENT_URL: "https://seriousgame-ds65.onrender.com",
    CORS_OPTIONS: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    GAME: {
        MAX_PLAYERS_PER_ROOM: 2,
        INITIAL_HAND_SIZE: 5,
        MAX_INACTIVE_TIME: 3600000 // 1 heure
    }
};

// 📌 État du serveur
class ServerState {
    constructor() {
        this.rooms = new Map();
        this.waitingPlayers = [];
        this.gameStates = new Map();
        this.playerRooms = new Map(); // Mappage joueur -> room
    }
}

// 📌 Gestionnaire de Room
class RoomManager {
    constructor(serverState) {
        this.state = serverState;
    }

    createRoom(roomCode, creator) {
        const room = {
            code: roomCode,
            players: [creator],
            gameState: {
                status: 'waiting',
                turn: creator.id,
                playedCards: new Map(),
                playerDecks: new Map(),
                startTime: Date.now()
            },
            createdAt: Date.now()
        };

        this.state.rooms.set(roomCode, room);
        this.state.playerRooms.set(creator.id, roomCode);
        return room;
    }

    joinRoom(roomCode, player) {
        const room = this.state.rooms.get(roomCode);
        if (!room || room.players.length >= CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
            return null;
        }

        room.players.push(player);
        this.state.playerRooms.set(player.id, roomCode);
        return room;
    }

    leaveRoom(playerId) {
        const roomCode = this.state.playerRooms.get(playerId);
        if (!roomCode) return;

        const room = this.state.rooms.get(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);
        this.state.playerRooms.delete(playerId);

        if (room.players.length === 0) {
            this.state.rooms.delete(roomCode);
            this.state.gameStates.delete(roomCode);
        }

        return room;
    }

    getRoomByCode(roomCode) {
        return this.state.rooms.get(roomCode);
    }

    getRoomByPlayerId(playerId) {
        const roomCode = this.state.playerRooms.get(playerId);
        return roomCode ? this.state.rooms.get(roomCode) : null;
    }

    cleanInactiveRooms() {
        const now = Date.now();
        for (const [roomCode, room] of this.state.rooms) {
            if (now - room.createdAt > CONFIG.GAME.MAX_INACTIVE_TIME) {
                this.state.rooms.delete(roomCode);
                room.players.forEach(player => {
                    this.state.playerRooms.delete(player.id);
                });
            }
        }
    }
}

// 📌 Gestionnaire de Jeu
class GameManager {
    constructor(io, roomManager) {
        this.io = io;
        this.roomManager = roomManager;
    }

    initializeGame(room) {
        try {
            // Créer les decks pour les deux joueurs
            const decks = this.createInitialDecks();
            
            // Mettre à jour l'état du jeu
            room.gameState = {
                ...room.gameState,
                status: 'playing',
                playerDecks: new Map([
                    [room.players[0].id, decks.joueur1],
                    [room.players[1].id, decks.joueur2]
                ]),
                turn: room.players[0].id
            };

            // Envoyer les mains initiales aux joueurs
            room.players.forEach((player, index) => {
                const playerDeck = index === 0 ? decks.joueur1 : decks.joueur2;
                this.io.to(player.id).emit('gameStart', {
                    players: room.players,
                    hands: {
                        playerHand: playerDeck.main,
                        deckSize: playerDeck.deck.length
                    }
                });
            });

            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du jeu:', error);
            return false;
        }
    }

    createInitialDecks() {
        // Créer et mélanger les decks
        const deckManager = new Deck();
        return deckManager.creerDecksJoueurs();
    }

    handleCardPlayed(socket, data) {
        const room = this.roomManager.getRoomByPlayerId(socket.id);
        if (!this.validateCardPlay(room, socket.id, data)) {
            return false;
        }

        // Mettre à jour l'état du jeu
        room.gameState.playedCards.set(data.slot, {
            playerId: socket.id,
            card: data.cardData
        });

        // Notifier les autres joueurs
        socket.to(room.code).emit('cardPlayed', {
            cardId: data.cardId,
            slot: data.slot,
            playerId: socket.id
        });

        // Changer le tour
        this.nextTurn(room);

        return true;
    }

    validateCardPlay(room, playerId, data) {
        if (!room || 
            room.gameState.status !== 'playing' ||
            room.gameState.turn !== playerId ||
            room.gameState.playedCards.has(data.slot)) {
            return false;
        }
        return true;
    }

    nextTurn(room) {
        const currentPlayerIndex = room.players.findIndex(p => p.id === room.gameState.turn);
        const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
        room.gameState.turn = room.players[nextPlayerIndex].id;

        this.io.to(room.code).emit('turnUpdate', room.gameState.turn);
    }

    checkGameEnd(room) {
        // Implémenter la logique de fin de partie
        return false;
    }
}

// 📌 Configuration des middlewares
function setupMiddlewares(app) {
    // CORS
    app.use(cors(CONFIG.CORS_OPTIONS));

    // Static files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/js', express.static(path.join(__dirname, 'public/js'), {
        setHeaders: (res, path) => {
            if (path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
        }
    }));
}

// 📌 Configuration des routes
function setupRoutes(app) {
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
    app.get('/choose-mode', (req, res) => res.sendFile(path.join(__dirname, 'public', 'choose-mode.html')));
    app.get('/room-choice', (req, res) => res.sendFile(path.join(__dirname, 'public', 'room-choice.html')));
    app.get('/gameboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gameboard.html')));

    // Route de monitoring
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            activeRooms: serverState.rooms.size,
            waitingPlayers: serverState.waitingPlayers.length
        });
    });
}

// 📌 Configuration des événements socket
function setupSocketEvents(io, roomManager, gameManager) {
    io.on('connection', (socket) => {
        console.log(`✅ Joueur connecté: ${socket.id}`);

        socket.on('createRoom', (userData) => handleCreateRoom(socket, userData, roomManager));
        socket.on('joinRoom', (data) => handleJoinRoom(socket, data, roomManager, gameManager));
        socket.on('findRandomGame', (userData) => handleFindRandomGame(socket, userData, roomManager, gameManager));
        socket.on('cardPlayed', (data) => handleCardPlayed(socket, data, gameManager));
        socket.on('disconnect', () => handleDisconnect(socket, roomManager));
    });
}

// 📌 Handlers des événements socket
function handleCreateRoom(socket, userData, roomManager) {
    if (!validateUserData(userData)) {
        socket.emit('roomError', 'Données utilisateur invalides');
        return;
    }

    let roomCode;
    do {
        roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    } while (roomManager.getRoomByCode(roomCode));

    const room = roomManager.createRoom(roomCode, { id: socket.id, ...userData });
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
}

function handleJoinRoom(socket, data, roomManager, gameManager) {
    if (!validateUserData(data)) {
        socket.emit('roomError', 'Données invalides');
        return;
    }

    const room = roomManager.joinRoom(data.roomCode, { id: socket.id, ...data });
    if (!room) {
        socket.emit('roomError', 'Room invalide ou pleine');
        return;
    }

    socket.join(data.roomCode);

    if (room.players.length === CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
        gameManager.initializeGame(room);
    }
}

function handleFindRandomGame(socket, userData, roomManager, gameManager) {
    if (!validateUserData(userData)) {
        socket.emit('roomError', 'Données utilisateur invalides');
        return;
    }

    const serverState = roomManager.state;
    
    if (serverState.waitingPlayers.length > 0) {
        const opponent = serverState.waitingPlayers.pop();
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        const room = roomManager.createRoom(roomCode, opponent);
        roomManager.joinRoom(roomCode, { id: socket.id, ...userData });

        socket.join(roomCode);
        io.to(opponent.id).emit('gameStart', { roomCode });
        io.to(socket.id).emit('gameStart', { roomCode });

        gameManager.initializeGame(room);
    } else {
        serverState.waitingPlayers.push({ id: socket.id, ...userData });
        socket.emit('waitingForOpponent');
    }
}

function handleCardPlayed(socket, data, gameManager) {
    gameManager.handleCardPlayed(socket, data);
}

function handleDisconnect(socket, roomManager) {
    const room = roomManager.leaveRoom(socket.id);
    if (room) {
        socket.to(room.code).emit('opponentLeft', 'Votre adversaire a quitté la partie.');
    }

    const serverState = roomManager.state;
    const waitingIndex = serverState.waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
        serverState.waitingPlayers.splice(waitingIndex, 1);
    }
}

// 📌 Utilitaires
function validateUserData(userData) {
    return userData && 
           typeof userData.name === 'string' && 
           userData.name.length >= 2 && 
           userData.name.length <= 20;
}

// 📌 Initialisation du serveur
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: CONFIG.CORS_OPTIONS
});

const serverState = new ServerState();
const roomManager = new RoomManager(serverState);
const gameManager = new GameManager(io, roomManager);

setupMiddlewares(app);
setupRoutes(app);
setupSocketEvents(io, roomManager, gameManager);

// 📌 Nettoyage périodique
setInterval(() => {
    roomManager.cleanInactiveRooms();
}, CONFIG.GAME.MAX_INACTIVE_TIME);

// 📌 Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejetée non gérée:', reason);
});

// 📌 Démarrage du serveur
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur démarré sur le port ${CONFIG.PORT}`);
    console.log(`📍 URL: ${CONFIG.CLIENT_URL}`);
});

export { app, io, serverState, roomManager, gameManager };