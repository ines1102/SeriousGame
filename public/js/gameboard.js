document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    // Récupération des données stockées
    const userName = sessionStorage.getItem("userName");
    const userAvatar = sessionStorage.getItem("userAvatar");
    const roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Données de session incomplètes !");
        alert("Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    // Mise à jour de l'interface utilisateur
    document.getElementById("player-name").textContent = userName;
    document.getElementById("player-avatar").src = userAvatar;

    // Connexion au serveur WebSocket via socketManager.js
    const socket = io();

    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.players || gameData.players.length < 2) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        const opponent = gameData.players.find(p => p.name !== userName);
        if (opponent) {
            console.log(`🎮 Début du jeu contre ${opponent.name}`);
            document.getElementById("opponent-name").textContent = opponent.name;
            document.getElementById("opponent-avatar").src = opponent.avatar;
        }
    });

    /** Mise à jour du tour */
    socket.on("update_turn", (currentTurn) => {
        document.getElementById("turn-indicator").textContent =
            currentTurn === userName ? "Votre tour !" : `Tour de ${currentTurn}`;
    });

    /** Affichage des mains */
    socket.on("update_hands", ({ playerDeck, opponentDeck }) => {
        displayHand(playerDeck, document.getElementById("player-hand"));
        displayOpponentHand(opponentDeck, document.getElementById("opponent-hand"));
    });

    function displayHand(deck, handContainer) {
        handContainer.innerHTML = "";
        deck.forEach(card => {
            const cardElement = document.createElement("img");
            cardElement.src = card.image;
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

    /** Gestion des déconnexions */
    socket.on("player_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté !");
        alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
        window.location.href = "/";
    });

    socket.on("disconnect", () => {
        console.warn("❌ Déconnexion détectée !");
        alert("Vous avez été déconnecté du serveur.");
        window.location.href = "/";
    });
});