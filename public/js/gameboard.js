import { initializeUI, showDisconnectOverlay, updatePlayerProfile } from './uiManager.js';
import socket from './websocket.js';
import DragAndDropManager from './dragAndDrop.js';

// ✅ Variables globales
let gameInstance;
let currentRoomId;
let userData;
let dragAndDrop;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initialisation du jeu...');

    try {
        // ✅ Récupération des données utilisateur
        userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            throw new Error('Session expirée');
        }

        // ✅ Récupération et validation de l'ID de room
        currentRoomId = new URLSearchParams(window.location.search).get('roomId');
        if (!currentRoomId || currentRoomId === 'undefined') {
            throw new Error('Room ID manquant');
        }

        console.log("📌 Données utilisateur récupérées:", userData);
        console.log("📌 Avatar attendu:", userData.avatarSrc);

        // ✅ Attente de la connexion WebSocket
        await socket.waitForConnection();
        console.log('✅ Connecté au serveur');

        // ✅ Initialisation de l'UI
        initializeUI(userData);

        // ✅ Initialisation du Drag & Drop
        dragAndDrop = new DragAndDropManager(gameInstance, socket);
        dragAndDrop.initialize();

        // ✅ Rejoindre la room
        socket.emit('joinRoom', { 
            ...userData, 
            roomCode: currentRoomId 
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        showDisconnectOverlay(error.message);
    }
});