import { io } from "https://cdn.socket.io/4.5.4/socket.io.esm.min.js";

// 📌 Initialisation WebSocket centralisée
export const socket = io("wss://seriousgame-ds65.onrender.com", {
    secure: true,
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

socket.on('connect', () => console.log('✅ Connecté au WebSocket central'));
socket.on('disconnect', () => console.log('🔌 Déconnecté du WebSocket central'));
socket.on('connect_error', (error) => console.error('❌ Erreur de connexion WebSocket:', error));