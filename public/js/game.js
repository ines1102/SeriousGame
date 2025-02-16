import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    // 📌 Récupération des données de session
    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Échec : Données utilisateur manquantes. Retour à l'accueil.");
        alert("Erreur : Données utilisateur incomplètes.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // ✅ Initialisation de la connexion Socket.IO via le socketManager
    const socket = socketManager.getSocket();

    // ✅ Événement de connexion réussie
    socket.on("connect", () => {
        console.log("✅ Connexion établie avec succès !");
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // 📌 Rejoindre la partie
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // ✅ Démarrage du jeu lorsque les deux joueurs sont présents
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

        // 🔄 Mise à jour du profil de l'adversaire
        document.querySelector(".opponent-name").textContent = gameData.opponent.name;
        document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;
        console.log("🎭 Avatar de l'adversaire mis à jour :", gameData.opponent.avatar);
    });

    // ✅ Mise à jour des informations des joueurs
    socket.on("players_ready", (data) => {
        console.log("✅ Confirmation : Les deux joueurs sont connectés.", data);

        document.querySelector(".opponent-name").textContent = data.player2.name;
        document.querySelector(".opponent-avatar img").src = data.player2.avatar;

        document.querySelector(".player-name").textContent = data.player1.name;
        document.querySelector(".player-avatar img").src = data.player1.avatar;
    });

    // ✅ Déconnexion de l'adversaire
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie.");
        
        // 🔴 Nettoyer les données et rediriger
        sessionStorage.removeItem("userName");
        sessionStorage.removeItem("userAvatar");
        sessionStorage.removeItem("roomId");
        
        window.location.href = "/";
    });

    // ✅ Reconnexion de l'adversaire
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);

        // 🔄 Mise à jour du profil de l'adversaire
        document.querySelector(".opponent-name").textContent = data.name;
        document.querySelector(".opponent-avatar img").src = data.avatar;

        // 🔴 Supprimer le message de déconnexion
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // ✅ Détection de la déconnexion du joueur
    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur. Vérification...");
        
        setTimeout(() => {
            if (!socket.connected) {
                console.error("❌ Vous avez été déconnecté définitivement. Retour à l'accueil.");
                alert("Vous avez été déconnecté du serveur.");
    
                // 🔴 Nettoyer la session
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

    // ✅ Reconnexion automatique
    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });
});