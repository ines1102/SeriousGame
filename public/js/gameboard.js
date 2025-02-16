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

    // Connexion au serveur via Socket.io
    const socket = io();

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

        // 📌 Affichage des cartes du joueur et de l'adversaire
        displayHand(gameData.playerHand, document.getElementById("player-hand"));
        displayOpponentHand(gameData.opponentHand, document.getElementById("opponent-hand"));

        // 📌 Initialisation du deck
        initializeDeck(gameData.deck);
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

    /** 📌 **Fonctions d'affichage des cartes** */

    function displayHand(deck, handContainer) {
        handContainer.innerHTML = "";
        deck.forEach((card) => {
            const cardElement = document.createElement("img");
            cardElement.src = `/Cartes/${card}`;
            cardElement.classList.add("card");
            cardElement.draggable = true;

            cardElement.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("cardSrc", `/Cartes/${card}`);
            });

            handContainer.appendChild(cardElement);
        });
    }

    function displayOpponentHand(deck, handContainer) {
        handContainer.innerHTML = "";
        deck.forEach(() => {
            const cardBack = document.createElement("img");
            cardBack.src = "/Cartes/dos.png";
            cardBack.classList.add("card-back");
            handContainer.appendChild(cardBack);
        });
    }

    function initializeDeck(deck) {
        const deckContainer = document.getElementById("deck-area");
        deckContainer.innerHTML = "";
        deck.forEach(() => {
            const cardBack = document.createElement("img");
            cardBack.src = "/Cartes/dos.png";
            cardBack.classList.add("card-back");
            deckContainer.appendChild(cardBack);
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