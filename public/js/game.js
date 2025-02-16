import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = socketManager.getSocket(); // ✅ Récupération de la connexion Socket.IO unique

    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données manquantes, retour à l'accueil.");
        alert("Erreur : Données utilisateur incomplètes.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // ✅ Rejoindre la room
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);
    
        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }
    
        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

        // ✅ Mise à jour des profils
        document.querySelector(".opponent-name").textContent = gameData.opponent.name;
        document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;

        document.querySelector(".player-name").textContent = userName;
        document.querySelector(".player-avatar img").src = userAvatar;
    });

    // ✅ Gestion de la reconnexion du joueur
    socket.on("connect", () => {
        console.log("✅ Reconnexion détectée, réenvoi des informations...");
        socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
    });

    // ✅ Gestion des déconnexions de l'adversaire
    socket.on("opponent_disconnected", (data) => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert(`Votre adversaire ${data.name} a quitté la partie.`);
        
        // ✅ Nettoyer les données et rediriger
        sessionStorage.removeItem("userName");
        sessionStorage.removeItem("userAvatar");
        sessionStorage.removeItem("roomId");
        
        window.location.href = "/";
    });

    // ✅ Réception d'un événement pour signaler que l'adversaire est revenu
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
    
        // 🔄 Mise à jour du profil de l'adversaire
        document.querySelector(".opponent-name").textContent = data.name;
        document.querySelector(".opponent-avatar img").src = data.avatar;
    
        // 🔴 Supprimer le message de déconnexion
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // ✅ Déconnexion locale du joueur
    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur. Vérification...");
        
        setTimeout(() => {
            if (!socket.connected) {
                console.error("❌ Déconnexion définitive. Retour à l'accueil.");
                alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");

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

    // ✅ Gestion de la reconnexion
    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });
});