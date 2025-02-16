const SERVER_URL = "https://seriousgame-ds65.onrender.com";
let socket = null;

const socketManager = {
    async getSocket() {
        if (socket && socket.connected) {
            return socket;
        }

        return new Promise((resolve, reject) => {
            if (!window.io) {
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