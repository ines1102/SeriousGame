import { io } from "socket.io-client";

// 📌 Initialisation du WebSocket
const socket = io("wss://seriousgame-ds65.onrender.com", {
    secure: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

export default socket; // ✅ Exportation par défaut