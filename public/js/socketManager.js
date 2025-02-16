const socketManager = (() => {
    let socket = null;
    let isConnected = false;

    function connect() {
        if (!socket) {
            console.log("✅ Connexion Socket.IO en cours...");
            socket = io("https://seriousgame-ds65.onrender.com", {
                transports: ["websocket"],
            });

            socket.on("connect", () => {
                isConnected = true;
                console.log("✅ Connexion établie avec succès !");
            });

            socket.on("disconnect", () => {
                isConnected = false;
                console.warn("❌ Déconnexion du serveur détectée.");
            });
        }
    }

    function getSocket() {
        if (!socket || !isConnected) {
            console.warn("⚠️ Socket.IO non initialisé ou pas encore connecté, tentative de connexion...");
            connect();
        }
        return socket;
    }

    return { getSocket, connect };
})();

export default socketManager;