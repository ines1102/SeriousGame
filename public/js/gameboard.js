import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    try {
        const socket = await socketManager.getSocket(); // ✅ Attente de la connexion Socket.IO

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

        // Envoi des informations du joueur au serveur
        socket.emit("join_gameboard", { roomId, name: userName, avatar: userAvatar });

        // ✅ Écoute du début de la partie
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

        // ✅ Mise à jour de la main du joueur
        socket.on("update_hand", (deck) => {
            console.log("🎴 Mise à jour de la main du joueur", deck);
            displayHand(deck, document.getElementById("player-hand"));
        });

        // ✅ Gestion des changements de tour
        socket.on("update_turn", (currentTurn) => {
            document.getElementById("turn-indicator").textContent =
                currentTurn === userName ? "🔵 Votre tour !" : "🔴 Tour de l'adversaire";
        });

        // ✅ Gestion des déconnexions et reconnexions
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

/**
 * 🔄 Fonction pour afficher la main du joueur
 */
function displayHand(deck, handContainer) {
    handContainer.innerHTML = "";
    deck.forEach(card => {
        const cardElement = document.createElement("img");
        cardElement.src = card.image;
        cardElement.classList.add("card");
        handContainer.appendChild(cardElement);
    });
}