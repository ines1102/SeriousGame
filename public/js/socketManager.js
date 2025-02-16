import { io } from "https://cdn.socket.io/4.7.2/socket.io.min.js";

class SocketManager {
    constructor() {
        if (!SocketManager.instance) {
            console.log("✅ Initialisation de Socket.IO...");

            // Connexion à Socket.IO
            this.socket = io();

            // Ajout des écouteurs d'événements
            this.setupListeners();

            // Singleton pour éviter les connexions multiples
            SocketManager.instance = this;
        }
        return SocketManager.instance;
    }

    /** 🎧 Ajoute les écouteurs d'événements */
    setupListeners() {
        this.socket.on("connect", () => {
            console.log(`✅ Connecté au serveur Socket.IO avec l'ID : ${this.socket.id}`);
        });

        this.socket.on("disconnect", (reason) => {
            console.warn(`⚠️ Déconnecté de Socket.IO : ${reason}`);
        });

        this.socket.on("connect_error", (error) => {
            console.error("❌ Erreur de connexion à Socket.IO :", error);
        });

        this.socket.on("reconnect", (attempt) => {
            console.log(`🔄 Reconnexion réussie après ${attempt} tentatives.`);
        });

        this.socket.on("reconnect_attempt", (attempt) => {
            console.warn(`⚠️ Tentative de reconnexion #${attempt}`);
        });
    }

    /** 📡 Retourne le socket actif */
    getSocket() {
        if (!this.socket || !this.socket.connected) {
            console.warn("⚠️ Socket.IO non connecté, tentative de reconnexion...");
            this.socket = io();
            this.setupListeners();
        }
        return this.socket;
    }
}

// ⚡ Création d'une instance unique (Singleton)
const socketManager = new SocketManager();
export default socketManager;