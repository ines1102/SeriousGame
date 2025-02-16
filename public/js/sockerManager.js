// public/js/socketManager.js
import { io } from "https://cdn.socket.io/4.7.2/socket.io.min.js";

class SocketManager {
    constructor() {
        if (!SocketManager.instance) {
            console.log("🔗 Initialisation unique de Socket.IO...");
            this.socket = io(); // ✅ Création unique de la connexion

            this.socket.on("connect", () => {
                console.log(`✅ Connecté au serveur WebSocket : ${this.socket.id}`);
            });

            this.socket.on("disconnect", () => {
                console.warn("⚠️ Déconnexion du serveur.");
            });

            SocketManager.instance = this;
        }

        return SocketManager.instance;
    }

    getSocket() {
        return this.socket;
    }
}

// Exporter une instance unique du SocketManager
const socketManager = new SocketManager();
export default socketManager;