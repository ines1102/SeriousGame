import { getSocket } from "./socketManager.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = getSocket(); // ✅ Connexion centralisée via socketManager

    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur manquantes !");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("game_start", (gameData) => {
        console.log("✅ Début du jeu :", gameData);

        if (!gameData.player1 || !gameData.player2) {
            console.warn("⚠️ Problème avec les données des joueurs !");
            return;
        }

        const opponent = gameData.player1.name === userName ? gameData.player2 : gameData.player1;

        // ✅ Mise à jour du profil de l'adversaire
        document.querySelector(".opponent-name").textContent = opponent.name;
        document.querySelector(".opponent-avatar img").src = opponent.avatar;
    });

    socket.on("update_players", (players) => {
        console.log("✅ Mise à jour des joueurs :", players);

        if (players.length !== 2) {
            console.warn("⚠️ Pas assez de joueurs connectés.");
            return;
        }

        const opponent = players.find(p => p.name !== userName);

        if (opponent) {
            document.querySelector(".opponent-name").textContent = opponent.name;
            document.querySelector(".opponent-avatar img").src = opponent.avatar;
        }
    });

    socket.on("player_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
        window.location.href = "/";
    });
});