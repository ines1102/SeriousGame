document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    // Vérification des données utilisateur
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

    // Connexion au serveur via socketManager
    const socket = io(); // Connexion directe (évite l'importation en module)

    // ✅ Émettre un événement pour rejoindre la room
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // **🔹 Mise à jour de l'interface joueur**
    document.querySelector(".player-name").textContent = userName;
    document.querySelector(".player-avatar img").src = userAvatar;

    // ✅ Écoute de l'événement `game_start` pour récupérer l'adversaire
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        // 🎭 **Mise à jour du profil adversaire**
        document.querySelector(".opponent-name").textContent = gameData.opponent.name;
        document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;
        console.log("🎭 Profil adversaire mis à jour :", gameData.opponent.name, gameData.opponent.avatar);

        // 📌 Mise en place des cartes
        displayHand(gameData.playerHand, document.getElementById("player-hand"));
        displayOpponentHand(gameData.opponentHand, document.getElementById("opponent-hand"));
    });

    // ✅ Écoute du tour de jeu
    socket.on("update_turn", (currentTurn) => {
        const turnIndicator = document.getElementById("turn-indicator");
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
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

    // ✅ Gestion de la déconnexion
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie.");
        document.getElementById("disconnect-overlay").classList.remove("hidden");
    });

    // ✅ Gestion de la reconnexion
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        document.querySelector(".opponent-name").textContent = data.name;
        document.querySelector(".opponent-avatar img").src = data.avatar;
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // ✅ Gestion de la fin de partie
    socket.on("game_over", ({ winner }) => {
        alert(`🏆 Partie terminée ! Gagnant : ${winner}`);
        window.location.href = "/";
    });

    /** 📌 **Fonctions d'affichage** */

    function displayHand(deck, handContainer) {
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