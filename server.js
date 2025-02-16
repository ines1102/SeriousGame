import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 10000;

// ✅ Génération d'un nonce sécurisé pour CSP
const nonce = Buffer.from(crypto.randomBytes(16)).toString("base64");

// ✅ Sécurité avec Helmet (CSP, XSS Protection, etc.)
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", `'nonce-${nonce}'`, "https://cdnjs.cloudflare.com", "https://seriousgame-ds65.onrender.com"],
            connectSrc: ["'self'", "https://seriousgame-ds65.onrender.com", "wss://seriousgame-ds65.onrender.com"],
            imgSrc: ["'self'", "data:"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"]
        }
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Configuration CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://seriousgame-ds65.onrender.com');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.locals.nonce = nonce; // Injecte le nonce dans les vues si besoin
    next();
});

// ✅ Servir les fichiers statiques
app.use(express.static('public'));

// ---------------------------------------------------------
// ✅ WebSocket natif (`ws`) - Connexion et gestion des rooms
// ---------------------------------------------------------

const wss = new WebSocketServer({ server });
const wsClients = new Map();

wss.on('connection', (ws) => {
    console.log('🔗 Client WebSocket connecté');

    ws.on('message', (message) => {
        console.log(`📩 Message reçu: ${message}`);
        ws.send(`📤 Réponse serveur: ${message}`);
    });

    ws.on('close', () => {
        console.log('❌ Client WebSocket déconnecté');
        wsClients.delete(ws);
    });

    ws.send('🚀 Connexion WebSocket réussie !');
});

// ---------------------------------------------------------
// ✅ Socket.IO - Gestion avancée (Rooms, Matchmaking, Chat)
// ---------------------------------------------------------

const io = new SocketIOServer(server, {
    cors: {
        origin: "https://seriousgame-ds65.onrender.com",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket'], // ✅ Force WebSocket uniquement
    allowEIO3: true
});

const waitingPlayers = new Set();
const games = new Map();

io.on('connection', (socket) => {
    console.log(`🔗 Client Socket.IO connecté: ${socket.id}`);

    socket.on('joinRandomGame', (playerData) => {
        console.log(`👤 ${playerData.name} cherche une partie...`);
        
        if (waitingPlayers.size > 0) {
            const opponentSocket = Array.from(waitingPlayers)[0];
            waitingPlayers.delete(opponentSocket);

            const room = `game-${socket.id}-${opponentSocket.id}`;
            games.set(room, { players: [socket, opponentSocket] });

            socket.join(room);
            opponentSocket.join(room);

            io.to(room).emit('gameStart', { room, players: [playerData, opponentSocket.playerData] });
            console.log(`🎮 Match trouvé ! Room: ${room}`);
        } else {
            waitingPlayers.add(socket);
            socket.emit('waitingForPlayer');
            console.log(`⌛ Joueur en attente...`);
        }
    });

    socket.on('sendMessage', (data) => {
        const { room, message } = data;
        console.log(`💬 Message dans ${room}: ${message}`);
        io.to(room).emit('receiveMessage', { sender: socket.id, message });
    });

    socket.on('disconnect', () => {
        console.log('❌ Client déconnecté');
        waitingPlayers.delete(socket);
    });

    socket.emit('message', '🚀 Connexion Socket.IO réussie');
});

// ---------------------------------------------------------
// ✅ Routes API et Health Check
// ---------------------------------------------------------

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Serveur actif avec WebSocket & Socket.IO !'
    });
});

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

// ---------------------------------------------------------
// ✅ Gestion des erreurs
// ---------------------------------------------------------

app.use((err, req, res, next) => {
    console.error('🚨 Erreur serveur:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ---------------------------------------------------------
// ✅ Lancement du serveur
// ---------------------------------------------------------

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur WebSocket & Socket.IO démarré sur le port ${PORT}`);
});

// ---------------------------------------------------------
// ✅ Gestion des arrêts propres (SIGTERM)
// ---------------------------------------------------------

process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur en cours...');
    server.close(() => {
        console.log('🛑 Serveur arrêté proprement');
        process.exit(0);
    });
});