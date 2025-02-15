import Deck from "./deck.js";

document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const playerNameElement = document.querySelector(".player-name");
    const playerAvatarElement = document.querySelector(".player-avatar img");
    const opponentNameElement = document.querySelector(".opponent-name");
    const opponentAvatarElement = document.querySelector(".opponent-avatar img");
    const playerHand = document.getElementById("player-hand");
    const opponentHand = document.getElementById("opponent-hand");
    const turnIndicator = document.getElementById("turn-indicator");

    // 🔍 Vérification des données utilisateur
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar") || "/Avatars/default.jpeg";
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant de charger `gameboard.html`");
    console.log("🔍 `roomId` :", roomId);
    console.log("🔍 `userName` :", userName);
    console.log("🔍 `userAvatar` :", userAvatar);

    if (!userName || !userAvatar || !roomId) {
        console.error("⚠️ Données de session incomplètes !");
        alert("Erreur : session corrompue. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // Mise à jour des informations du joueur
    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;

    // Demande de rejoindre la partie
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    /** ✅ Démarrage du jeu */
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

        // Mise à jour des informations de l'adversaire
        opponentNameElement.textContent = gameData.opponent.name;
        opponentAvatarElement.src = gameData.opponent.avatar;

        // Vérification de l'avatar stocké
        console.log("🎭 Avatar reçu pour l'adversaire :", gameData.opponent.avatar);
    });

    /** ✅ Gestion des déconnexions */
    socket.on("player_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté. Retour à l'accueil.");
        alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
        window.location.href = "/";
    });

    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur. Retour à l'accueil.");
        alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");
        window.location.href = "/";
    });
}); // ✅ Vérifier que cette accolade ferme bien `DOMContentLoaded`