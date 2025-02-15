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

        /** ✅ Gérer la reconnexion proprement */
        socket.on("connect", () => {
            console.log(`✅ Reconnexion détectée, réenvoi des informations...`);
            const storedUserName = sessionStorage.getItem("userName");
            const storedUserAvatar = sessionStorage.getItem("userAvatar");
            const storedRoomId = sessionStorage.getItem("roomId");

            if (storedUserName && storedUserAvatar && storedRoomId) {
                console.log(`📌 Renvoyant les infos : Room ${storedRoomId}, ${storedUserName}`);
                socket.emit("rejoin_game", { roomId: storedRoomId, name: storedUserName, avatar: storedUserAvatar });
            }
        });

        /** ✅ Émission de l'événement pour rejoindre la partie */
        socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

        /** ✅ Réception de l'événement `game_start` */
        socket.on("game_start", (gameData) => {
            console.log("✅ Game start reçu :", gameData);
        
            if (!gameData.opponent) {
                console.warn("⚠️ Aucun adversaire trouvé !");
                return;
            }
        
            console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);
        
            // 🔴 Mise à jour du profil de l'adversaire
            const opponentNameElement = document.querySelector(".opponent-name");
            const opponentAvatarElement = document.querySelector(".opponent-avatar img");

            if (opponentNameElement && opponentAvatarElement) {
                opponentNameElement.textContent = gameData.opponent.name;
                opponentAvatarElement.src = gameData.opponent.avatar;
                console.log("🎭 Avatar de l'adversaire mis à jour :", gameData.opponent.avatar);
            } else {
                console.error("❌ Impossible de mettre à jour l'adversaire, éléments introuvables !");
            }
        });

        /** ✅ Confirmation que les joueurs sont prêts */
        socket.on("players_ready", (data) => {
            console.log("✅ Confirmation : Les deux joueurs sont bien connectés.", data);

            document.querySelector(".opponent-name").textContent = data.player2.name;
            document.querySelector(".opponent-avatar img").src = data.player2.avatar;

            document.querySelector(".player-name").textContent = data.player1.name;
            document.querySelector(".player-avatar img").src = data.player1.avatar;
        });

        /** ✅ Gestion d'une déconnexion d'un joueur */
        socket.on("opponent_disconnected", () => {
            console.warn("❌ L'adversaire s'est déconnecté !");
            alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
            
            // 🔴 Nettoyer les données et rediriger
            sessionStorage.removeItem("userName");
            sessionStorage.removeItem("userAvatar");
            sessionStorage.removeItem("roomId");
            
            window.location.href = "/";
        });

        /** ✅ Si l'adversaire revient, mise à jour de son profil */
        socket.on("opponent_reconnected", (data) => {
            console.log(`✅ ${data.name} est revenu !`);
        
            // 🔄 Mise à jour du profil de l'adversaire
            document.querySelector(".opponent-name").textContent = data.name;
            document.querySelector(".opponent-avatar img").src = data.avatar;
        
            // 🔴 Supprimer le message de déconnexion
            document.getElementById("disconnect-overlay").classList.add("hidden");
        });

        /** ✅ Gérer la déconnexion du joueur lui-même */
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

        /** ✅ Forcer une reconnexion automatique si la connexion est perdue */
        setTimeout(() => {
            if (!socket.connected) {
                console.warn("❌ Connexion interrompue, tentative de reconnexion...");
                socket.connect();
            }
        }, 5000);

        /** ✅ Gérer l'événement `reconnect` pour enlever le message de déconnexion */
        socket.on("reconnect", () => {
            console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
            document.getElementById("disconnect-overlay").classList.add("hidden");
        });

    }, 300);
});