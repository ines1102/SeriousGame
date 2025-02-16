const socket = window.io(); // Utilisation de la variable globale
export default socket;

/** ✅ Initialisation unique du socket */
export function initSocket() {
    if (!socket) {
        console.log("✅ Connexion Socket.IO en cours...");
        socket = io("https://seriousgame-ds65.onrender.com"); // Remplace par ton serveur

        socket.on("connect", () => {
            console.log("✅ Connexion Socket.IO établie !");
        });

        socket.on("disconnect", () => {
            console.warn("⚠️ Déconnexion du serveur Socket.IO");
        });
    }
}

/** ✅ Retourne l'instance de socket */
export function getSocket() {
    if (!socket) {
        console.warn("⚠️ Socket.IO non initialisé, tentative de connexion...");
        initSocket();
    }
    return socket;
}