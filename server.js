import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Deck from './public/js/deck.js';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration globale
const CONFIG = {
    PORT: process.env.PORT || 10000,
    CLIENT_URL: "https://seriousgame-ds65.onrender.com",
    STATIC_PATHS: {
        PUBLIC: path.join(__dirname, 'public'),
        AVATARS: path.join(__dirname, 'public', 'Avatars'),
        JS: path.join(__dirname, 'public', 'js'),
        CSS: path.join(__dirname, 'public', 'css'),
        FAVICON: path.join(__dirname, 'public', 'favicon_io'),
        CARTES: path.join(__dirname, 'public', 'Cartes')
    },
    CORS_OPTIONS: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    GAME: {
        MAX_PLAYERS_PER_ROOM: 2,
        INITIAL_HAND_SIZE: 5,
        CLEANUP_INTERVAL: 3600000, // 1 heure
        MAX_INACTIVE_TIME: 3600000 // 1 heure
    }
};

// Gestionnaire de Room
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.waitingPlayers = [];
        this.playerRooms = new Map();
    }

    createRoom(roomCode, creator) {
        try {
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

            this.rooms.set(roomCode, room);
            this.playerRooms.set(creator.id, roomCode);
            console.log(`🏠 Room ${roomCode} créée par ${creator.name}`);
            return room;
        } catch (error) {
            console.error('❌ Erreur lors de la création de la room:', error);
            throw error;
        }
    }

    joinRoom(roomCode, player) {
        try {
            const room = this.rooms.get(roomCode);
            if (!room || room.players.length >= CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
                return null;
            }

            room.players.push(player);
            this.playerRooms.set(player.id, roomCode);
            console.log(`👋 ${player.name} a rejoint la room ${roomCode}`);
            return room;
        } catch (error) {
            console.error('❌ Erreur lors de la jointure de la room:', error);
            return null;
        }
    }

    leaveRoom(playerId) {
        try {
            const roomCode = this.playerRooms.get(playerId);
            if (!roomCode) return;

            const room = this.rooms.get(roomCode);
            if (!room) return;

            room.players = room.players.filter(p => p.id !== playerId);
            this.playerRooms.delete(playerId);

            if (room.players.length === 0) {
                this.rooms.delete(roomCode);
                console.log(`🗑️ Room ${roomCode} supprimée (vide)`);
            }

            return room;
        } catch (error) {
            console.error('❌ Erreur lors du départ de la room:', error);
            return null;
        }
    }

    getRoomByCode(roomCode) {
        return this.rooms.get(roomCode);
    }

    getRoomByPlayerId(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        return roomCode ? this.rooms.get(roomCode) : null;
    }

    cleanInactiveRooms() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [roomCode, room] of this.rooms) {
            if (now - room.createdAt > CONFIG.GAME.MAX_INACTIVE_TIME) {
                this.rooms.delete(roomCode);
                room.players.forEach(player => {
                    this.playerRooms.delete(player.id);
                });
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 ${cleanedCount} rooms inactives nettoyées`);
        }
    }
}

// Gestionnaire de Jeu
class GameManager {
    constructor(io, roomManager) {
        this.io = io;
        this.roomManager = roomManager;
        this.deck = new Deck();
    }

    initializeGame(room) {
        try {
            console.log(`🎮 Initialisation du jeu pour la room ${room.code}`);
            const decks = this.deck.creerDecksJoueurs();

            room.gameState = {
                ...room.gameState,
                status: 'playing',
                playerDecks: new Map([
                    [room.players[0].id, decks.joueur1],
                    [room.players[1].id, decks.joueur2]
                ]),
                turn: room.players[0].id
            };

            // Distribution des mains initiales
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

            console.log(`✅ Jeu initialisé pour la room ${room.code}`);
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du jeu:', error);
            return false;
        }
    }

    handleCardPlayed(socket, data) {
        try {
            const room = this.roomManager.getRoomByPlayerId(socket.id);
            if (!this.validateCardPlay(room, socket.id, data)) {
                return false;
            }

            room.gameState.playedCards.set(data.slot, {
                playerId: socket.id,
                card: data.cardData
            });

            socket.to(room.code).emit('cardPlayed', {
                cardId: data.cardId,
                slot: data.slot,
                playerId: socket.id,
                cardData: data.cardData
            });

            this.nextTurn(room);
            return true;
        } catch (error) {
            console.error('❌ Erreur lors du jeu de la carte:', error);
            return false;
        }
    }

    validateCardPlay(room, playerId, data) {
        if (!room) {
            console.error('❌ Room non trouvée');
            return false;
        }
        if (room.gameState.status !== 'playing') {
            console.error('❌ La partie n\'est pas en cours');
            return false;
        }
        if (room.gameState.turn !== playerId) {
            console.error('❌ Ce n\'est pas votre tour');
            return false;
        }
        if (room.gameState.playedCards.has(data.slot)) {
            console.error('❌ Slot déjà occupé');
            return false;
        }
        return true;
    }

    nextTurn(room) {
        try {
            const currentPlayerIndex = room.players.findIndex(p => p.id === room.gameState.turn);
            const nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
            room.gameState.turn = room.players[nextPlayerIndex].id;

            this.io.to(room.code).emit('turnUpdate', room.gameState.turn);
        } catch (error) {
            console.error('❌ Erreur lors du changement de tour:', error);
        }
    }
}

// Configuration des middlewares
function setupMiddlewares(app) {
    // CORS
    app.use(cors(CONFIG.CORS_OPTIONS));

    // Body parsers
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Configuration du cache pour les images
    const cacheOptions = {
        setHeaders: (res, path) => {
            if (path.match(/\.(jpg|jpeg|png|gif)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=3600');
            }
            if (path.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
            }
        }
    };

    // Routes statiques avec cache
    Object.entries(CONFIG.STATIC_PATHS).forEach(([key, path]) => {
        const route = `/${key.toLowerCase()}`;
        app.use(route, express.static(path, cacheOptions));
        console.log(`📂 Route statique configurée: ${route} -> ${path}`);
    });

    // Dossier public principal
    app.use(express.static(CONFIG.STATIC_PATHS.PUBLIC));

    // Logging en développement
    if (process.env.NODE_ENV !== 'production') {
        app.use((req, res, next) => {
            console.log(`📝 ${req.method} ${req.url}`);
            next();
        });
    }
}

// Configuration des routes
function setupRoutes(app) {
    // Routes principales
    const routes = [
        { path: '/', file: 'index.html' },
        { path: '/choose-mode', file: 'choose-mode.html' },
        { path: '/room-choice', file: 'room-choice.html' },
        { path: '/gameboard', file: 'gameboard.html' }
    ];

    routes.forEach(route => {
        app.get(route.path, (req, res) => {
            res.sendFile(path.join(CONFIG.STATIC_PATHS.PUBLIC, route.file));
        });
    });

    // Route de monitoring
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            memory: process.memoryUsage(),
            activeRooms: roomManager.rooms.size,
            waitingPlayers: roomManager.waitingPlayers.length
        });
    });
}

// Configuration des événements socket
function setupSocketEvents(io, roomManager, gameManager) {
    io.on('connection', (socket) => {
        console.log(`✅ Joueur connecté: ${socket.id}`);

        socket.on('createRoom', (userData) => handleCreateRoom(socket, userData, roomManager));
        socket.on('joinRoom', (data) => handleJoinRoom(socket, data, roomManager, gameManager));
        socket.on('findRandomGame', (userData) => handleFindRandomGame(socket, userData, roomManager, gameManager, io));
        socket.on('cardPlayed', (data) => handleCardPlayed(socket, data, gameManager));
        socket.on('disconnect', () => handleDisconnect(socket, roomManager, io));
    });
}

// Gestionnaires d'événements socket
function handleCreateRoom(socket, userData, roomManager) {
    try {
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
    } catch (error) {
        console.error('❌ Erreur lors de la création de la room:', error);
        socket.emit('roomError', 'Erreur lors de la création de la room');
    }
}

function handleJoinRoom(socket, data, roomManager, gameManager) {
    try {
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
    } catch (error) {
        console.error('❌ Erreur lors de la jointure de la room:', error);
        socket.emit('roomError', 'Erreur lors de la jointure de la room');
    }
}

function handleFindRandomGame(socket, userData, roomManager, gameManager, io) {
    try {
        if (!validateUserData(userData)) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        if (roomManager.waitingPlayers.length > 0) {
            const opponent = roomManager.waitingPlayers.pop();
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
            
            const room = roomManager.createRoom(roomCode, opponent);
            roomManager.joinRoom(roomCode, { id: socket.id, ...userData });

            socket.join(roomCode);
            io.to(opponent.id).emit('gameStart', { roomCode });
            io.to(socket.id).emit('gameStart', { roomCode });

            gameManager.initializeGame(room);
        } else {
            roomManager.waitingPlayers.push({ id: socket.id, ...userData });
            socket.emit('waitingForOpponent');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la recherche de partie:', error);
        socket.emit('roomError', 'Erreur lors de la recherche de partie');
    }
}

function handleCardPlayed(socket, data, gameManager) {
    try {
        gameManager.handleCardPlayed(socket, data);
    } catch (error) {
        console.error('❌ Erreur lors du jeu de la carte:', error);
        socket.emit('gameError', 'Erreur lors du jeu de la carte');
    }
}

function handleDisconnect(socket, roomManager, io) {
    try {
        console.log(`👋 Joueur déconnecté: ${socket.id}`);
        
        const room = roomManager.leaveRoom(socket.id);
        if (room) {
            io.to(room.code).emit('opponentLeft', 'Votre adversaire a quitté la partie.');
        }

        const waitingIndex = roomManager.waitingPlayers.findIndex(p => p.id === socket.id);
        if (waitingIndex !== -1) {
            roomManager.waitingPlayers.splice(waitingIndex, 1);
            console.log(`🔄 Joueur retiré de la file d'attente: ${socket.id}`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error);
    }
}

// Utilitaires
function validateUserData(userData) {
    return userData && 
           typeof userData.name === 'string' && 
           userData.name.length >= 2 && 
           userData.name.length <= 20 &&
           ['male', 'female'].includes(userData.sex) &&
           userData.avatarId;
}

// Vérification des fichiers essentiels
function checkEssentialFiles() {
    const essentialFiles = [
        { path: path.join(CONFIG.STATIC_PATHS.AVATARS, 'default-avatar.jpeg'), name: 'Avatar par défaut' },
        { path: path.join(CONFIG.STATIC_PATHS.CARTES, 'dos.png'), name: 'Dos de carte' }
    ];

    essentialFiles.forEach(file => {
        try {
            if (fs.existsSync(file.path)) {
                console.log(`✅ ${file.name} trouvé`);
            } else {
                console.error(`❌ ${file.name} manquant: ${file.path}`);
            }
        } catch (error) {
            console.error(`❌ Erreur lors de la vérification de ${file.name}:`, error);
        }
    });
}

// Vérification de la structure des dossiers
function checkFolderStructure() {
    Object.entries(CONFIG.STATIC_PATHS).forEach(([name, path]) => {
        try {
            const stats = fs.statSync(path);
            if (stats.isDirectory()) {
                console.log(`✅ Dossier ${name} trouvé`);
                if (name === 'AVATARS' || name === 'CARTES') {
                    const files = fs.readdirSync(path);
                    console.log(`   📂 Contenu (${files.length} fichiers):`);
                    files.forEach(file => console.log(`   - ${file}`));
                }
            } else {
                console.error(`❌ ${name} n'est pas un dossier: ${path}`);
            }
        } catch (error) {
            console.error(`❌ Dossier ${name} non trouvé: ${path}`);
            console.error('   Erreur:', error.message);
        }
    });
}

// Initialisation du serveur
const app = express();
console.log('🚀 Démarrage du serveur...');

// Mise en place des middlewares et routes
setupMiddlewares(app);
setupRoutes(app);

// Création du serveur HTTP
const server = createServer(app);

// Configuration de Socket.IO
const io = new Server(server, {
    cors: CONFIG.CORS_OPTIONS,
    transports: ['websocket']
});

// Initialisation des gestionnaires
const roomManager = new RoomManager();
const gameManager = new GameManager(io, roomManager);

// Mise en place des événements socket
setupSocketEvents(io, roomManager, gameManager);

// Nettoyage périodique
setInterval(() => {
    roomManager.cleanInactiveRooms();
}, CONFIG.GAME.CLEANUP_INTERVAL);

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejetée non gérée:', reason);
});

// Démarrage du serveur
server.listen(CONFIG.PORT, '0.0.0.0', () => {
    console.log(`\n✨ Initialisation du serveur de jeu ✨`);
    console.log('----------------------------------------');
    console.log(`✅ Port: ${CONFIG.PORT}`);
    console.log(`📍 URL: ${CONFIG.CLIENT_URL}`);
    console.log(`🌍 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log('----------------------------------------');

    // Vérification de la structure
    console.log('\n📁 Vérification de la structure:');
    checkFolderStructure();
    
    console.log('\n🔍 Vérification des fichiers essentiels:');
    checkEssentialFiles();

    console.log('\n📊 État initial:');
    console.log(`   Rooms actives: ${roomManager.rooms.size}`);
    console.log(`   Joueurs en attente: ${roomManager.waitingPlayers.length}`);
    
    console.log('\n🚀 Serveur prêt à recevoir des connexions\n');
});

// Export des modules nécessaires
export { 
    app, 
    io, 
    server, 
    roomManager, 
    gameManager, 
    CONFIG 
};