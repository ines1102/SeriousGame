import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = socketManager.getSocket();
    
    const playerNameElement = document.querySelector(".player-name");
    const playerAvatarElement = document.querySelector(".player-avatar img");
    const opponentNameElement = document.querySelector(".opponent-name");
    const opponentAvatarElement = document.querySelector(".opponent-avatar img");
    const turnIndicator = document.getElementById("turn-indicator");

    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.warn("⚠️ Données de session incomplètes, retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // Affichage des infos du joueur
    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;

    // Envoi des données au serveur
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // Événement déclenché lorsque le jeu commence
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
        console.log("🎭 Avatar de l'adversaire mis à jour :", gameData.opponent.avatar);
    });

    // Mise à jour de l'affichage du tour actuel
    socket.on("update_turn", (currentTurn) => {
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    // Gestion de la déconnexion d'un adversaire
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie. Retour à l'accueil.");

        // Nettoyage des données et redirection
        sessionStorage.removeItem("userName");
        sessionStorage.removeItem("userAvatar");
        sessionStorage.removeItem("roomId");

        window.location.href = "/";
    });

    // Suppression du message de déconnexion si le joueur se reconnecte
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);

        // Mise à jour du profil de l'adversaire
        opponentNameElement.textContent = data.name;
        opponentAvatarElement.src = data.avatar;

        // Suppression du message de déconnexion
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // Gestion de la déconnexion du joueur lui-même
    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur. Vérification...");

        setTimeout(() => {
            if (!socket.connected) {
                console.error("❌ Déconnexion confirmée. Retour à l'accueil.");
                alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");

                // Nettoyage de la session
                sessionStorage.removeItem("userName");
                sessionStorage.removeItem("userAvatar");
                sessionStorage.removeItem("roomId");

                window.location.href = "/";
            } else {
                console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
                document.getElementById("disconnect-overlay").classList.add("hidden");
            }
        }, 2000);
    });

    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });
});