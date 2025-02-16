import Deck from "./deck.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("🔄 Initialisation du jeu...");

    const socket = io();
    const playerNameElement = document.querySelector(".player-name");
    const playerAvatarElement = document.querySelector(".player-avatar img");
    const opponentNameElement = document.querySelector(".opponent-name");
    const opponentAvatarElement = document.querySelector(".opponent-avatar img");
    const playerHand = document.getElementById("player-hand");
    const opponentHand = document.getElementById("opponent-hand");
    const turnIndicator = document.getElementById("turn-indicator");
    const disconnectOverlay = document.getElementById("disconnect-overlay");

    let userName = sessionStorage.getItem("userName");
    let userAvatar = sessionStorage.getItem("userAvatar") || "/Avatars/default.jpeg";
    let roomId = sessionStorage.getItem("roomId");

    console.log("📌 Vérification des données avant connexion :", { roomId, userName, userAvatar });

    if (!userName || !userAvatar || !roomId) {
        console.error("❌ Erreur : Données utilisateur manquantes. Retour à l'accueil.");
        alert("Erreur : Données utilisateur incomplètes. Retour à l'accueil.");
        window.location.href = "/";
        return;
    }

    console.log(`📌 Connexion en cours pour ${userName} avec avatar ${userAvatar} dans la room ${roomId}`);

    // Affichage des informations du joueur
    playerNameElement.textContent = userName;
    playerAvatarElement.src = userAvatar;

    // ✅ Éviter le bug du message de déconnexion affiché en permanence
    disconnectOverlay.classList.add("hidden");

    // 🔄 Émission de l'événement pour rejoindre la partie
    socket.emit("join_game", { roomId, name: userName, avatar: userAvatar });

    // ✅ Détection de la connexion réussie
    socket.on("connect", () => {
        console.log("✅ Connexion établie avec succès !");
        disconnectOverlay.classList.add("hidden"); // Supprime l'affichage du message de déconnexion
    });

    // ✅ Détection de la déconnexion de l'adversaire
    socket.on("opponent_disconnected", ({ name }) => {
        console.warn(`❌ ${name} s'est déconnecté !`);
        alert(`${name} s'est déconnecté. Retour à l'accueil.`);
        sessionStorage.removeItem("roomId");
        window.location.href = "/";
    });

    // ✅ Gestion du retour de l'adversaire
    socket.on("opponent_reconnected", (data) => {
        console.log(`✅ ${data.name} est revenu !`);
        opponentNameElement.textContent = data.name;
        opponentAvatarElement.src = data.avatar;
        disconnectOverlay.classList.add("hidden");
    });

    // ✅ Gestion du démarrage du jeu
    socket.on("game_start", (gameData) => {
        console.log("✅ Game start reçu :", gameData);

        if (!gameData.players || gameData.players.length !== 2) {
            console.warn("⚠️ Aucun adversaire trouvé !");
            return;
        }

        const [player1, player2] = gameData.players;
        const opponent = player1.name === userName ? player2 : player1;

        console.log(`🎮 Début du jeu pour ${userName}. Adversaire : ${opponent.name}`);

        // 🔄 Mise à jour du profil de l'adversaire
        opponentNameElement.textContent = opponent.name;
        opponentAvatarElement.src = opponent.avatar;
    });

    // ✅ Mise à jour du tour
    socket.on("update_turn", (currentTurn) => {
        turnIndicator.textContent = currentTurn === userName ? "Votre tour !" : "Tour de l'adversaire";
    });

    // ✅ Déconnexion détectée (perte de connexion au serveur)
    socket.on("disconnect", () => {
        console.warn("❌ Vous avez été déconnecté du serveur.");
        disconnectOverlay.classList.remove("hidden");
    });

    // ✅ Reconnexion détectée
    socket.on("reconnect", () => {
        console.log("🔄 Reconnexion détectée, suppression du message de déconnexion.");
        disconnectOverlay.classList.add("hidden");
        socket.emit("rejoin_game", { roomId, name: userName, avatar: userAvatar });
    });

    // ✅ Fonction d'affichage de la main du joueur
    function displayHand(deck, handContainer) {
        handContainer.innerHTML = "";
        deck.forEach(card => {
            const cardElement = document.createElement("img");
            cardElement.src = card.name;
            cardElement.classList.add("card");
            handContainer.appendChild(cardElement);
        });
    }

    // ✅ Fonction d'affichage de la main de l'adversaire
    function displayOpponentHand(deck, handContainer) {
        handContainer.innerHTML = "";
        for (let i = 0; i < deck.length; i++) {
            const cardElement = document.createElement("div");
            cardElement.classList.add("card-back");
            handContainer.appendChild(cardElement);
        }
    }
});