import socketManager from "./socketManager.js";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    try {
        // ✅ Attendre que le socket soit prêt
        const socket = await socketManager.getSocket();

        let userName = sessionStorage.getItem("userName");
        let userAvatar = sessionStorage.getItem("userAvatar");
        let roomId = sessionStorage.getItem("roomId");

        console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

        if (!userName || !userAvatar || !roomId) {
            console.error("❌ Données de session incomplètes, retour à l'accueil.");
            alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
            window.location.href = "/";
            return;
        }

        console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

        // ✅ Émettre la connexion au jeu
        socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

        /** 🎮 Début du jeu */
        socket.on("game_start", (gameData) => {
            console.log("✅ Game start reçu :", gameData);

            if (!gameData.opponent) {
                console.warn("⚠️ Aucun adversaire trouvé !");
                return;
            }

            console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

            // Mise à jour de l'interface joueur et adversaire
            document.querySelector(".player-name").textContent = userName;
            document.querySelector(".player-avatar img").src = userAvatar;

            document.querySelector(".opponent-name").textContent = gameData.opponent.name;
            document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;
        });

        /** 📌 Gestion des cartes */
        function displayHand(deck, handContainer) {
            handContainer.innerHTML = "";
            deck.forEach(card => {
                const cardElement = document.createElement("img");
                cardElement.src = card.name;
                cardElement.classList.add("card");
                handContainer.appendChild(cardElement);
            });
        }

        function displayOpponentHand(deck, handContainer) {
            handContainer.innerHTML = "";
            for (let i = 0; i < deck.length; i++) {
                const cardElement = document.createElement("div");
                cardElement.classList.add("card-back");
                handContainer.appendChild(cardElement);
            }
        }

        /** 🔄 Gestion du tour */
        socket.on("update_turn", (currentTurn) => {
            const turnIndicator = document.getElementById("turn-indicator");
            turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
        });

        /** ❌ Déconnexion du joueur */
        socket.on("disconnect", () => {
            console.warn("❌ Vous avez été déconnecté du serveur.");
            alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");
            window.location.href = "/";
        });

        /** ⚠️ Déconnexion de l'adversaire */
        socket.on("opponent_disconnected", () => {
            console.warn("❌ L'adversaire s'est déconnecté.");
            alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
            window.location.href = "/";
        });

        /** ✅ Reconnexion d'un adversaire */
        socket.on("opponent_reconnected", (data) => {
            console.log(`✅ ${data.name} est revenu !`);

            document.querySelector(".opponent-name").textContent = data.name;
            document.querySelector(".opponent-avatar img").src = data.avatar;

            document.getElementById("disconnect-overlay").classList.add("hidden");
        });

    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation du jeu :", error);
        alert("Une erreur est survenue, retour à l'accueil.");
        window.location.href = "/";
    }
});