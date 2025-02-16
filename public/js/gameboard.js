document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    if (!userName || !userAvatar || !roomId) {
        alert("Erreur : Données manquantes.");
        window.location.href = "/";
        return;
    }

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    const socket = io();

    // Mise à jour des informations du joueur
    document.querySelector(".player-name").textContent = userName;
    document.querySelector(".player-avatar img").src = userAvatar;

    // Connexion au jeu
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // 🔹 Mise à jour des profils et de l'adversaire quand la partie commence
    socket.on("game_start", (gameData) => {
        console.log("✅ Début de la partie :", gameData);

        const opponent = gameData.player1.name === userName ? gameData.player2 : gameData.player1;

        document.querySelector(".opponent-name").textContent = opponent.name;
        document.querySelector(".opponent-avatar img").src = opponent.avatar;

        console.log("🎭 Profil adversaire mis à jour :", opponent.name, opponent.avatar);

        // 📌 Mise en place des cartes
        displayHand(gameData.playerHand, document.getElementById("player-hand"));
        displayOpponentHand(gameData.opponentHand, document.getElementById("opponent-hand"));
    });

    // 🔄 Mise à jour du tour de jeu
    socket.on("update_turn", (currentTurn) => {
        document.getElementById("turn-indicator").textContent =
            currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    // 🎴 Gestion des cartes jouées
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

    // ❌ Déconnexion de l'adversaire
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie.");
        document.getElementById("disconnect-overlay").classList.remove("hidden");
    });

    // ✅ Reconnexion de l'adversaire
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        document.querySelector(".opponent-name").textContent = data.name;
        document.querySelector(".opponent-avatar img").src = data.avatar;
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // 🏆 Fin de partie
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