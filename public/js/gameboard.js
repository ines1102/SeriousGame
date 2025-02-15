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
        alert("Erreur : données utilisateur incomplètes. Retour à l'accueil.");
        window.location.href = "/"; // Redirection vers l'accueil si données manquantes
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // Mise à jour des informations du joueur
    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;

    // Demande de rejoindre la partie
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    /** ✅ Démarrage du jeu */
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.opponent) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${gameData.opponent.name}`);

        // Mise à jour des informations de l'adversaire
        opponentNameElement.textContent = gameData.opponent.name;
        opponentAvatarElement.src = gameData.opponent.avatar;

        // Affichage des mains de départ
        displayHand(gameData.decks.joueur1.main, playerHand);
        displayOpponentHand(gameData.decks.joueur2.main, opponentHand);
    });

    /** ✅ Mise à jour du tour de jeu */
    socket.on("update_turn", (currentTurn) => {
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    /** ✅ Fonction pour afficher la main du joueur */
    function displayHand(deck, handContainer) {
        handContainer.innerHTML = "";
        deck.forEach(card => {
            const cardElement = document.createElement("img");
            cardElement.src = card.name;
            cardElement.classList.add("card");
            handContainer.appendChild(cardElement);
        });
    }

    /** ✅ Fonction pour afficher la main de l'adversaire */
    function displayOpponentHand(deck, handContainer) {
        handContainer.innerHTML = "";
        for (let i = 0; i < deck.length; i++) {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card-back");
            handContainer.appendChild(cardElement);
        }
    }

    /** ✅ Gestion des déconnexions */
    socket.on("player_disconnected", () => {
        console.warn("❌ L'adversaire s'est déconnecté. Retour à l'accueil.");
        alert("Votre adversaire a quitté la partie. Retour à l'accueil.");
        window.location.href = "/";
    });

    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur. Retour à l'accueil.");
        alert("Vous avez été déconnecté du serveur. Retour à l'accueil.");
        window.location.href = "/";
    });
});