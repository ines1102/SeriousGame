import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = socketManager.getSocket(); // 🔥 Utilise le socket centralisé
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur incomplètes. Retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);
    
    // 🔹 Envoi des informations au serveur
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("connect", () => {
        console.log("✅ Connexion établie avec succès !");
        document.getElementById("disconnect-overlay").classList.add("hidden"); // 🔴 Suppression du message de déconnexion
    });

    /** ✅ Début du jeu */
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

        // 🔹 Mise à jour du profil de l'adversaire
        document.querySelector(".opponent-name").textContent = gameData.opponent.name;
        document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;
        console.log("🎭 Avatar de l'adversaire mis à jour :", gameData.opponent.avatar);
    });

    /** ✅ Gestion des déconnexions */
    socket.on("opponent_disconnected", (opponentData) => {
        console.warn(`❌ ${opponentData.name} s'est déconnecté !`);
        document.getElementById("disconnect-overlay").classList.remove("hidden");
    });

    socket.on("opponent_reconnected", (opponentData) => {
        console.log(`✅ ${opponentData.name} est revenu !`);
        
        // 🔄 Mise à jour du profil de l'adversaire
        document.querySelector(".opponent-name").textContent = opponentData.name;
        document.querySelector(".opponent-avatar img").src = opponentData.avatar;
        
        // 🔴 Suppression du message de déconnexion
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    /** ✅ Gestion propre des déconnexions */
    socket.on("disconnect", () => {
        console.warn("❌ Déconnexion détectée. Vérification en cours...");

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
        }, 5000);
    });

    /** ✅ Gestion des reconnexions */
    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée !");
        document.getElementById("disconnect-overlay").classList.add("hidden");

        // 🔹 Renvoyer les infos au serveur après reconnexion
        socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
    });

});