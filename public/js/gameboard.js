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

    // ✅ Réception des informations du jeu
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        // 🎭 **Mise à jour du profil de l'adversaire**
        const opponentNameElement = document.getElementById("opponent-name");
        const opponentAvatarElement = document.getElementById("opponent-avatar");

        if (opponentNameElement && opponentAvatarElement) {
            opponentNameElement.textContent = gameData.opponent.name;
            opponentAvatarElement.src = gameData.opponent.avatar;
            console.log("🎭 Profil adversaire mis à jour :", gameData.opponent.name, gameData.opponent.avatar);
        } else {
            console.error("❌ Élément HTML adversaire non trouvé.");
        }

        // 📌 Mise en place des cartes des joueurs
        displayHand(gameData.playerHand, document.getElementById("player-hand"));
        displayOpponentHand(gameData.opponentHand, document.getElementById("opponent-hand"));
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

    /** ✅ **Drag and Drop des cartes** */
    document.querySelectorAll(".drop-area").forEach((dropArea) => {
        dropArea.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        dropArea.addEventListener("drop", (event) => {
            event.preventDefault();
            const cardSrc = event.dataTransfer.getData("cardSrc");
            if (cardSrc) {
                const img = document.createElement("img");
                img.src = cardSrc;
                img.classList.add("card");
                dropArea.appendChild(img);

                // Envoyer l'action au serveur
                socket.emit("play_card", { roomId, player: userName, card: cardSrc, slot: dropArea.dataset.slot });
            }
        });
    });
});