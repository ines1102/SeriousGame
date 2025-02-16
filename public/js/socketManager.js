// ✅ Connexion unique à Socket.IO
const socket = io("https://seriousgame-ds65.onrender.com", {
    transports: ["websocket"], // 🚀 Optimisation pour WebSocket direct
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
});

// ✅ Événements de connexion
socket.on("connect", () => {
    console.log("✅ Connexion Socket.IO établie !");
});

socket.on("disconnect", (reason) => {
    console.warn(`❌ Déconnexion Socket.IO : ${reason}`);
});

export default socket;