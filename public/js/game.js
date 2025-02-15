document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    // Vérification et récupération des données utilisateur
    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar");
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    // 🔍 Double vérification avec un léger délai pour garantir que les données sont bien stockées
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
        socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

        /** ✅ Démarrage du jeu */
        socket.on("game_start", (gameData) => {
            console.log("✅ Game start reçu :", gameData);

            if (!gameData.opponent) {
                console.warn("⚠️ Aucun adversaire trouvé !");
                return;
            }

            console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

            // Mise à jour de l'adversaire dans l'interface
            document.querySelector(".opponent-name").textContent = gameData.opponent.name;
            document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;

            // Vérification de l'avatar reçu
            console.log("🎭 Avatar reçu pour l'adversaire :", gameData.opponent.avatar);
        });

        /** ✅ Gestion des déconnexions */
        socket.on("player_disconnected", () => {
            console.warn("❌ L'adversaire s'est déconnecté. Retour à l'accueil.");
            alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
            window.location.href = "/";
        });

        socket.on("disconnect", () => {
            console.warn("❌ Vous avez été déconnecté du serveur. Retour à l'accueil.");
            alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");
            window.location.href = "/";
        });

    }, 300); // ✅ Ajout d'un délai de 300ms pour garantir la récupération des données
});