import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GameServer {
    constructor() {
        this.CONFIG = {
            PORT: process.env.PORT || 10000,
            CLIENT_URL: "https://seriousgame-ds65.onrender.com",
            STATIC_PATHS: {
                PUBLIC: path.join(__dirname, 'public'),
                AVATARS: path.join(__dirname, 'public', 'Avatars'),
                JS: path.join(__dirname, 'public', 'js'),
                CSS: path.join(__dirname, 'public', 'css'),
                CARTES: path.join(__dirname, 'public', 'Cartes')
            },
            CORS_OPTIONS: {
                origin: ["https://seriousgame-ds65.onrender.com", "http://localhost:10000"],
                methods: ["GET", "POST"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization"],
                maxAge: 600
            },
            GAME: {
                MAX_PLAYERS_PER_ROOM: 2,
                INITIAL_HAND_SIZE: 5,
                CLEANUP_INTERVAL: 3600000, // 1 heure
                MAX_INACTIVE_TIME: 3600000, // 1 heure
                INITIAL_HEALTH: 100,
                INITIAL_ENERGY: 100,
                TURN_TIMEOUT: 60000 // 1 minute par tour
            }
        };

        this.initializeServer();
        this.setupRoomManager();
        this.setupCleanupTask();
    }

    initializeServer() {
        this.app = express();
        this.configureMiddleware();
        this.setupRoutes();
        this.server = createServer(this.app);
        this.io = this.setupSocketServer();
    }

    configureMiddleware() {
        this.app.use(cors(this.CONFIG.CORS_OPTIONS));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(this.CONFIG.STATIC_PATHS.PUBLIC));
        this.app.use('/Avatars', express.static(this.CONFIG.STATIC_PATHS.AVATARS));
    }

    setupRoutes() {
        const routes = [
            { path: '/', file: 'index.html' },
            { path: '/choose-mode', file: 'choose-mode.html' },
            { path: '/room-choice', file: 'room-choice.html' },
            { path: '/gameboard', file: 'gameboard.html' }
        ];

        routes.forEach(route => {
            this.app.get(route.path, (req, res) => {
                res.sendFile(path.join(this.CONFIG.STATIC_PATHS.PUBLIC, route.file));
            });
        });

        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                activePlayers: this.roomManager.getActivePlayersCount(),
                activeRooms: this.roomManager.getRoomsCount()
            });
        });
    }

    setupSocketServer() {
        const io = new Server(this.server, {
            cors: this.CONFIG.CORS_OPTIONS,
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });

        io.on('connection', (socket) => this.handleSocketConnection(socket));
        return io;
    }

    setupRoomManager() {
        this.roomManager = new RoomManager(this.CONFIG.GAME);
    }

    setupCleanupTask() {
        setInterval(() => {
            this.roomManager.cleanupInactiveRooms();
        }, this.CONFIG.GAME.CLEANUP_INTERVAL);
    }

    handleSocketConnection(socket) {
        console.log(`✅ Joueur connecté: ${socket.id}`);

        socket.on('createRoom', (userData) => this.handleCreateRoom(socket, userData));
        socket.on('joinRoom', (data) => this.handleJoinRoom(socket, data));
        socket.on('findRandomGame', (userData) => this.handleRandomGame(socket, userData));
        socket.on('requestOpponent', () => this.handleOpponentRequest(socket));
        socket.on('cardPlayed', (data) => this.handleCardPlayed(socket, data));
        socket.on('disconnect', () => this.handleDisconnect(socket));
        socket.on('surrender', () => this.handleSurrender(socket));
        socket.on('chatMessage', (message) => this.handleChatMessage(socket, message));
    }

    // Gestionnaires d'événements socket
    handleCreateRoom(socket, userData) {
        if (!this.validateUserData(userData)) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        try {
            const roomCode = this.generateUniqueRoomCode();
            const room = this.roomManager.createRoom(roomCode, {
                id: socket.id,
                ...userData,
                lastActivity: Date.now()
            });

            socket.join(roomCode);
            socket.emit('roomCreated', { roomCode });
            console.log(`🏠 Room ${roomCode} créée par ${userData.name}`);
        } catch (error) {
            console.error('Erreur création room:', error);
            socket.emit('roomError', 'Erreur lors de la création de la room');
        }
    }

    handleJoinRoom(socket, data) {
        if (!this.validateRoomData(data)) {
            socket.emit('roomError', 'Données invalides');
            return;
        }

        try {
            const room = this.roomManager.joinRoom(data.roomCode, {
                id: socket.id,
                name: data.name,
                sex: data.sex,
                avatarId: data.avatarId,
                lastActivity: Date.now(),
                ...data
            });

            if (!room) {
                socket.emit('roomError', 'Room invalide ou pleine');
                return;
            }

            socket.join(data.roomCode);
            
            if (room.players.length === this.CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
                this.startGame(room);
            } else {
                socket.emit('waitingForOpponent');
            }
        } catch (error) {
            console.error('Erreur join room:', error);
            socket.emit('roomError', 'Erreur lors de la connexion à la room');
        }
    }

    handleRandomGame(socket, userData) {
        if (!this.validateUserData(userData)) {
            socket.emit('roomError', 'Données utilisateur invalides');
            return;
        }

        try {
            if (this.roomManager.waitingPlayers.length > 0) {
                const opponent = this.roomManager.waitingPlayers.shift();
                const roomCode = this.generateUniqueRoomCode();
                const room = this.roomManager.createRoom(roomCode, {
                    ...opponent,
                    lastActivity: Date.now()
                });
                
                this.roomManager.joinRoom(roomCode, {
                    id: socket.id,
                    ...userData,
                    lastActivity: Date.now()
                });

                socket.join(roomCode);
                this.startGame(room);
            } else {
                this.roomManager.waitingPlayers.push({
                    id: socket.id,
                    ...userData,
                    lastActivity: Date.now()
                });
                socket.emit('waitingForOpponent');
            }
        } catch (error) {
            console.error('Erreur matchmaking:', error);
            socket.emit('roomError', 'Erreur lors de la recherche d\'une partie');
        }
    }

    handleOpponentRequest(socket) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;

        const opponent = room.players.find(p => p.id !== socket.id);
        if (opponent) {
            socket.emit('updateOpponent', this.sanitizePlayerData(opponent));
        }
    }

    handleCardPlayed(socket, data) {
        const room = this.getRoomBySocket(socket);
        if (!room || !this.isValidPlay(room, socket.id, data)) return;

        try {
            this.io.to(room.code).emit('cardPlayed', {
                ...data,
                playerId: socket.id
            });

            this.updateGameState(room, {
                ...data,
                playerId: socket.id
            });
        } catch (error) {
            console.error('Erreur lors du jeu de carte:', error);
            socket.emit('gameError', 'Erreur lors du jeu de la carte');
        }
    }

    handleSurrender(socket) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;

        this.endGame(room, socket.id, 'surrender');
    }

    handleChatMessage(socket, message) {
        const room = this.getRoomBySocket(socket);
        if (!room) return;

        const sanitizedMessage = this.sanitizeMessage(message);
        this.io.to(room.code).emit('chatMessage', {
            senderId: socket.id,
            message: sanitizedMessage,
            timestamp: Date.now()
        });
    }

    handleDisconnect(socket) {
        console.log(`👋 Joueur déconnecté: ${socket.id}`);
        const room = this.getRoomBySocket(socket);
        
        if (room) {
            socket.to(room.code).emit('opponentDisconnected', {
                playerId: socket.id
            });
            
            // Donner un délai pour la reconnexion
            setTimeout(() => {
                if (this.roomManager.playerRooms.has(socket.id)) {
                    this.endGame(room, socket.id, 'disconnect');
                }
            }, 10000);
        }

        this.roomManager.removeFromWaitingList(socket.id);
    }

    // Méthodes de gestion du jeu
    startGame(room) {
        try {
            if (!room || !room.players || room.players.length !== this.CONFIG.GAME.MAX_PLAYERS_PER_ROOM) {
                throw new Error('Configuration de room invalide');
            }

            const gameData = {
                roomCode: room.code,
                players: room.players.map(p => this.sanitizePlayerData(p))
            };

            this.io.to(room.code).emit('gameStart', gameData);
            this.initializeGameState(room);

            console.log(`✅ Partie démarrée dans la room ${room.code}`);
        } catch (error) {
            console.error('❌ Erreur lors du démarrage de la partie:', error);
            this.handleGameError(room, 'Erreur lors du démarrage de la partie');
        }
    }

    initializeGameState(room) {
        try {
            room.gameState = {
                status: 'playing',
                turn: room.players[0].id,
                playedCards: new Map(),
                lastActivity: Date.now(),
                playerStates: new Map(),
                startTime: Date.now()
            };
    
            // Initialiser l'état pour chaque joueur
            room.players.forEach(player => {
                const initialState = {
                    health: this.CONFIG.GAME.INITIAL_HEALTH,
                    energy: this.CONFIG.GAME.INITIAL_ENERGY,
                    hand: this.generateInitialHand()
                };
                room.gameState.playerStates.set(player.id, initialState);
    
                // Envoyer la main initiale à chaque joueur
                this.io.to(player.id).emit('initializeHands', {
                    playerId: player.id,
                    cards: initialState.hand
                });
            });
    
            // Notifier le premier tour
            this.io.to(room.code).emit('turnUpdate', {
                playerId: room.gameState.turn
            });
    
            console.log(`🎮 Partie initialisée dans la room ${room.code}`);
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de la partie:', error);
            this.handleGameError(room, 'Erreur lors de l\'initialisation de la partie');
        }
    }
    
    // Méthode pour générer la main initiale
    generateInitialHand() {
        return Array.from({ length: this.CONFIG.GAME.INITIAL_HAND_SIZE }, (_, i) => ({
            id: `card_${Date.now()}_${i}`,
            type: 'basic',
            value: Math.floor(Math.random() * 10) + 1,
            image: `/Cartes/carte${i + 1}.png`
        }));
    }
    
    // Méthode pour vérifier si un coup est valide
    isValidPlay(room, playerId, data) {
        if (!room.gameState || room.gameState.status !== 'playing') {
            return false;
        }
    
        // Vérifier si c'est le tour du joueur
        if (room.gameState.turn !== playerId) {
            return false;
        }
    
        // Vérifier si la carte appartient au joueur
        const playerState = room.gameState.playerStates.get(playerId);
        if (!playerState || !playerState.hand.some(card => card.id === data.cardId)) {
            return false;
        }
    
        // Vérifier si l'emplacement est valide
        if (!data.slot || !data.slot.startsWith('player-')) {
            return false;
        }
    
        return true;
    }
    
    // Méthode pour gérer les erreurs de jeu
    handleGameError(room, errorMessage) {
        console.error(`❌ Erreur de jeu dans la room ${room.code}:`, errorMessage);
        
        this.io.to(room.code).emit('gameError', {
            message: errorMessage
        });
    
        // Réinitialiser la room en cas d'erreur critique
        room.gameState.status = 'error';
        setTimeout(() => {
            this.cleanupRoom(room.code);
        }, 5000);
    }
    
    // Méthode pour nettoyer une room
    cleanupRoom(roomCode) {
        const room = this.roomManager.getRoom(roomCode);
        if (!room) return;
    
        // Notifier les joueurs
        this.io.to(roomCode).emit('roomClosed', {
            message: 'La partie a été interrompue'
        });
    
        // Nettoyer la room
        room.players.forEach(player => {
            this.roomManager.playerRooms.delete(player.id);
        });
        this.roomManager.rooms.delete(roomCode);
    }
    
    // Méthode pour vérifier les conditions de fin de partie
    checkGameConditions(room) {
        room.gameState.playerStates.forEach((state, playerId) => {
            if (state.health <= 0) {
                this.endGame(room, playerId, 'defeat');
            }
        });
    }
    
    // Méthode pour terminer la partie
    endGame(room, loserId, reason) {
        const winnerId = room.players.find(p => p.id !== loserId)?.id;
    
        this.io.to(room.code).emit('gameEnd', {
            winner: winnerId,
            loser: loserId,
            reason: reason
        });
    
        room.gameState.status = 'ended';
        
        // Nettoyer la room après un délai
        setTimeout(() => {
            this.cleanupRoom(room.code);
        }, 5000);
    }
    
    // Méthode pour nettoyer les messages
    sanitizeMessage(message) {
        if (!message || typeof message !== 'string') {
            return '';
        }
        // Nettoyer et limiter la longueur du message
        return message.slice(0, 200).trim();
    }

    updateGameState(room, data) {
        // Mettre à jour l'état du jeu
        room.gameState.playedCards.set(data.slot, data);
        
        // Vérifier les conditions de victoire/défaite
        this.checkGameConditions(room);
    }

    // Utilitaires
    generateUniqueRoomCode() {
        let roomCode;
        do {
            roomCode = randomInt(1000, 9999).toString();
        } while (this.roomManager.rooms.has(roomCode));
        return roomCode;
    }

    getRoomBySocket(socket) {
        const roomCode = this.roomManager.playerRooms.get(socket.id);
        return roomCode ? this.roomManager.rooms.get(roomCode) : null;
    }

    validateUserData(userData) {
        return userData && userData.name && userData.sex && userData.avatarId;
    }

    validateRoomData(data) {
        return data && data.roomCode && this.validateUserData(data);
    }

    sanitizePlayerData(player) {
        return {
            id: player.id,
            name: player.name,
            sex: player.sex,
            avatarId: player.avatarId
        };
    }

    start() {
        const port = this.CONFIG.PORT;
        this.server.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Serveur lancé sur le port ${port}`);
        });
    }
}

// Gestionnaire des rooms
class RoomManager {
    constructor(gameConfig) {
        this.rooms = new Map();
        this.playerRooms = new Map();
        this.waitingPlayers = [];
        this.gameConfig = gameConfig;
    }

    createRoom(roomCode, creator) {
        const room = {
            code: roomCode,
            players: [creator],
            gameState: {
                status: 'waiting',
                turn: creator.id,
                playedCards: new Map(),
                startTime: Date.now()
            },
            createdAt: Date.now()
        };

        this.rooms.set(roomCode, room);
        this.playerRooms.set(creator.id, roomCode);
        return room;
    }

    joinRoom(roomCode, player) {
        const room = this.rooms.get(roomCode);
        if (!room || room.players.length >= this.gameConfig.MAX_PLAYERS_PER_ROOM) {
            return null;
        }

        room.players.push(player);
        this.playerRooms.set(player.id, roomCode);
        return room;
    }

    leaveRoom(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode) return;

        const room = this.rooms.get(roomCode);
        if (!room) return;

        room.players = room.players.filter(p => p.id !== playerId);
        this.playerRooms.delete(playerId);

        if (room.players.length === 0) {
            this.rooms.delete(roomCode);
        }
    }

    // Ajout de la méthode manquante
    removeFromWaitingList(playerId) {
        this.waitingPlayers = this.waitingPlayers.filter(player => player.id !== playerId);
    }

    // Méthodes utilitaires supplémentaires
    getActivePlayersCount() {
        return this.playerRooms.size;
    }

    getRoomsCount() {
        return this.rooms.size;
    }

    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }

    getRoomByPlayerId(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        return roomCode ? this.rooms.get(roomCode) : null;
    }

    isPlayerInRoom(playerId) {
        return this.playerRooms.has(playerId);
    }

    isPlayerWaiting(playerId) {
        return this.waitingPlayers.some(player => player.id === playerId);
    }

    cleanupInactiveRooms() {
        const now = Date.now();
        for (const [roomCode, room] of this.rooms.entries()) {
            if (now - room.createdAt > this.gameConfig.MAX_INACTIVE_TIME) {
                room.players.forEach(player => {
                    this.playerRooms.delete(player.id);
                });
                this.rooms.delete(roomCode);
            }
        }

        // Nettoyer aussi les joueurs en attente inactifs
        this.waitingPlayers = this.waitingPlayers.filter(player => 
            now - player.lastActivity < this.gameConfig.MAX_INACTIVE_TIME
        );
    }

    // Méthode pour le débogage
    getDiagnostics() {
        return {
            activeRooms: this.rooms.size,
            activePlayers: this.playerRooms.size,
            waitingPlayers: this.waitingPlayers.length,
            rooms: Array.from(this.rooms.entries()).map(([code, room]) => ({
                code,
                playerCount: room.players.length,
                status: room.gameState.status,
                age: Date.now() - room.createdAt
            }))
        };
    }
}


// Démarrage du serveur
const gameServer = new GameServer();
gameServer.start();

export default gameServer;
