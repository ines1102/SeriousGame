document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    // Récupération des données utilisateur depuis sessionStorage
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur incomplètes, retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    // Connexion à Socket.IO
    const socket = window.io();

    // ✅ Rejoindre la room
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // ✅ Mise à jour du profil du joueur
    document.getElementById("player-name").textContent = userName;
    document.getElementById("player-avatar").src = userAvatar;

    // ✅ Écoute de l'événement `game_start` pour récupérer l'adversaire
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent || !gameData.opponent.name || !gameData.opponent.avatar) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        // 🎭 **Mise à jour du profil adversaire**
        document.getElementById("opponent-name").textContent = gameData.opponent.name;
        document.getElementById("opponent-avatar").src = gameData.opponent.avatar;
        console.log("🎭 Profil adversaire mis à jour :", gameData.opponent.name, gameData.opponent.avatar);

        // 📌 Mise en place des cartes
        displayHand(gameData.playerHand, document.getElementById("player-hand"));
        displayOpponentHand(gameData.opponentHand, document.getElementById("opponent-hand"));
    });

    // ✅ Vérification de l'adversaire lorsqu'un joueur rejoint
    socket.on("player_joined", (data) => {
        console.log("👥 Nouvel adversaire détecté :", data);

        if (data.name !== userName) {
            document.getElementById("opponent-name").textContent = data.name;
            document.getElementById("opponent-avatar").src = data.avatar;
        }
    });

    // ✅ Mise à jour du tour de jeu
    socket.on("update_turn", (currentTurn) => {
        const turnIndicator = document.getElementById("turn-indicator");
        turnIndicator.textContent = currentTurn === userName ? "🔹 Votre tour !" : "🔻 Tour de l'adversaire";
    });

    // ✅ Gestion des cartes jouées
    socket.on("card_played", ({ player, card, slot }) => {
        console.log(`🎴 Carte jouée par ${player}: ${card} sur ${slot}`);

        const dropArea = document.querySelector(`[data-slot="${slot}"]`);
        if (dropArea) {
            const cardElement = document.createElement("img");
            cardElement.src = card;
            cardElement.classList.add("card");
            dropArea.appendChild(cardElement);
        }
    });

    // ✅ Déconnexion de l'adversaire
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie.");
    });

    // ✅ Reconnexion de l'adversaire
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        document.getElementById("opponent-name").textContent = data.name;
        document.getElementById("opponent-avatar").src = data.avatar;
    });

    // ✅ Fin de la partie
    socket.on("game_over", ({ winner }) => {
        alert(`🏆 Partie terminée ! Gagnant : ${winner}`);
        window.location.href = "/";
    });

    /** 📌 **Fonctions d'affichage** */
    function displayHand(deck, handContainer) {
        if (!handContainer) return;
        handContainer.innerHTML = "";
        deck.forEach((card) => {
            const cardElement = document.createElement("img");
            cardElement.src = card;
            cardElement.classList.add("card");
            cardElement.draggable = true;

            cardElement.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("cardSrc", card);
            });

            handContainer.appendChild(cardElement);
        });
    }

    function displayOpponentHand(deck, handContainer) {
        if (!handContainer) return;
        handContainer.innerHTML = "";
        deck.forEach(() => {
            const cardBack = document.createElement("div");
            cardBack.classList.add("card-back");
            handContainer.appendChild(cardBack);
        });
    }
});