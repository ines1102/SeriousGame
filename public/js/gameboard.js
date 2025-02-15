import Deck from "./deck.js";

document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const playerNameElement = document.querySelector(".player-name");
    const playerAvatarElement = document.querySelector(".player-avatar img");
    const opponentNameElement = document.querySelector(".opponent-name");
    const opponentAvatarElement = document.querySelector(".opponent-avatar img");
    const playerHand = document.getElementById("player-hand");
    const opponentHand = document.getElementById("opponent-hand");
    const turnIndicator = document.getElementById("turn-indicator");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar") || "/Avatars/default.jpeg";
    const roomId = sessionStorage.getItem("roomId");

    if (!userName || !userAvatar || !roomId) {
        console.error("⚠️ Données de session incomplètes !", { userName, userAvatar, roomId });
        window.location.href = "/"; // Redirection vers l'accueil si données manquantes
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        opponentNameElement.textContent = gameData.opponent.name;
        opponentAvatarElement.src = gameData.opponent.avatar || "/Avatars/default.jpeg";

        displayHand(gameData.decks.joueur1.main, playerHand);
        displayOpponentHand(gameData.decks.joueur2.main, opponentHand);

        turnIndicator.textContent = gameData.turn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

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

    socket.on("update_turn", (currentTurn) => {
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    socket.on("disconnect", () => {
        document.getElementById("disconnect-overlay").classList.remove("hidden");
    });
});