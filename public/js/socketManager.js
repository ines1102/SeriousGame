// socketManager.js - Gestion centralisée de la connexion Socket.IO
const SERVER_URL = "https://seriousgame-ds65.onrender.com"; // 🔄 Change l'URL si nécessaire
let socket = null;

const socketManager = {
    async getSocket() {
        // 🔄 Vérifier si le socket est déjà connecté
        if (socket && socket.connected) {
            console.log("✅ Socket.IO déjà connecté !");
            return socket;
        }

        console.warn("⚠️ Socket.IO non initialisé ou pas encore connecté, tentative de connexion...");

        return new Promise((resolve, reject) => {
            // 🛠️ S'assurer que le script Socket.IO est bien chargé
            if (!window.io) {
                console.log("✅ Chargement dynamique de Socket.IO...");
                const script = document.createElement("script");
                script.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
                script.onload = () => this.connectSocket(resolve, reject);
                script.onerror = () => reject(new Error("❌ Impossible de charger Socket.IO"));
                document.head.appendChild(script);
            } else {
                this.connectSocket(resolve, reject);
            }
        });
    },

    connectSocket(resolve, reject) {
        socket = io(SERVER_URL, { transports: ["websocket", "polling"] });

        socket.on("connect", () => {
            console.log("✅ Connexion Socket.IO établie !");
            resolve(socket);
        });

        socket.on("connect_error", (error) => {
            console.error("❌ Erreur de connexion à Socket.IO :", error);
            reject(error);
        });

        socket.on("disconnect", (reason) => {
            console.warn(`⚠️ Déconnexion du serveur Socket.IO : ${reason}`);
        });
    }
};

export default socketManager;