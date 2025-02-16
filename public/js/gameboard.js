document.addEventListener("DOMContentLoaded", () => {
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

    // Connexion au serveur Socket.IO
    const socket = io();

    // Rejoindre la room
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // Mise à jour du profil joueur
    document.querySelector(".player-name").textContent = userName;
    document.querySelector(".player-avatar img").src = userAvatar;

    // Mise à jour du profil adversaire à la réception des infos
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        document.querySelector(".opponent-name").textContent = gameData.opponent.name;
        document.querySelector(".opponent-avatar img").src = gameData.opponent.avatar;

        console.log("🎭 Profil adversaire mis à jour :", gameData.opponent.name, gameData.opponent.avatar);

        displayHand(gameData.playerHand, document.getElementById("player-hand"));
        displayOpponentHand(gameData.opponentHand, document.getElementById("opponent-hand"));
    });

    // Indicateur de tour
    socket.on("update_turn", (currentTurn) => {
        document.getElementById("turn-indicator").textContent = 
            currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    // Gestion des cartes jouées
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

    // Gestion de la déconnexion de l'adversaire
    socket.on("opponent_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        document.getElementById("disconnect-overlay").classList.remove("hidden");
    });

    // Gestion de la reconnexion
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        document.querySelector(".opponent-name").textContent = data.name;
        document.querySelector(".opponent-avatar img").src = data.avatar;
        document.getElementById("disconnect-overlay").classList.add("hidden");
    });

    // Gestion de la fin de partie
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
});