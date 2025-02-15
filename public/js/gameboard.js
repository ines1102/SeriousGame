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

    if (!userName || !roomId) {
        window.location.href = "/"; // Rediriger si pas d'infos valides
    }

    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;

    const deck = new Deck();
    let playerDeck, opponentDeck;

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("game_start", (gameData) => {
        opponentNameElement.textContent = gameData.opponent.name;
        opponentAvatarElement.src = gameData.opponent.avatar || "/Avatars/default.jpeg";

        playerDeck = gameData.decks.joueur1.main;
        opponentDeck = gameData.decks.joueur2.main;

        displayHand(playerDeck, playerHand);
        displayOpponentHand(opponentDeck, opponentHand);

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