// websocket.js
import { io } from "./socket.io.esm.min.js";

class SocketManager {
    constructor() {
        this.socket = null;
        this.pendingEmissions = new Map();
        this.connectionPromise = null;
        this.isConnecting = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.initialize();
    }

    initialize() {
        console.log('🔄 Initialisation de la connexion WebSocket...');
        
        try {
            this.socket = io("wss://seriousgame-ds65.onrender.com", {
                secure: true,
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: this.maxRetries,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                autoConnect: true,
                query: {
                    clientId: this.generateClientId()
                }
            });

            this.setupEventListeners();
            this.connectionPromise = this.createConnectionPromise();
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation du socket:', error);
            this.handleInitializationError(error);
        }
    }

    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9);
    }

    createConnectionPromise() {
        return new Promise((resolve, reject) => {
            if (this.socket.connected) {
                resolve(this.socket);
                return;
            }

            const connectionTimeout = setTimeout(() => {
                this.handleConnectionTimeout(reject);
            }, 10000);

            this.socket.once('connect', () => {
                clearTimeout(connectionTimeout);
                this.handleSuccessfulConnection(resolve);
            });

            this.socket.once('connect_error', (error) => {
                clearTimeout(connectionTimeout);
                this.handleConnectionError(error, reject);
            });
        });
    }

    handleConnectionTimeout(reject) {
        const error = new Error('La connexion au serveur a expiré');
        console.error('⏱️ Timeout de connexion');
        reject(error);
        this.retryConnection();
    }

    handleSuccessfulConnection(resolve) {
        console.log('✅ Connexion établie avec succès');
        this.isConnecting = false;
        this.retryCount = 0;
        this.processPendingEmissions();
        resolve(this.socket);
    }

    handleConnectionError(error, reject) {
        console.error('❌ Erreur de connexion:', error);
        reject(error);
        this.retryConnection();
    }

    handleInitializationError(error) {
        console.error('❌ Erreur d\'initialisation:', error);
        // Implémenter la logique de fallback si nécessaire
    }

    setupEventListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ Connecté au serveur WebSocket');
            this.isConnecting = false;
            this.processPendingEmissions();
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`🔌 Déconnecté du serveur: ${reason}`);
            this.isConnecting = true;
            this.handleDisconnect(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Erreur de connexion:', error);
            this.isConnecting = false;
            this.handleConnectError(error);
        });

        this.socket.on('error', (error) => {
            console.error('❌ Erreur WebSocket:', error);
            this.handleSocketError(error);
        });

        // Ajout d'événements pour la surveillance du ping
        this.socket.on('pong', (latency) => {
            this.handlePong(latency);
        });
    }

    handleDisconnect(reason) {
        if (reason === 'io server disconnect') {
            // Le serveur a forcé la déconnexion
            setTimeout(() => this.socket.connect(), 1000);
        }
    }

    handleConnectError(error) {
        if (this.retryCount < this.maxRetries) {
            this.retryConnection();
        }
    }

    handleSocketError(error) {
        console.error('Erreur socket détectée:', error);
        // Implémenter la logique de gestion des erreurs spécifiques
    }

    handlePong(latency) {
        console.log(`📶 Latence: ${latency}ms`);
    }

    async emit(eventName, data, callback) {
        try {
            if (this.socket.connected) {
                this.socket.emit(eventName, data, callback);
                return true;
            }

            const emissionId = `${Date.now()}_${Math.random()}`;
            this.pendingEmissions.set(emissionId, {
                eventName,
                data,
                callback,
                timestamp: Date.now()
            });

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
            if (Date.now() - emission.timestamp > 30000) {
                console.warn(`⚠️ Émission expirée: ${emission.eventName}`);
                this.pendingEmissions.delete(id);
                continue;
            }

            if (this.socket.connected) {
                this.socket.emit(emission.eventName, emission.data, emission.callback);
                this.pendingEmissions.delete(id);
            }
        }
    }

    retryConnection() {
        if (this.retryCount >= this.maxRetries) {
            console.error('❌ Nombre maximum de tentatives de reconnexion atteint');
            return;
        }

        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 5000);
        
        console.log(`🔄 Tentative de reconnexion ${this.retryCount}/${this.maxRetries} dans ${delay}ms`);
        
        setTimeout(() => {
            if (!this.socket.connected) {
                this.socket.connect();
            }
        }, delay);
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

    // Méthode pour nettoyer les ressources
    cleanup() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
        }
        this.pendingEmissions.clear();
    }
}

const socketManager = new SocketManager();

// Gestion propre de la fermeture
window.addEventListener('beforeunload', () => {
    socketManager.cleanup();
});

export default socketManager;
