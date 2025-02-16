document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Chargement du plateau de jeu...");

    const socket = io();

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur manquantes !");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion : ${userName} (Avatar: ${userAvatar}) - Room ${roomId}`);

    document.querySelector(".player-name").textContent = userName;
    document.querySelector(".player-avatar img").src = userAvatar;

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("game_start", ({ player1, player2, decks }) => {
        const opponent = player1.name === userName ? player2 : player1;

        document.querySelector(".opponent-name").textContent = opponent.name;
        document.querySelector(".opponent-avatar img").src = opponent.avatar;

        displayHand(decks[userName], document.getElementById("player-hand"));
        displayHand(decks[opponent.name], document.getElementById("opponent-hand"), true);
    });

    function displayHand(deck, container, hidden = false) {
        container.innerHTML = "";
        deck.forEach(card => {
            const cardElement = document.createElement("img");
            cardElement.src = hidden ? "/cards/card-back.png" : card.image;
            cardElement.classList.add("card");
            cardElement.draggable = !hidden;
            cardElement.addEventListener("dragstart", dragStart);
            container.appendChild(cardElement);
        });
    }

    // Gestion du Drag and Drop
    function dragStart(event) {
        event.dataTransfer.setData("text/plain", event.target.src);
    }

    document.querySelectorAll(".drop-area").forEach(area => {
        area.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        area.addEventListener("drop", (event) => {
            event.preventDefault();
            const cardSrc = event.dataTransfer.getData("text/plain");
            const droppedCard = document.createElement("img");
            droppedCard.src = cardSrc;
            droppedCard.classList.add("card");
            event.target.appendChild(droppedCard);
        });
    });
});