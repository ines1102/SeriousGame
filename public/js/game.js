document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    // Vérification des données stockées dans sessionStorage
    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    // Si les données sont manquantes, tentative de récupération après un court délai
    setTimeout(() => {
        if (!userName || !userAvatar || !roomId) {
            console.warn("⚠️ Données de session incomplètes, tentative de récupération...");

            userName = sessionStorage.getItem("userName");
            userAvatar = sessionStorage.getItem("userAvatar");
            roomId = sessionStorage.getItem("roomId");

            console.log("📌 Vérification après récupération :", { roomId, userName, userAvatar });
        }

        if (!userName || !userAvatar || !roomId) {
            console.error("❌ Échec : Données toujours incomplètes, retour à l'accueil.");
            alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
            window.location.href = "/";
            return;
        }

        console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

        const socket = io();

        /** ✅ Gestion de la connexion au serveur */
        socket.on("connect", () => {
            console.log(`✅ Connexion établie avec succès !`);

            // Envoi des informations du joueur pour rejoindre la partie
            socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });
        });

        /** ✅ Événement : démarrage du jeu */
        socket.on("game_start", (gameData) => {
            console.log("✅ Game start reçu :", gameData);

            if (!gameData.player1 || !gameData.player2) {
                console.warn("⚠️ Joueurs manquants dans la game_start !");
                return;
            }

            // Affichage des profils des joueurs
            console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.player2.name}`);

            document.querySelector(".player-name").textContent = gameData.player1.name;
            document.querySelector(".player-avatar img").src = gameData.player1.avatar;

            document.querySelector(".opponent-name").textContent = gameData.player2.name;
            document.querySelector(".opponent-avatar img").src = gameData.player2.avatar;
        });

        /** ✅ Événement : confirmation que les deux joueurs sont prêts */
        socket.on("players_ready", (data) => {
            console.log("✅ Confirmation : Les deux joueurs sont bien connectés.", data);

            // Mise à jour des profils des joueurs
            document.querySelector(".player-name").textContent = data.player1.name;
            document.querySelector(".player-avatar img").src = data.player1.avatar;

            document.querySelector(".opponent-name").textContent = data.player2.name;
            document.querySelector(".opponent-avatar img").src = data.player2.avatar;
        });

        /** ✅ Événement : déconnexion de l'adversaire */
        socket.on("opponent_disconnected", () => {
            console.warn("❌ L'adversaire s'est déconnecté !");
            alert("Votre adversaire a quitté la partie. Retour à l'accueil.");

            // Nettoyer les données et rediriger
            sessionStorage.removeItem("userName");
            sessionStorage.removeItem("userAvatar");
            sessionStorage.removeItem("roomId");

            window.location.href = "/";
        });

        /** ✅ Événement : reconnexion de l'adversaire */
        socket.on("opponent_reconnected", (data) => {
            console.log(`✅ ${data.name} est revenu !`);

            // Mise à jour immédiate du profil de l'adversaire
            document.querySelector(".opponent-name").textContent = data.name;
            document.querySelector(".opponent-avatar img").src = data.avatar;

            // Suppression du message de déconnexion
            document.getElementById("disconnect-overlay").classList.add("hidden");
        });

        /** ✅ Gestion de la déconnexion du joueur */
        socket.on("disconnect", () => {
            console.warn("❌ Vous avez été déconnecté du serveur. Vérification en cours...");

            setTimeout(() => {
                if (!socket.connected) {
                    console.error("❌ Déconnexion permanente. Redirection vers l'accueil.");
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
            }, 3000);
        });

        /** ✅ Gestion de la reconnexion automatique */
        socket.on("reconnect", () => {
            console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
            document.getElementById("disconnect-overlay").classList.add("hidden");

            // Réenvoi des informations du joueur après reconnexion
            socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
        });

    }, 300);
});