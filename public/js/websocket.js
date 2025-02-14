// websocket.js
import { io } from "./socket.io.esm.min.js";

class SocketManager {
    constructor() {
        this.socket = null;
        this.pendingEmissions = new Map();
        this.connectionPromise = null;
        this.isConnecting = false;
        this.initialize();
    }

    initialize() {
        console.log('🔄 Initialisation de la connexion WebSocket...');
        
        this.socket = io("wss://seriousgame-ds65.onrender.com", {
            secure: true,
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        this.setupEventListeners();
        this.connectionPromise = this.createConnectionPromise();
    }

    createConnectionPromise() {
        return new Promise((resolve, reject) => {
            if (this.socket.connected) {
                resolve(this.socket);
                return;
            }

            const timeout = setTimeout(() => {
                reject(new Error('Timeout de connexion'));
            }, 10000);

            this.socket.once('connect', () => {
                clearTimeout(timeout);
                this.processPendingEmissions();
                resolve(this.socket);
            });

            this.socket.once('connect_error', (error) => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Connecté au serveur WebSocket');
            this.isConnecting = false;
            this.processPendingEmissions();
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`🔌 Déconnecté du serveur: ${reason}`);
            this.isConnecting = true;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Erreur de connexion:', error);
            this.isConnecting = false;
        });

        this.socket.on('error', (error) => {
            console.error('❌ Erreur WebSocket:', error);
        });
    }

    async emit(eventName, data, callback) {
        try {
            // Si déjà connecté, émettre directement
            if (this.socket.connected) {
                this.socket.emit(eventName, data, callback);
                return true;
            }

            // Si en cours de connexion, ajouter à la file d'attente
            const emissionId = Date.now().toString();
            this.pendingEmissions.set(emissionId, {
                eventName,
                data,
                callback
            });

            // Attendre la connexion
            await this.connectionPromise;
            return true;
        } catch (error) {
            console.error(`❌ Erreur lors de l'émission de ${eventName}:`, error);
            return false;
        }
    }

    processPendingEmissions() {
        if (this.pendingEmissions.size === 0) return;

        console.log(`🔄 Traitement de ${this.pendingEmissions.size} émissions en attente`);
        
        for (const [id, emission] of this.pendingEmissions) {
            if (this.socket.connected) {
                this.socket.emit(emission.eventName, emission.data, emission.callback);
                this.pendingEmissions.delete(id);
            }
        }
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

    async waitForConnection() {
        try {
            await this.connectionPromise;
            return true;
        } catch (error) {
            console.error('❌ Erreur lors de l\'attente de la connexion:', error);
            return false;
        }
    }

    isConnected() {
        return this.socket?.connected || false;
    }
}

const socketManager = new SocketManager();
export default socketManager;