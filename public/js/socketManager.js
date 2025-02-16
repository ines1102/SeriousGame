class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.connectionPromise = this.initSocket();
    }

    async initSocket() {
        if (this.isConnected) {
            console.log("⚠️ Socket.IO déjà connecté.");
            return this.socket;
        }

        console.log("✅ Chargement dynamique de Socket.IO...");
        const { io } = await import("/js/socket.io.esm.min.js"); // 🔥 Import dynamique

        return new Promise((resolve, reject) => {
            console.log("✅ Connexion Socket.IO en cours...");

            this.socket = io({
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            this.socket.on("connect", () => {
                console.log("✅ Connexion établie avec succès !");
                this.isConnected = true;
                resolve(this.socket);
            });

            this.socket.on("connect_error", (error) => {
                console.error("❌ Erreur de connexion Socket.IO :", error);
                reject(error);
            });
        });
    }

    async getSocket() {
        if (!this.isConnected) {
            console.warn("⚠️ Socket.IO non initialisé ou pas encore connecté, attente de connexion...");
            await this.connectionPromise; // 🔥 Attend que la connexion soit prête
        }
        return this.socket;
    }
}

const socketManager = new SocketManager();
export default socketManager;