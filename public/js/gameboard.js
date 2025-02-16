import socket from "./socketManager.js"; // ✅ Connexion centralisée

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    // ✅ Sélection des éléments HTML
    const playerNameElement = document.querySelector(".player-name");
    const playerAvatarElement = document.querySelector(".player-avatar img");
    const opponentNameElement = document.querySelector(".opponent-name");
    const opponentAvatarElement = document.querySelector(".opponent-avatar img");
    const turnIndicator = document.getElementById("turn-indicator");
    const disconnectOverlay = document.getElementById("disconnect-overlay");

    // ✅ Récupération des données stockées
    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar") || "/Avatars/default.jpeg";
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        alert("Erreur : Données utilisateur incomplètes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // ✅ Mise à jour du profil joueur
    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;
    disconnectOverlay.classList.add("hidden");

    // ✅ Envoi de l'événement pour rejoindre la partie
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // ✅ Écoute de la connexion WebSocket
    socket.on("connect", () => {
        console.log("✅ Connexion établie avec succès !");
        disconnectOverlay.classList.add("hidden");
    });

    // ✅ Mise à jour de l'affichage de l'adversaire à la connexion
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.players || gameData.players.length !== 2) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        const [player1, player2] = gameData.players;
        const opponent = player1.name === userName ? player2 : player1;

        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${opponent.name}`);

        opponentNameElement.textContent = opponent.name;
        opponentAvatarElement.src = opponent.avatar;
    });

    // ✅ Mise à jour du tour de jeu
    socket.on("update_turn", (currentTurn) => {
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    // ✅ Gestion des déconnexions des adversaires
    socket.on("opponent_disconnected", ({ name }) => {
        console.warn(`❌ ${name} s'est déconnecté !`);
        alert(`${name} s'est déconnecté. Retour à l'accueil.`);
        sessionStorage.removeItem("roomId");
        window.location.href = "/";
    });

    // ✅ Gestion des reconnexions des adversaires
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        opponentNameElement.textContent = data.name;
        opponentAvatarElement.src = data.avatar;
        disconnectOverlay.classList.add("hidden");
    });

    // ✅ Gestion propre de la déconnexion locale
    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur.");
        disconnectOverlay.classList.remove("hidden");

        setTimeout(() => {
            if (!socket.connected) {
                console.error("❌ Vous avez été déconnecté définitivement. Retour à l'accueil.");
                alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");
                sessionStorage.removeItem("roomId");
                window.location.href = "/";
            } else {
                console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
                disconnectOverlay.classList.add("hidden");
            }
        }, 5000);
    });

    // ✅ Reconnexion propre après coupure réseau
    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
        disconnectOverlay.classList.add("hidden");
        socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
    });
});