const socketManager = (() => {
    let socket = null;
    let connectionPromise = null;

    function connect() {
        if (!socket) {
            console.log("✅ Connexion Socket.IO en cours...");

            socket = io("https://seriousgame-ds65.onrender.com", {
                transports: ["websocket"],
            });

            connectionPromise = new Promise((resolve, reject) => {
                socket.on("connect", () => {
                    console.log("✅ Connexion établie avec succès !");
                    resolve(socket);
                });

                socket.on("connect_error", (error) => {
                    console.error("❌ Erreur de connexion :", error);
                    reject(error);
                });

                socket.on("disconnect", () => {
                    console.warn("❌ Déconnexion du serveur détectée.");
                });
            });
        }
        return connectionPromise;
    }

    async function getSocket() {
        if (!socket || socket.disconnected) {
            console.warn("⚠️ Socket.IO non initialisé ou pas encore connecté, attente de connexion...");
            await connect();
        }
        return socket;
    }

    return { getSocket };
})();

export default socketManager;