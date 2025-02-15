document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

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

        socket.on("connect", () => {
            console.log(`✅ Reconnexion détectée, réenvoi des informations...`);
        
            const userName = sessionStorage.getItem("userName");
            const userAvatar = sessionStorage.getItem("userAvatar");
            const roomId = sessionStorage.getItem("roomId");
        
            if (userName && userAvatar && roomId) {
                console.log(`📌 Renvoyant les infos : Room ${roomId}, ${userName}`);
                socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
            }
        });
        socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

        socket.on("game_start", (gameData) => {
            console.log("✅ Game start reçu :", gameData);
        
            if (!gameData.opponent) {
                console.warn("⚠️ Aucun adversaire trouvé !");
                return;
            }
        
            console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);
        
            // 🔴 Mise à jour du profil de l'adversaire
            document.querySelector(".opponent-name").textContent = gameData.opponent.name;
            document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;
            console.log("🎭 Avatar de l'adversaire mis à jour :", gameData.opponent.avatar);
        });

        // ✅ Ajout d'un nouvel événement pour s'assurer que les profils sont bien mis à jour
        socket.on("players_ready", (data) => {
            console.log("✅ Confirmation : Les deux joueurs sont bien connectés.", data);

            document.querySelector(".opponent-name").textContent = data.player2.name;
            document.querySelector(".opponent-avatar img").src = data.player2.avatar;

            document.querySelector(".player-name").textContent = data.player1.name;
            document.querySelector(".player-avatar img").src = data.player1.avatar;
        });

        /** ✅ Ajout de la gestion d'une déconnexion d'un joueur */
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

    }, 300);
});