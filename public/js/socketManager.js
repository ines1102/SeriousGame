// socketManager.js
import { io } from "https://cdn.socket.io/4.7.2/socket.io.min.js";

class SocketManager {
    constructor() {
        if (!SocketManager.instance) {
            this.socket = io();
            this.init();
            SocketManager.instance = this;
        }
        return SocketManager.instance;
    }

    init() {
        this.socket.on("connect", () => {
            console.log("✅ Connexion Socket.IO établie !");
        });

        this.socket.on("disconnect", () => {
            console.warn("❌ Déconnexion du serveur détectée.");
        });
    }

    getSocket() {
        return this.socket;
    }
}

// ✅ Exporter une instance unique
const socketManager = new SocketManager();
export default socketManager;