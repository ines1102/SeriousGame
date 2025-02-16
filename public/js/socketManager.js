const socketManager = (() => {
    let socket = null;

    function connect() {
        if (!socket) {
            console.log("✅ Connexion Socket.IO en cours...");
            socket = io("https://seriousgame-ds65.onrender.com", {
                transports: ["websocket"],
            });

            socket.on("connect", () => {
                console.log("✅ Connexion établie avec succès !");
            });

            socket.on("disconnect", () => {
                console.warn("❌ Déconnexion du serveur détectée.");
            });
        }
    }

    function getSocket() {
        if (!socket) {
            console.warn("⚠️ Socket.IO non initialisé, connexion en cours...");
            connect();
        }
        return socket;
    }

    return { getSocket, connect };
})();

export default socketManager;