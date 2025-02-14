import { io } from "./socket.io.esm.min.js";

// 📌 Configuration WebSocket
const SOCKET_CONFIG = {
    URL: "wss://seriousgame-ds65.onrender.com",
    OPTIONS: {
        secure: true,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
        query: {
            clientVersion: "1.0.0" // Pour la compatibilité des versions
        }
    }
};

// 📌 États de connexion
const CONNECTION_STATES = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error'
};

class SocketManager {
    constructor(config = SOCKET_CONFIG) {
        this.socket = null;
        this.config = config;
        this.connectionState = CONNECTION_STATES.DISCONNECTED;
        this.reconnectAttempts = 0;
        this.initialize();
    }

    initialize() {
        try {
            console.log('🔄 Initialisation de la connexion WebSocket...');
            this.socket = io(this.config.URL, this.config.OPTIONS);
            this.setupEventListeners();
        } catch (error) {
            console.error('❌ Erreur d\'initialisation WebSocket:', error);
            this.connectionState = CONNECTION_STATES.ERROR;
            throw new Error('Échec de l\'initialisation WebSocket');
        }
    }

    setupEventListeners() {
        // Événements de connexion
        this.socket.on('connect', () => {
            console.log('✅ Connecté au serveur WebSocket');
            this.connectionState = CONNECTION_STATES.CONNECTED;
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`🔌 Déconnecté du serveur: ${reason}`);
            this.connectionState = CONNECTION_STATES.DISCONNECTED;
            this.handleDisconnect(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Erreur de connexion:', error);
            this.connectionState = CONNECTION_STATES.ERROR;
            this.handleConnectionError(error);
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Tentative de reconnexion #${attemptNumber}`);
            this.connectionState = CONNECTION_STATES.RECONNECTING;
            this.reconnectAttempts = attemptNumber;
        });

        this.socket.on('error', (error) => {
            console.error('❌ Erreur WebSocket:', error);
            this.handleError(error);
        });

        // Gestion du ping/pong pour vérifier la latence
        this.socket.on('pong', (latency) => {
            console.log(`📶 Latence actuelle: ${latency}ms`);
        });
    }

    handleDisconnect(reason) {
        if (reason === 'io server disconnect') {
            // Déconnexion initiée par le serveur, tentative de reconnexion
            setTimeout(() => this.socket.connect(), this.config.OPTIONS.reconnectionDelay);
        }
    }

    handleConnectionError(error) {
        if (this.reconnectAttempts >= this.config.OPTIONS.reconnectionAttempts) {
            console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
            this.dispatchEvent('maxReconnectAttemptsReached');
        }
    }

    handleError(error) {
        // Dispatch d'un événement personnalisé pour l'erreur
        this.dispatchEvent('socketError', { error });
    }

    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(`socket:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    // Méthodes publiques
    getState() {
        return {
            connectionState: this.connectionState,
            reconnectAttempts: this.reconnectAttempts,
            isConnected: this.socket?.connected || false
        };
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    reconnect() {
        if (this.socket) {
            this.socket.connect();
        }
    }

    emit(eventName, data, callback) {
        if (!this.socket?.connected) {
            console.warn('⚠️ Tentative d\'émission alors que non connecté');
            return false;
        }
        this.socket.emit(eventName, data, callback);
        return true;
    }

    on(eventName, callback) {
        if (this.socket) {
            this.socket.on(eventName, callback);
        }
    }

    off(eventName, callback) {
        if (this.socket) {
            this.socket.off(eventName, callback);
        }
    }

    // Vérification de la connexion
    checkConnection() {
        return new Promise((resolve, reject) => {
            if (this.socket?.connected) {
                resolve(true);
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout lors de la vérification de connexion'));
            }, this.config.OPTIONS.timeout);

            this.socket.once('connect', () => {
                clearTimeout(timeout);
                resolve(true);
            });

            this.socket.once('connect_error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
}

// 📌 Création d'une instance unique
const socketManager = new SocketManager();

// 📌 Exportation de l'instance et des types
export { socketManager as default, CONNECTION_STATES, SOCKET_CONFIG };