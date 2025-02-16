const socketManager = (() => {
    let socket = null;

    /**
     * 📌 Établit une connexion avec le serveur Socket.IO
     */
    function connect() {
        if (!socket) {
            socket = window.io("https://seriousgame-ds65.onrender.com", {
                transports: ["websocket"],
                reconnection: true,
                reconnectionAttempts: 5, // Tente 5 fois avant d'abandonner
                reconnectionDelay: 2000, // Délai entre chaque tentative
            });

            console.log("✅ Connexion Socket.IO en cours...");

            // ✅ Gérer la connexion réussie
            socket.on("connect", () => {
                console.log("✅ Connexion établie avec succès !");
            });

            // ❌ Gérer les erreurs de connexion
            socket.on("connect_error", (error) => {
                console.error("❌ Erreur de connexion Socket.IO :", error);
            });

            // 🔌 Détection de déconnexion
            socket.on("disconnect", (reason) => {
                console.warn(`🔌 Déconnexion détectée : ${reason}`);
                if (reason === "io server disconnect") {
                    console.warn("🔄 Tentative de reconnexion forcée...");
                    socket.connect();
                }
            });

            // 🔄 Tentative de reconnexion automatique
            socket.on("reconnect_attempt", (attempt) => {
                console.log(`🔄 Tentative de reconnexion #${attempt}...`);
            });

            socket.on("reconnect", () => {
                console.log("✅ Reconnexion réussie !");
            });
        }
        return socket;
    }

    /**
     * 📌 Retourne l'instance actuelle de la connexion Socket.IO
     */
    function getSocket() {
        if (!socket) {
            console.warn("⚠️ Socket.IO non initialisé, connexion en cours...");
            return connect();
        }
        return socket;
    }

    return {
        connect,
        getSocket
    };
})();

// ✅ Exporter le module pour une utilisation dans d'autres fichiers
export default socketManager;