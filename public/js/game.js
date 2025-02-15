document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = io();
    const disconnectOverlay = document.getElementById("disconnect-overlay");

    // ✅ Récupération des données utilisateur
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

    /** ✅ Connexion au serveur WebSocket */
    socket.on("connect", () => {
        console.log("✅ Connexion établie avec succès !");
        
        // 🔴 Suppression immédiate du message de déconnexion dès connexion
        disconnectOverlay.classList.add("hidden"); 
        
        socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });
    });

    /** ✅ Mise à jour des joueurs après démarrage */
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);
        if (!gameData.player1 || !gameData.player2) {
            console.warn("⚠️ Joueurs manquants !");
            return;
        }

        document.querySelector(".player-name").textContent = gameData.player1.name;
        document.querySelector(".player-avatar img").src = gameData.player1.avatar;
        document.querySelector(".opponent-name").textContent = gameData.player2.name;
        document.querySelector(".opponent-avatar img").src = gameData.player2.avatar;

        // 🔴 Suppression de l'overlay déconnexion au cas où
        disconnectOverlay.classList.add("hidden");
    });

    /** ✅ Gestion de la reconnexion */
    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée !");
        
        // 🔴 Supprime immédiatement le message de déconnexion
        disconnectOverlay.classList.add("hidden");

        socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
    });

    /** ✅ Mise à jour de l'affichage après reconnexion */
    socket.on("players_ready", (data) => {
        console.log("✅ Confirmation : Les deux joueurs sont bien connectés.", data);

        document.querySelector(".opponent-name").textContent = data.player2.name;
        document.querySelector(".opponent-avatar img").src = data.player2.avatar;

        document.querySelector(".player-name").textContent = data.player1.name;
        document.querySelector(".player-avatar img").src = data.player1.avatar;

        // 🔴 Suppression forcée du message de déconnexion
        disconnectOverlay.classList.add("hidden");
    });

    /** ✅ Gestion des joueurs déconnectés */
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
        window.location.href = "/";
    });

    /** ✅ Gestion des déconnexions client */
    socket.on("disconnect", () => {
        console.warn("❌ Déconnexion détectée, vérification en cours...");

        // 🔴 Vérification avant d'afficher le message
        setTimeout(() => {
            if (!socket.connected) {
                console.error("❌ Déconnexion confirmée. Retour à l'accueil.");
                alert("Vous avez été déconnecté du serveur.");
                window.location.href = "/";
            } else {
                console.log("🔄 Reconnexion réussie, suppression du message de déconnexion.");
                disconnectOverlay.classList.add("hidden");
            }
        }, 2000);
    });

    /** ✅ Suppression forcée du message de déconnexion après quelques secondes si tout est ok */
    setTimeout(() => {
        if (socket.connected) {
            console.log("✅ Vérification post-connexion : suppression du message de déconnexion.");
            disconnectOverlay.classList.add("hidden");
        }
    }, 3000);
});