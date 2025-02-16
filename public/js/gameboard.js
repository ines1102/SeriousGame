document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Initialisation du jeu...");

    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données utilisateur incomplètes, retour à l'accueil.");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    const socket = io();

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    document.querySelector(".player-name").textContent = userName;
    document.querySelector(".player-avatar img").src = userAvatar;

    socket.on("game_start", ({ players, deck, turn }) => {
        let opponent = players.find(p => p.name !== userName);
        document.querySelector(".opponent-name").textContent = opponent.name;
        document.querySelector(".opponent-avatar img").src = opponent.avatar;
        console.log(`🎭 Profil adversaire mis à jour : ${opponent.name}`);

        displayHand(deck, document.getElementById("player-hand"));
        document.getElementById("turn-indicator").textContent = turn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    socket.on("card_played", ({ player, card, slot }) => {
        console.log(`🎴 Carte jouée par ${player}: ${card} sur ${slot}`);
        const dropArea = document.querySelector(`[data-slot="${slot}"]`);
        if (dropArea) {
            const img = document.createElement("img");
            img.src = card;
            img.classList.add("card");
            dropArea.appendChild(img);
        }
    });

    document.querySelectorAll(".drop-area").forEach((dropArea) => {
        dropArea.addEventListener("dragover", (event) => event.preventDefault());

        dropArea.addEventListener("drop", (event) => {
            event.preventDefault();
            const cardSrc = event.dataTransfer.getData("cardSrc");
            if (cardSrc) {
                const img = document.createElement("img");
                img.src = cardSrc;
                img.classList.add("card");
                dropArea.appendChild(img);
                socket.emit("play_card", { roomId, player: userName, card: cardSrc, slot: dropArea.dataset.slot });
            }
        });
    });

    function displayHand(deck, handContainer) {
        handContainer.innerHTML = "";
        deck.forEach((card) => {
            const img = document.createElement("img");
            img.src = card;
            img.classList.add("card");
            img.draggable = true;

            img.addEventListener("dragstart", (event) => {
                event.dataTransfer.setData("cardSrc", card);
            });

            handContainer.appendChild(img);
        });
    }
});