const socketManager = (() => {
    let socket = null;
    let isConnected = false;
    let connectionPromise = null;

    async function connect() {
        if (!socket) {
            console.log("✅ Connexion Socket.IO en cours...");

            socket = io("https://seriousgame-ds65.onrender.com", {
                transports: ["websocket"],
            });

            connectionPromise = new Promise((resolve) => {
                socket.on("connect", () => {
                    isConnected = true;
                    console.log("✅ Connexion établie avec succès !");
                    resolve(socket);
                });

                socket.on("disconnect", () => {
                    isConnected = false;
                    console.warn("❌ Déconnexion du serveur détectée.");
                });
            });
        }
        return connectionPromise;
    }

    async function getSocket() {
        if (!socket || !isConnected) {
            console.warn("⚠️ Socket.IO non initialisé ou pas encore connecté, attente de connexion...");
            await connect();
        }
        return socket;
    }

    return { getSocket };
})();

export default socketManager;