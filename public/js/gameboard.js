import { getSocket } from "./socketManager.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = getSocket(); // Récupérer le socket via socketManager.js
    if (!socket) {
        console.error("❌ Erreur : Impossible d'obtenir la connexion WebSocket.");
        return;
    }

    // **📌 Récupération des données utilisateur**
    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur manquantes. Retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // **📌 Mise à jour de l'affichage du joueur**
    document.querySelector(".player-name").textContent = userName;
    document.querySelector(".player-avatar img").src = userAvatar;

    // **📌 Émission de l'événement pour rejoindre la room**
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // **📌 Gestion des joueurs connectés**
    socket.on("players_ready", (data) => {
        console.log("✅ Les joueurs sont prêts :", data);

        // **📌 Mise à jour des profils joueurs/adversaires**
        if (data.player1.name === userName) {
            updateOpponentProfile(data.player2);
        } else {
            updateOpponentProfile(data.player1);
        }
    });

    /**
     * **📌 Fonction pour mettre à jour le profil de l'adversaire**
     */
    function updateOpponentProfile(opponent) {
        console.log(`🎭 Mise à jour du profil adversaire : ${opponent.name}`);

        document.querySelector(".opponent-name").textContent = opponent.name;
        document.querySelector(".opponent-avatar img").src = opponent.avatar;
    }
});