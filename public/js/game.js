import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    try {
        const socket = await socketManager.getSocket(); // ✅ Attendre que Socket.IO soit prêt

        let userName = sessionStorage.getItem("userName");
        let userAvatar = sessionStorage.getItem("userAvatar");
        let roomId = sessionStorage.getItem("roomId");

        console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

        if (!userName || !userAvatar || !roomId) {
            console.error("❌ Données utilisateur manquantes, retour à l'accueil.");
            alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
            window.location.href = "/";
            return;
        }

        console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

        // Envoyer les informations de connexion au serveur
        socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

        // ✅ Écoute de l'événement de début de jeu
        socket.on("game_start", (gameData) => {
            console.log("✅ Game start reçu :", gameData);

            if (!gameData.opponent) {
                console.warn("⚠️ Aucun adversaire trouvé !");
                return;
            }

            console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

            // Mise à jour des informations de l'adversaire sur l'UI
            document.querySelector(".opponent-name").textContent = gameData.opponent.name;
            document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;
        });

        // ✅ Gestion des changements de tour
        socket.on("update_turn", (currentTurn) => {
            document.getElementById("turn-indicator").textContent =
                currentTurn === userName ? "🔵 Votre tour !" : "🔴 Tour de l'adversaire";
        });

        // ✅ Gestion des événements de déconnexion
        socket.on("opponent_disconnected", () => {
            console.warn("❌ L'adversaire s'est déconnecté !");
            alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
            
            // 🔴 Nettoyer les données et rediriger
            sessionStorage.removeItem("userName");
            sessionStorage.removeItem("userAvatar");
            sessionStorage.removeItem("roomId");
            window.location.href = "/";
        });

        socket.on("opponent_reconnected", (data) => {
            console.log(`✅ ${data.name} est revenu !`);

            // 🔄 Mise à jour du profil de l'adversaire
            document.querySelector(".opponent-name").textContent = data.name;
            document.querySelector(".opponent-avatar img").src = data.avatar;

            // 🔴 Supprimer le message de déconnexion
            document.getElementById("disconnect-overlay").classList.add("hidden");
        });

        socket.on("disconnect", () => {
            console.warn("❌ Vous avez été déconnecté du serveur. Vérification...");

            setTimeout(() => {
                if (!socket.connected) {
                    console.error("❌ Vous avez été déconnecté définitivement. Retour à l'accueil.");
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

        socket.on("reconnect", () => {
            console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
            document.getElementById("disconnect-overlay").classList.add("hidden");
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation du jeu :", error);
        alert("Impossible de se connecter au serveur. Retour à l'accueil.");
        window.location.href = "/";
    }
});